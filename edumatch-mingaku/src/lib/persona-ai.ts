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

export const PERSONA_TEXT_MODEL = process.env.PERSONA_TEXT_MODEL?.trim() || "gpt-5.4-mini";
export const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1";

/** コードフェンスや前後テキストが混じっても JSON を取り出してパースする。 */
export function parseLooseJson(s: string | null | undefined): unknown {
  if (!s) return null;
  const t = s.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  try { return JSON.parse(t); } catch { /* fallthrough */ }
  const m = t.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { /* noop */ } }
  return null;
}

export type PersonaInput = {
  name: string;
  bio?: string;
  /// 価値観・大切にしていること・マインド（自由記述）
  mindset?: string;
  /// 普段の活動・取り組み（プロジェクト・実践・関わっている活動など。返信のリアルさに使用）
  activities?: string | null;
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

const SYSTEM = `あなたは教育コミュニティ「エデュマッチ／教育のひろば」のためにユーザーの分身AIペルソナを設計する専門家です。
ユーザーのMBTI・性格・価値観・関心・活動・自己紹介から、本人になりきって議論へ返信できる "人格" と、本人を象徴する「イラスト風アバター」の英語プロンプトを作ります。
与えられた情報は漏れなく深く反映してください（特に MBTI と価値観・活動からは、その人特有の考え方のクセ・口調・着眼点を具体的に立ち上げること）。一般的・無難な人物像にせず、その人ならではの個性が出るようにします。
出力は説明や前置きを書かず、次のJSONのみ:
{
  "persona_prompt": "AIペルソナとして振る舞うためのシステムプロンプト（400〜650字・日本語・Markdown形式）。以下の構造で必ず書くこと:\n\nあなたは〇〇（名前・肩書き）として、教育コミュニティ「教育のひろば」で発言するAIペルソナです。\n\n## 目的\n（このペルソナが議論で果たす役割・貢献）\n\n## 口調・一人称\n（一人称は「私」or「僕」、口調の特徴。MBTI・性格に整合させる）\n\n## 経験・バックグラウンド\n- （活動や経験を箇条書きで。activities を反映。具体的に）\n\n## 価値観・議論スタンス\n- （大切にする観点を箇条書きで。価値観から導く）\n\n## 話し方の特徴\n- （よく使う言い回し・口ぐせの方向性を箇条書きで）\n- （避けたい話題や言い回しも含める）\n\n抽象論ではなく、その人ならではの個性が出るように書くこと。",
  "expertise": ["専門タグ", "3〜6個", "日本語短語"],
  "values_text": "価値観の要約（60〜120字・日本語）",
  "image_prompt": "English prompt for a FRIENDLY ILLUSTRATED CHARACTER AVATAR (NOT a photo, NOT an ID/passport photo). A stylized digital illustration of a person whose look matches their age, personality, role and activities. CRITICAL: visibly weave in the person's hobbies / interests / activities (e.g. baseball, rugby, music, coffee, teaching, robotics) as concrete visual elements — held objects, clothing/accessories, or themed background motifs and icons around the character. Cheerful flat/semi-flat illustration with clean lines and soft colors. Single character, centered, upper body. NO text, NO letters, NO logos, NO watermark."
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
    input.activities ? `普段の活動・取り組み: ${input.activities}` : "",
    input.appearance ? `見た目の希望: ${input.appearance}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const openai = new OpenAI({ apiKey });
  try {
    // チャットと同じ Responses API を使用（gpt-5系の互換性確保）。
    const res = await openai.responses.create({
      model: PERSONA_TEXT_MODEL,
      instructions: SYSTEM,
      input: userMsg || `名前: ${input.name}`,
      temperature: 0.7,
      max_output_tokens: 2000,
    });
    const raw = res.output_text;
    const j = parseLooseJson(raw) as {
      persona_prompt?: string;
      expertise?: string[];
      values_text?: string;
      image_prompt?: string;
    } | null;
    if (!j) return null;
    return {
      displayName: input.name,
      personaPrompt: (j.persona_prompt ?? "").slice(0, 1200),
      expertise: Array.isArray(j.expertise) ? j.expertise.slice(0, 8).map((s) => String(s).slice(0, 24)) : [],
      valuesText: (j.values_text ?? "").slice(0, 300),
      imagePrompt:
        (j.image_prompt ?? "").slice(0, 800) ||
        "friendly illustrated character avatar of a cheerful education enthusiast, cheerful flat illustration with clean lines and soft colors, hobby and interest motifs around the character, single character, centered, upper body, no text, no logo, no watermark",
    };
  } catch (e) {
    console.error("[persona-ai] synthesizePersona", e);
    return null;
  }
}

const ILLUSTRATION_STYLE_SUFFIX =
  `\nStyle: friendly stylized digital illustration (flat / semi-flat), clean lines and soft cheerful colors, ` +
  `NOT a photo and NOT an ID photo. Upper body, centered, single character. ` +
  `Visibly include the person's hobbies and interests as themed objects or background motifs. ` +
  `Absolutely no text or letters or watermark or logo.`;

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
 * アバター画像（PNG Buffer）を生成する。趣味・関心を盛り込んだイラスト風アバターを返す。
 * referenceImage を渡すと、その写真の雰囲気を活かしつつ「イラスト化」したアバターを生成する
 * （gpt-image-1 の images.edit を使用）。gpt-image-1 / dall-e-3 の両レスポンス形式に対応。
 */
export async function generateAvatarImage(
  imagePrompt: string,
  referenceImage?: Buffer | null
): Promise<Buffer | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const openai = new OpenAI({ apiKey });
  const prompt = `${imagePrompt}${ILLUSTRATION_STYLE_SUFFIX}`;

  try {
    // 本人写真がある場合は images.edit で雰囲気を活かしてイラスト化（gpt-image-1 のみ対応）。失敗時は通常生成にフォールバック。
    if (referenceImage && referenceImage.length > 0) {
      try {
        const edited = await openai.images.edit({
          model: "gpt-image-1",
          image: bufferToImageFile(referenceImage),
          prompt:
            `Turn the person in this photo into a friendly STYLIZED ILLUSTRATION (not a photo), ` +
            `keeping their general look recognizable. ${prompt}`,
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
