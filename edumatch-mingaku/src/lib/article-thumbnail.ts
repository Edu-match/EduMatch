import OpenAI from "openai";

const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1";

/** Supabase Storage の既存バケット（persona アバターと同じ） */
const BUCKET_NAME = "media";

/**
 * YouTube サムネイル風の背景イラスト用スタイル別プロンプト。
 * テキストは後段で Canvas 合成するため、AI 画像には文字を入れない。
 */
const STYLE_PROMPTS: Record<string, string> = {
  tech: "Dark blue-green tech room background with floating holographic UI windows, code editors, and glowing circuit patterns. Anime-style character (young professional in business casual) sitting at a laptop, pointing at the viewer. Style: clean anime illustration, vibrant colors, dramatic lighting.",
  illustration:
    "Warm, inviting classroom or library background with bookshelves, plants, and warm lighting. Anime-style friendly teacher character smiling. Style: soft watercolor anime illustration, pastel colors.",
  professional:
    "Clean corporate office or conference room background, modern design. Professional anime character in business attire. Style: clean flat anime, blue and white color scheme.",
  creative:
    "Colorful creative workspace with art supplies, design tools, and inspiration boards. Energetic anime character with creative tools. Style: vivid pop art anime, colorful splashes.",
  gradient:
    "Abstract beautiful gradient background with soft geometric shapes and light particles. No characters. Style: modern minimalist, soft focus.",
};

/**
 * 記事タイトル（＋概要）から OpenAI 画像APIで YouTube サムネイル風の
 * 背景イラスト（文字なし）を生成し、Supabase Storage にアップロードして公開URLを返す。
 * 失敗時は null（呼び出し側でフォールバック）。
 */
export async function generateArticleThumbnail(
  title: string,
  description?: string,
  style: string = "tech",
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const openai = new OpenAI({ apiKey });
  const stylePrompt = STYLE_PROMPTS[style] ?? STYLE_PROMPTS.tech;
  const prompt =
    `Create a YouTube-thumbnail style background illustration for a Japanese education article titled "${title}". ` +
    `${description ? `The article is about: ${description}. ` : ""}` +
    `${stylePrompt} ` +
    `Composition: leave breathing room on the left/center for a text overlay to be added later. ` +
    `High contrast, eye-catching, 16:9 aspect ratio. ` +
    `NO text, NO letters, NO words, NO watermark, NO logo in the image.`;

  try {
    const res = await openai.images.generate({
      model: OPENAI_IMAGE_MODEL,
      prompt,
      size: "1536x1024",
      n: 1,
    });
    const item = res.data?.[0];
    if (item?.b64_json) {
      const uploaded = await uploadThumbnailToStorage(
        Buffer.from(item.b64_json, "base64"),
      );
      // アップロード失敗時は一時URLがあればそれを返す
      if (uploaded) return uploaded;
    }
    if (item?.url) {
      // URL形式のレスポンス（dall-e-3等）は取得してStorageへ永続化を試みる
      try {
        const r = await fetch(item.url);
        if (r.ok) {
          const uploaded = await uploadThumbnailToStorage(
            Buffer.from(await r.arrayBuffer()),
          );
          if (uploaded) return uploaded;
        }
      } catch {
        // フォールバックで一時URLを返す
      }
      return item.url;
    }
    return null;
  } catch (e) {
    console.error("[article-thumbnail] generateArticleThumbnail", e);
    return null;
  }
}

async function uploadThumbnailToStorage(buffer: Buffer): Promise<string | null> {
  try {
    const { createServiceRoleClient } = await import(
      "@/utils/supabase/server-admin"
    );
    const supabase = createServiceRoleClient();
    const path = `article-thumbnails/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.png`;
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, buffer, {
        cacheControl: "3600",
        contentType: "image/png",
        upsert: true,
      });
    if (error) {
      console.error("[article-thumbnail] upload error", error);
      return null;
    }
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path);
    return urlData?.publicUrl ?? null;
  } catch (e) {
    console.error("[article-thumbnail] upload error", e);
    return null;
  }
}
