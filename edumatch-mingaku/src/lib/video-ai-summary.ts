import OpenAI from "openai";

const MODEL = "gpt-5.4";

const SYSTEM_PROMPT_CAPTIONS = `あなたは日本の教育関係者向けプラットフォームの動画要約アシスタントです。
入力として、YouTube動画のタイトルと字幕テキストが与えられます。
字幕（音声書き起こし）を一次ソースとして、視聴者が要点を素早く把握できる要約を書いてください。

出力ルール:
- 日本語で出力する
- 「要点」を3〜5つの箇条書きで示し、最後に短いまとめを1〜2文添える
- マークダウン記法（- や **）を使ってよい
- 全体で300文字以内に収める
- 字幕に基づき、具体的な内容を反映する（抽象的な決まり文句は避ける）`;

const SYSTEM_PROMPT_METADATA = `あなたは日本の教育関係者向けプラットフォームの動画要約アシスタントです。
この動画には字幕が見つからなかったため、タイトル・概要欄・チャンネル名を手がかりに、視聴者向けの推定要約を作成してください。

出力ルール:
- 日本語で出力する
- 冒頭に「（字幕が取得できなかったため、タイトル・概要欄からの推定です）」と1行添える
- 「想定される要点」を3〜5つの箇条書きで示し、最後に短いまとめを1〜2文添える
- マークダウン記法（- や **）を使ってよい
- 全体で350文字以内に収める
- 不明な点を断定的に書かない。概要欄に書かれた情報を優先する`;

export type SummarySource = "captions" | "metadata";

export type GenerateVideoAiSummaryArgs = {
  title: string;
  description?: string;
  channelTitle?: string | null;
  /** captions 時に必須。字幕本文 */
  transcript?: string;
  source: SummarySource;
};

export type GenerateVideoAiSummaryResult = {
  summary: string;
  /** UI表示用ラベル */
  analyzedFrom: string;
};

export class VideoAiSummaryError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function buildUserContent(args: GenerateVideoAiSummaryArgs): string {
  if (args.source === "captions") {
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

  // metadata
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

/** OpenAI を呼び出して要約を生成する。エラー時は VideoAiSummaryError を投げる */
export async function generateVideoAiSummary(
  args: GenerateVideoAiSummaryArgs
): Promise<GenerateVideoAiSummaryResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new VideoAiSummaryError("OpenAI APIキーが未設定です", 503);
  }

  const userContent = buildUserContent(args);
  const systemPrompt =
    args.source === "captions" ? SYSTEM_PROMPT_CAPTIONS : SYSTEM_PROMPT_METADATA;

  const openai = new OpenAI({ apiKey });
  let summary = "";
  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: args.source === "captions" ? 0.3 : 0.5,
      max_completion_tokens: args.source === "captions" ? 600 : 700,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    });
    summary = completion.choices[0]?.message?.content?.trim() ?? "";
  } catch (e) {
    console.error("[video-ai-summary] OpenAI", e);
    throw new VideoAiSummaryError(
      "AI要約の生成に失敗しました。時間をおいて再度お試しください。",
      502
    );
  }

  if (!summary) {
    throw new VideoAiSummaryError("AI要約の本文が空でした。", 502);
  }

  const analyzedFrom =
    args.source === "captions" ? "字幕" : "メタデータ（タイトル・概要）";

  return { summary, analyzedFrom };
}
