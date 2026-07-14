import OpenAI from "openai";

const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1";

/** Supabase Storage の既存バケット（persona アバターと同じ） */
const BUCKET_NAME = "media";

/**
 * 記事タイトル（＋概要）から OpenAI 画像APIでサムネイルを生成し、
 * Supabase Storage にアップロードして公開URLを返す。
 * 失敗時は null（呼び出し側でフォールバック）。
 */
export async function generateArticleThumbnail(
  title: string,
  description?: string,
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const openai = new OpenAI({ apiKey });
  const prompt =
    `Create a clean, modern editorial illustration for a Japanese education news article titled "${title}". ` +
    `${description ? `The article is about: ${description}. ` : ""}` +
    `Style: flat design illustration with soft gradients, education-themed visual metaphors ` +
    `(books, lightbulbs, students, technology, classrooms), warm and inviting color palette ` +
    `with purple/lavender accents. Aspect ratio 16:9. ` +
    `NO text, NO letters, NO words, NO watermark, NO logo. Clean and minimal.`;

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
