import OpenAI from "openai";

const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1";

/** Supabase Storage の既存バケット（persona アバターと同じ） */
const BUCKET_NAME = "media";

/**
 * スタイル別のビジュアル指示。
 * GPT Image 1 がタイトル文字込みで完全なサムネイルを生成する。
 */
const STYLE_PROMPTS: Record<string, string> = {
  tech: "Dark blue-purple tech background with holographic UI panels, glowing circuit lines, and digital particles. An anime-style young professional character on the right side, pointing or presenting energetically.",
  illustration:
    "Warm classroom or library scene with bookshelves and soft lighting. A friendly anime-style teacher character on the right side, smiling and gesturing.",
  professional:
    "Clean modern office or conference room, sleek design. A professional anime character in business attire on the right side. Blue and white color scheme.",
  creative:
    "Colorful creative workspace with art supplies and inspiration boards. An energetic anime character with creative tools on the right side. Vivid pop-art colors.",
  gradient:
    "Abstract gradient background (purple to blue) with soft geometric shapes, light particles, and bokeh effects. No characters. Modern minimalist.",
};

/**
 * 記事タイトル（＋概要）から OpenAI 画像APIで YouTube サムネイル風の
 * 完全なサムネイル画像（タイトル文字入り）を生成し、
 * Supabase Storage にアップロードして公開URLを返す。
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
  const displayTitle = title.trim().slice(0, 60);
  const prompt =
    `Create a YouTube video thumbnail image. ` +
    `The thumbnail MUST display this Japanese title text prominently: 「${displayTitle}」. ` +
    `Render the title as large, bold white text with a black outline/stroke, placed in the left-center area of the image. ` +
    `The text should be clearly readable, high contrast against the background. ` +
    `${description ? `Topic context: ${description}. ` : ""}` +
    `Visual style: ${stylePrompt} ` +
    `Layout: 16:9 aspect ratio, eye-catching composition. The title text is the focal point. ` +
    `The overall feel should be like a popular Japanese YouTube education channel thumbnail.`;

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
