/**
 * 画像URLの正規化・検証
 * 対応ホスティング: Google Drive, GitHub, Supabase Storage（アップロード）
 */

/** Supabase Storage のホスト（アップロード画像） */
const SUPABASE_STORAGE_HOST = "lyoesgwecpcoaylsyiys.supabase.co";

/**
 * Google Drive 共有リンクをサムネイル表示用URLに変換
 * 形式: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 *   または https://drive.google.com/open?id=FILE_ID
 * → https://drive.google.com/thumbnail?id=FILE_ID&sz=w1000
 */
function googleDriveShareToThumbnail(url: string): string | null {
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) {
    return `https://drive.google.com/thumbnail?id=${fileMatch[1]}&sz=w1000`;
  }
  const openMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (openMatch) {
    return `https://drive.google.com/thumbnail?id=${openMatch[1]}&sz=w1000`;
  }
  const idParam = url.match(/drive\.google\.com\/[^?]*\?.*[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParam) {
    return `https://drive.google.com/thumbnail?id=${idParam[1]}&sz=w1000`;
  }
  // すでに thumbnail 形式の場合
  if (url.includes("drive.google.com/thumbnail")) {
    return url;
  }
  return null;
}

/**
 * GitHub blob URL を raw URL に変換
 * 形式: https://github.com/owner/repo/blob/branch/path/to/image.png
 * → https://raw.githubusercontent.com/owner/repo/branch/path/to/image.png
 */
function githubBlobToRaw(url: string): string | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)/);
  if (match) {
    const [, owner, repo, branch, path] = match;
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  }
  return null;
}

/**
 * 画像URLを表示用に正規化
 * - Google Drive 共有リンク → サムネイルURL
 * - GitHub blob → raw URL
 * - その他（Supabase, raw.githubusercontent 等）→ そのまま
 */
export function normalizeImageUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  const gd = googleDriveShareToThumbnail(trimmed);
  if (gd) return gd;

  const gh = githubBlobToRaw(trimmed);
  if (gh) return gh;

  return trimmed;
}

/**
 * URLが許可されたホスティング（Google Drive / GitHub / Supabase）かチェック
 */
export function isAllowedImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed || !trimmed.startsWith("http")) return false;

  try {
    const u = new URL(trimmed);
    const host = u.hostname.toLowerCase();

    // Supabase Storage（アップロード画像）
    if (host === SUPABASE_STORAGE_HOST && u.pathname.includes("/storage/")) {
      return true;
    }

    // Google Drive
    if (host === "drive.google.com") {
      return (
        u.pathname.includes("/file/d/") ||
        u.pathname.includes("/thumbnail") ||
        u.searchParams.has("id")
      );
    }

    // GitHub（raw または blob）
    if (host === "raw.githubusercontent.com") return true;
    if (host === "github.com" && u.pathname.includes("/blob/")) return true;

    return false;
  } catch {
    return false;
  }
}

/**
 * バリデーション用: 許可されていないURLの場合はエラーメッセージを返す
 */
export function validateImageUrl(url: string): { ok: true } | { ok: false; error: string } {
  if (!url.trim()) return { ok: true };
  if (!isAllowedImageUrl(url)) {
    return {
      ok: false,
      error: "画像URLはGoogle Drive、GitHub、またはアップロード画像のみ対応しています",
    };
  }
  return { ok: true };
}
