import OpenAI from "openai";

/**
 * パーソナルAIペルソナの声で、投稿への返信文を生成する。サーバー専用。
 * persona_prompt（本人らしさ）と values_text（価値観）を人格として与え、
 * 教育コミュニティにふさわしい建設的な返信を作る。
 */

export const PERSONA_REPLY_MODEL = process.env.PERSONA_REPLY_MODEL?.trim() || "gpt-5.4-mini";

export type PersonaReplyInput = {
  personaPrompt: string;
  valuesText?: string;
  expertise?: string[];
  displayName: string;
  postBody: string;
  subCategoryName: string;
  categoryName: string;
  /** スレッドの文脈（同一トピックの直近投稿など。古い順で渡す） */
  recentPosts?: { authorName: string; body: string }[];
  /** 公的文書RAG等の参照抜粋（任意）。根拠づけに使う */
  knowledgeContext?: string;
};

export async function generatePersonaReplyText(input: PersonaReplyInput): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  if (!input.postBody?.trim()) return null;

  const system =
    `あなたは教育コミュニティ「井戸端会議」に参加する一人の人物「${input.displayName}」として発言します。\n` +
    `## あなたの人格\n${input.personaPrompt || "教育に関心のある実直な人物。"}\n` +
    (input.valuesText ? `## 大切にしている価値観\n${input.valuesText}\n` : "") +
    (input.expertise?.length ? `## 得意分野\n${input.expertise.join("、")}\n` : "") +
    (input.knowledgeContext?.trim()
      ? `## 参考にできる公的文書・資料の抜粋\n${input.knowledgeContext.trim()}\n（自然な範囲で根拠として活かしてよい。無理に引用しない）\n`
      : "") +
    `## 返信ルール\n` +
    `- あなた自身の視点・経験・価値観から、相手の投稿に共感しつつ自分の考えを述べる\n` +
    `- スレッドの流れを踏まえ、既出の意見の繰り返しは避けて会話を前に進める\n` +
    `- 100〜220文字程度の自然な口語。AIだと名乗らない。本人として話す\n` +
    `- 断定・説教・宣伝・政治的に偏った発言は避け、建設的に\n` +
    `- 説明や前置きは書かず、返信本文だけを出力する`;

  const threadContext =
    input.recentPosts && input.recentPosts.length > 0
      ? `\n## スレッドの流れ（参考・古い順）\n${input.recentPosts
          .slice(-4)
          .map((p) => `【${p.authorName}】${p.body}`)
          .join("\n")}\n`
      : "";

  const user = `## 場所：${input.categoryName} > ${input.subCategoryName}${threadContext}\n## 返信する投稿\n${input.postBody}\n\n上記の投稿に、あなた（${input.displayName}）として返信してください。`;

  const openai = new OpenAI({ apiKey });
  try {
    const completion = await openai.chat.completions.create({
      model: PERSONA_REPLY_MODEL,
      max_tokens: 320,
      temperature: 0.9,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const text = completion.choices[0]?.message?.content?.trim();
    return text && text.length > 0 ? text : null;
  } catch (e) {
    console.error("[persona-reply]", e);
    return null;
  }
}
