import OpenAI from "openai";
import type { VideoFrameImage } from "@/lib/youtube-video-frames";

const MODEL = "gpt-5.4";

// ---- システムプロンプト ------------------------------------------------

const SYSTEM_PROMPT_CAPTIONS = `あなたは日本の教育関係者向けプラットフォームの動画要約アシスタントです。
入力として、YouTube動画のタイトルと字幕テキストが与えられます。
字幕（音声書き起こし）を一次ソースとして、視聴者が要点を素早く把握できる要約を書いてください。

出力ルール:
- 日本語で出力する
- 要点を3〜5つ示し、最後に1〜2文のまとめを添える
- マークダウン（箇条書き記号・太字など）は使わない。プレーンテキストで出力する
- 全体で300文字以内に収める
- 字幕に基づき、具体的な内容を反映する（抽象的な決まり文句は避ける）
- 断定的な語調で書く`;

const SYSTEM_PROMPT_VISION = `あなたは日本の教育関係者向けプラットフォームの動画要約アシスタントです。
添付された画像はYouTube動画から抽出した映像フレームです。
スプライトシート形式の場合、1枚の画像に動画全体から抽出した複数の場面が格子状に並んでいます。
これらの映像とタイトル・概要欄を合わせて分析し、視聴者向けの要約を作成してください。

出力ルール:
- 日本語で出力する
- 要点を3〜5つ示し、最後に1〜2文のまとめを添える
- マークダウン（箇条書き記号・太字など）は使わない。プレーンテキストで出力する
- 全体で300文字以内に収める
- 映像から読み取れる情報（テロップ・図表・画面に映るもの）を積極的に反映する
- 断定的な語調で書く。「〜と思われる」「〜かもしれない」などの表現は使わない`;

const SYSTEM_PROMPT_METADATA = `あなたは日本の教育関係者向けプラットフォームの動画要約アシスタントです。
この動画の字幕と映像フレームを取得できなかったため、タイトル・概要欄・チャンネル名だけを手がかりに要約を作成してください。

出力ルール:
- 日本語で出力する
- 冒頭に「※タイトル・概要欄の情報をもとに生成した要約です」と1行添える
- 要点を3〜5つ示し、最後に1〜2文のまとめを添える
- マークダウン（箇条書き記号・太字など）は使わない。プレーンテキストで出力する
- 全体で350文字以内に収める
- 概要欄に書かれた情報を優先し、書かれていないことは書かない`;

// ---- 型定義 ------------------------------------------------------------

export type SummarySource = "captions" | "vision" | "metadata";

export type GenerateVideoAiSummaryArgs = {
  title: string;
  description?: string;
  channelTitle?: string | null;
  /** captions 時に必須 */
  transcript?: string;
  /** vision 時に必須 */
  frames?: VideoFrameImage[];
  source: SummarySource;
};

export type GenerateVideoAiSummaryResult = {
  summary: string;
  /** UI 表示用ラベル */
  analyzedFrom: string;
};

export class VideoAiSummaryError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// ---- メッセージ構築 ----------------------------------------------------

type TextPart = { type: "text"; text: string };
type ImagePart = {
  type: "image_url";
  image_url: { url: string; detail: "low" | "auto" };
};
type ContentPart = TextPart | ImagePart;

function buildCaptionContent(args: GenerateVideoAiSummaryArgs): string {
  if (!args.transcript?.trim()) {
    throw new VideoAiSummaryError("transcript is required for captions source", 400);
  }
  return [
    `タイトル: ${args.title}`,
    args.channelTitle?.trim() ? `チャンネル: ${args.channelTitle.trim()}` : null,
    args.description?.trim() ? `補足説明: ${args.description.trim()}` : null,
    "---字幕---",
    args.transcript,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildVisionContent(args: GenerateVideoAiSummaryArgs): ContentPart[] {
  if (!args.frames?.length) {
    throw new VideoAiSummaryError("frames are required for vision source", 400);
  }
  const parts: ContentPart[] = [
    {
      type: "text",
      text: [
        `タイトル: ${args.title}`,
        args.channelTitle?.trim() ? `チャンネル: ${args.channelTitle.trim()}` : null,
        args.description?.trim() ? `概要欄: ${args.description.trim()}` : null,
        "\n以下の映像フレームを分析して動画の内容を要約してください。",
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];
  for (const frame of args.frames) {
    parts.push({
      type: "image_url",
      image_url: {
        url: frame.url,
        // スプライトは detail:low でも十分読める。コスト削減のため低解像度で送る
        detail: frame.kind === "storyboard" ? "low" : "auto",
      },
    });
  }
  return parts;
}

function buildMetadataContent(args: GenerateVideoAiSummaryArgs): string {
  const description = args.description?.trim() ?? "";
  if (!args.title.trim() && !description) {
    throw new VideoAiSummaryError(
      "タイトル・概要欄の情報が不足しているため要約できません。",
      400
    );
  }
  return [
    `タイトル: ${args.title}`,
    args.channelTitle?.trim() ? `チャンネル: ${args.channelTitle.trim()}` : null,
    description ? `概要欄:\n${description}` : "概要欄: （空）",
  ]
    .filter(Boolean)
    .join("\n");
}

// ---- メイン関数 --------------------------------------------------------

/** OpenAI を呼び出して要約を生成する。エラー時は VideoAiSummaryError を投げる */
export async function generateVideoAiSummary(
  args: GenerateVideoAiSummaryArgs
): Promise<GenerateVideoAiSummaryResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new VideoAiSummaryError("OpenAI APIキーが未設定です", 503);
  }

  const openai = new OpenAI({ apiKey });
  let summary = "";

  try {
    if (args.source === "captions") {
      const userContent = buildCaptionContent(args);
      const completion = await openai.chat.completions.create({
        model: MODEL,
        temperature: 0.3,
        max_completion_tokens: 600,
        messages: [
          { role: "system", content: SYSTEM_PROMPT_CAPTIONS },
          { role: "user", content: userContent },
        ],
      });
      summary = completion.choices[0]?.message?.content?.trim() ?? "";
    } else if (args.source === "vision") {
      const userContent = buildVisionContent(args);
      const completion = await openai.chat.completions.create({
        model: MODEL,
        temperature: 0.3,
        max_completion_tokens: 600,
        messages: [
          { role: "system", content: SYSTEM_PROMPT_VISION },
          { role: "user", content: userContent },
        ],
      });
      summary = completion.choices[0]?.message?.content?.trim() ?? "";
    } else {
      const userContent = buildMetadataContent(args);
      const completion = await openai.chat.completions.create({
        model: MODEL,
        temperature: 0.5,
        max_completion_tokens: 700,
        messages: [
          { role: "system", content: SYSTEM_PROMPT_METADATA },
          { role: "user", content: userContent },
        ],
      });
      summary = completion.choices[0]?.message?.content?.trim() ?? "";
    }
  } catch (e) {
    if (e instanceof VideoAiSummaryError) throw e;
    console.error("[video-ai-summary] OpenAI", e);
    throw new VideoAiSummaryError(
      "AI要約の生成に失敗しました。時間をおいて再度お試しください。",
      502
    );
  }

  if (!summary) {
    throw new VideoAiSummaryError("AI要約の本文が空でした。", 502);
  }

  const analyzedFrom: Record<SummarySource, string> = {
    captions: "字幕",
    vision: "映像フレーム",
    metadata: "メタデータ（タイトル・概要）",
  };

  return { summary, analyzedFrom: analyzedFrom[args.source] };
}
