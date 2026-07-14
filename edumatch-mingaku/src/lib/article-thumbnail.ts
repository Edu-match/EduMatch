import OpenAI from "openai";
import sharp from "sharp";

const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1";

/** Supabase Storage の既存バケット（persona アバターと同じ） */
const BUCKET_NAME = "media";

const STYLE_PROMPTS: Record<string, string> = {
  tech: "Dark blue-purple tech background with holographic UI panels, glowing circuit lines, and digital particles. An anime-style young professional character on the right side, pointing or presenting energetically. No text or letters anywhere in the image.",
  illustration:
    "Warm classroom or library scene with bookshelves and soft lighting. A friendly anime-style teacher character on the right side, smiling and gesturing. No text or letters anywhere in the image.",
  professional:
    "Clean modern office or conference room, sleek design. A professional anime character in business attire on the right side. Blue and white color scheme. No text or letters anywhere in the image.",
  creative:
    "Colorful creative workspace with art supplies and inspiration boards. An energetic anime character with creative tools on the right side. Vivid pop-art colors. No text or letters anywhere in the image.",
  gradient:
    "Abstract gradient background (purple to blue) with soft geometric shapes, light particles, and bokeh effects. No characters. Modern minimalist. No text or letters anywhere in the image.",
};

async function cropTo16by9(buffer: Buffer): Promise<Buffer> {
  const img = sharp(buffer);
  const meta = await img.metadata();
  const w = meta.width ?? 1536;
  const h = meta.height ?? 1024;
  const targetH = Math.round(w * 9 / 16);
  if (targetH >= h) return buffer;
  const top = Math.round((h - targetH) / 2);
  return img.extract({ left: 0, top, width: w, height: targetH }).toBuffer();
}

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
    `Create a visually striking thumbnail illustration for an educational article. ` +
    `The image should visually represent the topic: "${title.trim().slice(0, 80)}". ` +
    `${description ? `Context: ${description.slice(0, 120)}. ` : ""}` +
    `Visual style: ${stylePrompt} ` +
    `CRITICAL: Do NOT include any text, titles, captions, words, letters, or characters in the image. The image must be purely visual/illustrative with zero text. ` +
    `Layout: 16:9 aspect ratio, eye-catching composition suitable for an article thumbnail.`;

  try {
    const res = await openai.images.generate({
      model: OPENAI_IMAGE_MODEL,
      prompt,
      size: "1536x1024",
      n: 1,
    });
    const item = res.data?.[0];
    if (item?.b64_json) {
      const raw = Buffer.from(item.b64_json, "base64");
      const cropped = await cropTo16by9(raw);
      const uploaded = await uploadThumbnailToStorage(cropped);
      // アップロード失敗時は一時URLがあればそれを返す
      if (uploaded) return uploaded;
    }
    if (item?.url) {
      // URL形式のレスポンス（dall-e-3等）は取得してStorageへ永続化を試みる
      try {
        const r = await fetch(item.url);
        if (r.ok) {
          const raw = Buffer.from(await r.arrayBuffer());
          const cropped = await cropTo16by9(raw);
          const uploaded = await uploadThumbnailToStorage(cropped);
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
