import OpenAI from "openai";

/**
 * 井戸端会議 AIファシリテーター返信の生成（サーバ側・非ストリーミング）。
 *
 * ストリーミング版は `src/app/api/forum/ai-comment/route.ts`（クライアント表示用）。
 * こちらは定期ジョブ（/api/cron/forum-ai-delayed-replies）から呼ばれ、
 * 一定時間返信が付かなかった投稿にAI返信を生成するために使う。
 * プロンプトはストリーミング版と内容を揃えること。
 */

export const FORUM_AI_REPLY_MODEL = "gpt-5.4";

export const FORUM_AI_SYSTEM_PROMPT = `あなたは「AIUEO井戸端会議」というオンラインコミュニティに参加するAIファシリテーターです。
教育現場の実践者・研究者・保護者・企業が集まるフォーラムで、議論を豊かにするサポートをしています。

## あなたの役割
- 投稿者の意見・経験を**まず肯定・共感**して受け止める
- 多様な視点（教員/保護者/行政/研究者/海外事例など）を補足して議論を広げる
- 具体的な事例・データ・問いかけで会話のキャッチボールを促す
- 「次にどんな意見が出るか」を引き出す問いで締めくくる
- 長くなりすぎず、**200〜350文字程度**で自然な会話トーンを保つ
- 「AI」であることを最初に一言添えても良いが、過度に強調しない

## 禁止事項
- 正解を断言しない（「〜が正解です」は使わない）
- 特定の製品・サービスの宣伝
- 政治的に偏った発言`;

export type ForumAiReplyInput = {
  postBody: string;
  roomName: string;
  /** ルーム・カテゴリの議論テーマ（説明文やカテゴリ名など） */
  roomContext?: string;
  /** これまでの投稿一覧（文脈として渡す。古い順） */
  recentPosts?: { authorName: string; body: string }[];
};

export function buildForumAiUserMessage({
  postBody,
  roomName,
  roomContext = "",
  recentPosts = [],
}: ForumAiReplyInput): string {
  const contextLines = recentPosts
    .slice(-3)
    .map((p) => `【${p.authorName}】${p.body}`)
    .join("\n");

  return `
## 部屋：${roomName}
${roomContext ? `## 議論のテーマ：${roomContext}` : ""}
${contextLines ? `\n## 最近の投稿（参考）\n${contextLines}\n` : ""}
## 新しい投稿
${postBody}

上記の投稿に対して、ファシリテーターとして自然な返信をしてください。
`.trim();
}

/**
 * AIファシリテーター返信の本文を生成する（非ストリーミング）。
 * 失敗時・APIキー未設定時は null。
 */
export async function generateForumAiReplyText(
  input: ForumAiReplyInput
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  if (!input.postBody?.trim()) return null;

  const openai = new OpenAI({ apiKey });
  try {
    const completion = await openai.chat.completions.create({
      model: FORUM_AI_REPLY_MODEL,
      max_tokens: 400,
      temperature: 0.85,
      messages: [
        { role: "system", content: FORUM_AI_SYSTEM_PROMPT },
        { role: "user", content: buildForumAiUserMessage(input) },
      ],
    });
    const text = completion.choices[0]?.message?.content?.trim();
    return text && text.length > 0 ? text : null;
  } catch (e) {
    console.error("[generateForumAiReplyText]", e);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────
// Interop特設ページ用 AI返信
// ─────────────────────────────────────────────────────────────────

export const INTEROP_AI_FACILITATOR_NAME = "AIファシリテーター";
/** インタロップ特設のAIファシリテーター返信モデル（軽量・低コスト）。
 *  環境変数 INTEROP_AI_REPLY_MODEL で上書き可。
 *  注意: 既定値は実在するモデルIDにすること（以前 "gpt-5.4-mini" という存在しないIDで
 *  全返信が静かに失敗していた）。 */
export const INTEROP_AI_REPLY_MODEL = process.env.INTEROP_AI_REPLY_MODEL?.trim() || "gpt-4o-mini";

const INTEROP_AI_SYSTEM_PROMPT = `あなたは「インタロップ東京2026 教育AIサミット」の特設ページに配置されたAIファシリテーターです。
教育現場のAI活用・EdTech・学びのデザインについて、来場者（教育者・研究者・企業・保護者・学生）の声を受け止め、対話を豊かにするサポートをしています。

## あなたの役割
- 投稿者の意見・課題感を**まず共感・肯定**して受け止める
- ネガティブ・批判的な意見も「建設的な問題提起」として前向きにリフレーム し、議論をポジティブな方向へ
- 多様な視点（教員/保護者/企業/研究者/海外事例）を補足して議論を広げる
- 「次にどんな意見が出るか」を引き出す短い問いで締めくくる
- **150〜280文字程度**の自然な会話トーンで。敬語だが堅くなりすぎない。
- 感情的・熱量の高い投稿には共感を厚くし、議論を建設的に

## 禁止事項
- 正解を断言しない
- 特定製品・サービスの宣伝
- 政治的に偏った発言
- 批判や否定で返すこと（必ず建設的に）`;

function detectNegativeSentiment(body: string): boolean {
  return /課題|問題|困って|難し|大変|壁|不満|不安|できな|なんで|なぜ|批判|反対|ダメ|無理|失敗|怖い|心配|疑問|納得|わからない/.test(body);
}

export async function generateInteropAiReplyText(params: {
  postBody: string;
  subCategoryName: string;
  categoryName: string;
  recentPosts?: { authorName: string; body: string }[];
}): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  if (!params.postBody?.trim()) return null;

  const isNegative = detectNegativeSentiment(params.postBody);
  const contextLines = (params.recentPosts ?? [])
    .slice(-3)
    .map((p) => `【${p.authorName}】${p.body}`)
    .join("\n");

  const negativeHint = isNegative
    ? "\n※この投稿は課題・不安・疑問を含んでいます。共感しつつ、建設的な視点や可能性にそっと向き直してください。"
    : "";

  const userMessage = `
## セッション：${params.categoryName} > ${params.subCategoryName}
${contextLines ? `\n## 直近の投稿（参考）\n${contextLines}\n` : ""}
## 新しい投稿
${params.postBody}
${negativeHint}
上記の投稿に対して、AIファシリテーターとして自然な返信をしてください。
`.trim();

  const openai = new OpenAI({ apiKey });
  try {
    const completion = await openai.chat.completions.create({
      model: INTEROP_AI_REPLY_MODEL,
      max_tokens: 350,
      temperature: 0.88,
      messages: [
        { role: "system", content: INTEROP_AI_SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    });
    const text = completion.choices[0]?.message?.content?.trim();
    return text && text.length > 0 ? text : null;
  } catch (e) {
    console.error("[generateInteropAiReplyText]", e);
    return null;
  }
}
