/**
 * YouTube URL を解析して動画ID（11文字）を取り出すユーティリティ。
 *
 * 対応する URL 形式:
 * - https://www.youtube.com/watch?v=XXXXXXXXXXX
 * - https://youtu.be/XXXXXXXXXXX
 * - https://www.youtube.com/embed/XXXXXXXXXXX
 * - https://www.youtube.com/shorts/XXXXXXXXXXX
 * - https://www.youtube.com/v/XXXXXXXXXXX
 * - https://m.youtube.com/watch?v=XXXXXXXXXXX
 */
const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;

export function extractYoutubeId(input: string | null | undefined): string | null {
  if (!input) return null;
  const raw = input.trim();
  if (!raw) return null;

  // 既に動画IDだけが渡された場合はそのまま返す
  if (YOUTUBE_ID_RE.test(raw)) return raw;

  let url: URL;
  try {
    url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return YOUTUBE_ID_RE.test(id) ? id : null;
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    const v = url.searchParams.get("v");
    if (v && YOUTUBE_ID_RE.test(v)) return v;
    const parts = url.pathname.split("/").filter(Boolean);
    // /embed/ID, /v/ID, /shorts/ID
    const idx = parts.findIndex((p) => p === "embed" || p === "v" || p === "shorts");
    if (idx >= 0 && parts[idx + 1] && YOUTUBE_ID_RE.test(parts[idx + 1])) {
      return parts[idx + 1];
    }
  }
  return null;
}

/** 埋め込み用URL（youtube-nocookie を優先しプライバシー保護） */
export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}`;
}

/** サムネイル画像URL（hqdefault は常に存在する保証あり） */
export function youtubeThumbnailUrl(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}
