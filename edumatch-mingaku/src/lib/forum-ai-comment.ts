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
