import OpenAI from "openai";

/**
 * パーソナルAIペルソナの生成（要約プロンプト＋アバター画像）。サーバー専用。
 *
 * 登録時に入力したマインド/価値観・関心・自己紹介から、
 *  - persona_prompt: 本人らしく投稿に返信するためのシステムプロンプト
 *  - expertise:      専門・得意タグ
 *  - values_text:    価値観の短い要約
 *  - imagePrompt:    アバター画像生成用の英語プロンプト
 * を合成し、続けてアバター画像（PNG）を生成する。
 */

export const PERSONA_TEXT_MODEL = process.env.PERSONA_TEXT_MODEL?.trim() || "gpt-4o-mini";
export const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1";

export type PersonaInput = {
  name: string;
  bio?: string;
  /// 価値観・大切にしていること・マインド（自由記述）
  mindset?: string;
  interests?: string[];
  organization?: string | null;
  role?: string | null;
};

export type SynthesizedPersona = {
  displayName: string;
  personaPrompt: string;
  expertise: string[];
  valuesText: string;
  imagePrompt: string;
};

const SYSTEM = `あなたは教育コミュニティ「エデュマッチ／井戸端会議」のためにユーザーの分身AIペルソナを設計する専門家です。
ユーザーの自己紹介・価値観・関心から、本人らしく議論へ返信できるペルソナ設定と、本人の雰囲気に合うアバター画像の英語プロンプトを作ります。
出力は説明や前置きを書かず、次のJSONのみ:
{
  "persona_prompt": "本人として教育トピックに返信するためのシステムプロンプト（200〜400字・日本語・一人称の語り口や重視する観点・口調を含む）",
  "expertise": ["専門タグ", "3〜6個", "日本語短語"],
  "values_text": "価値観の要約（60〜120字・日本語）",
  "image_prompt": "a friendly flat-style vector avatar portrait, ... (English, describes mood/colors/vibe matching the person; NO text, NO logos, centered head-and-shoulders, soft background)"
}`;

export async function synthesizePersona(input: PersonaInput): Promise<SynthesizedPersona | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const userMsg = [
    `名前: ${input.name}`,
    input.role ? `肩書き/役割: ${input.role}` : "",
    input.organization ? `所属: ${input.organization}` : "",
    input.interests?.length ? `関心: ${input.interests.join("、")}` : "",
    input.bio ? `自己紹介: ${input.bio}` : "",
    input.mindset ? `価値観・マインド: ${input.mindset}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const openai = new OpenAI({ apiKey });
  try {
    const completion = await openai.chat.completions.create({
      model: PERSONA_TEXT_MODEL,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userMsg || `名前: ${input.name}` },
      ],
    });
    const raw = completion.choices[0]?.message?.content;
    if (!raw) return null;
    const j = JSON.parse(raw) as {
      persona_prompt?: string;
      expertise?: string[];
      values_text?: string;
      image_prompt?: string;
    };
    return {
      displayName: input.name,
      personaPrompt: (j.persona_prompt ?? "").slice(0, 1200),
      expertise: Array.isArray(j.expertise) ? j.expertise.slice(0, 8).map((s) => String(s).slice(0, 24)) : [],
      valuesText: (j.values_text ?? "").slice(0, 300),
      imagePrompt:
        (j.image_prompt ?? "").slice(0, 800) ||
        "a friendly flat-style vector avatar portrait, soft pastel background, head and shoulders, no text",
    };
  } catch (e) {
    console.error("[persona-ai] synthesizePersona", e);
    return null;
  }
}

/**
 * アバター画像（PNG Buffer）を生成する。gpt-image-1 / dall-e-3 の両レスポンス形式に対応。
 */
export async function generateAvatarImage(imagePrompt: string): Promise<Buffer | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const openai = new OpenAI({ apiKey });
  const prompt =
    `${imagePrompt}\nStyle: clean modern flat illustration, friendly, professional, centered avatar, ` +
    `soft solid background, absolutely no text or letters or watermark.`;

  try {
    const res = await openai.images.generate({
      model: OPENAI_IMAGE_MODEL,
      prompt,
      size: "1024x1024",
      n: 1,
    });
    const item = res.data?.[0];
    if (!item) return null;
    if (item.b64_json) {
      return Buffer.from(item.b64_json, "base64");
    }
    if (item.url) {
      const r = await fetch(item.url);
      if (!r.ok) return null;
      return Buffer.from(await r.arrayBuffer());
    }
    return null;
  } catch (e) {
    console.error("[persona-ai] generateAvatarImage", e);
    return null;
  }
}
