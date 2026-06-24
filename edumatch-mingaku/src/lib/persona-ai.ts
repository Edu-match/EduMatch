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

export const PERSONA_TEXT_MODEL = process.env.PERSONA_TEXT_MODEL?.trim() || "gpt-5.2-mini";
export const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1";

export type PersonaInput = {
  name: string;
  bio?: string;
  /// 価値観・大切にしていること・マインド（自由記述）
  mindset?: string;
  interests?: string[];
  organization?: string | null;
  role?: string | null;
  /// 見た目の希望（髪型・服装・雰囲気など。アバターのリアル度向上に使用）
  appearance?: string | null;
  /// 年代（例：20代、30代後半 など）
  ageRange?: string | null;
  /// 性別・性別表現（任意。空ならニュートラルに生成）
  gender?: string | null;
  /// 本人写真（任意）。指定時はこの写真をもとに似せたリアルアバターを生成する。
  referenceImage?: Buffer | null;
};

export type SynthesizedPersona = {
  displayName: string;
  personaPrompt: string;
  expertise: string[];
  valuesText: string;
  imagePrompt: string;
};

const SYSTEM = `あなたは教育コミュニティ「エデュマッチ／井戸端会議」のためにユーザーの分身AIペルソナを設計する専門家です。
ユーザーの自己紹介・価値観・関心・性格から、本人らしく議論へ返信できる "人格" と、本人の雰囲気に合うリアルな顔写真アバターの英語プロンプトを作ります。
与えられた情報は漏れなく人格設計に反映してください（MBTI・性格・雰囲気・関心・所属・役割・年代・見た目など）。
出力は説明や前置きを書かず、次のJSONのみ:
{
  "persona_prompt": "本人として教育トピックに返信するためのシステムプロンプト（300〜500字・日本語）。必ず次を具体的に含める: ①一人称と口調（例：私／僕、です・ます or 親しみやすい口語）、②大切にする観点・議論スタンス、③得意な切り口や引き合いに出しがちな経験、④避けたい話題や言い回し。本人になりきって書く",
  "expertise": ["専門タグ", "3〜6個", "日本語短語"],
  "values_text": "価値観の要約（60〜120字・日本語）",
  "image_prompt": "English prompt for a PHOTOREALISTIC head-and-shoulders portrait photograph of this person. Describe perceived age range, gender expression, hairstyle, clothing/atmosphere, facial expression and mood matching their personality and role. Natural studio lighting, shallow depth of field, soft neutral background. Photographic, realistic skin texture. ABSOLUTELY no text, no logos, no watermark, single person, centered."
}`;

export async function synthesizePersona(input: PersonaInput): Promise<SynthesizedPersona | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const userMsg = [
    `名前: ${input.name}`,
    input.role ? `肩書き/役割: ${input.role}` : "",
    input.organization ? `所属: ${input.organization}` : "",
    input.ageRange ? `年代: ${input.ageRange}` : "",
    input.gender ? `性別・性別表現: ${input.gender}` : "",
    input.interests?.length ? `関心: ${input.interests.join("、")}` : "",
    input.bio ? `自己紹介: ${input.bio}` : "",
    input.mindset ? `価値観・マインド・性格: ${input.mindset}` : "",
    input.appearance ? `見た目の希望: ${input.appearance}` : "",
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
        "photorealistic head-and-shoulders portrait photograph of a friendly education professional, natural studio lighting, shallow depth of field, soft neutral background, realistic skin texture, single person, centered, no text, no logo, no watermark",
    };
  } catch (e) {
    console.error("[persona-ai] synthesizePersona", e);
    return null;
  }
}

const PHOTO_STYLE_SUFFIX =
  `\nStyle: photorealistic portrait photograph, realistic skin texture and natural studio lighting, ` +
  `friendly and professional, head-and-shoulders, centered, soft neutral background, ` +
  `single person only, absolutely no text or letters or watermark or logo.`;

function bufferToImageFile(buf: Buffer, name = "reference.png"): File {
  // OpenAI SDK は File / Blob を受け付ける。Node18+ のグローバル File を使用。
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  return new File([ab], name, { type: "image/png" });
}

function extractImageBuffer(item: { b64_json?: string | null; url?: string | null } | undefined): Promise<Buffer | null> {
  return (async () => {
    if (!item) return null;
    if (item.b64_json) return Buffer.from(item.b64_json, "base64");
    if (item.url) {
      const r = await fetch(item.url);
      if (!r.ok) return null;
      return Buffer.from(await r.arrayBuffer());
    }
    return null;
  })();
}

/**
 * アバター画像（PNG Buffer）を生成する。フォトリアルな顔写真風アバターを返す。
 * referenceImage を渡すと、その写真をもとに「本人に似せた」リアルアバターを生成する
 * （gpt-image-1 の images.edit を使用）。gpt-image-1 / dall-e-3 の両レスポンス形式に対応。
 */
export async function generateAvatarImage(
  imagePrompt: string,
  referenceImage?: Buffer | null
): Promise<Buffer | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const openai = new OpenAI({ apiKey });
  const prompt = `${imagePrompt}${PHOTO_STYLE_SUFFIX}`;

  try {
    // 本人写真がある場合は images.edit で似せて生成（gpt-image-1 のみ対応）。失敗時は通常生成にフォールバック。
    if (referenceImage && referenceImage.length > 0) {
      try {
        const edited = await openai.images.edit({
          model: "gpt-image-1",
          image: bufferToImageFile(referenceImage),
          prompt:
            `Create a polished, photorealistic head-and-shoulders portrait avatar of the SAME person in this photo, ` +
            `keeping their facial identity and features recognizable. ${prompt}`,
          size: "1024x1024",
        });
        const buf = await extractImageBuffer(edited.data?.[0]);
        if (buf) return buf;
      } catch (e) {
        console.error("[persona-ai] generateAvatarImage edit fallback", e);
      }
    }

    const res = await openai.images.generate({
      model: OPENAI_IMAGE_MODEL,
      prompt,
      size: "1024x1024",
      n: 1,
    });
    return await extractImageBuffer(res.data?.[0]);
  } catch (e) {
    console.error("[persona-ai] generateAvatarImage", e);
    return null;
  }
}
