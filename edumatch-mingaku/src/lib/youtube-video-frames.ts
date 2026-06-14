/**
 * YouTube 動画から映像フレームを取得するユーティリティ。
 *
 * 1次: スクラブ時のプレビュー用スプライト（storyboard）— 動画全体の場面を表す複数フレームが含まれる
 * 2次: サムネイル（hqdefault.jpg）— 常に利用可能
 *
 * Playwright などのブラウザ不要。YouTube が生成する公開スプライトを直接フェッチする。
 */

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export type VideoFrameImage = {
  /** OpenAI の image_url フィールドに渡す値（base64 data URI または HTTPS URL） */
  url: string;
  /** "storyboard" はスプライトシート（複数フレーム含む）、"thumbnail" は単一サムネイル */
  kind: "storyboard" | "thumbnail";
};

export type YoutubeVideoFrames = {
  images: VideoFrameImage[];
  /** スプライトシートの場合は 1 枚に複数フレームが含まれるため、概算の視覚カバレッジ */
  frameCount: number;
};

// ---- storyboard 解析 --------------------------------------------------

function decodeStoryboardSpec(raw: string): string {
  try {
    return JSON.parse(`"${raw}"`);
  } catch {
    return raw
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/\\\//g, "/")
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"');
  }
}

function extractStoryboardSpec(html: string): string | null {
  // ytInitialPlayerResponse 内の playerStoryboardSpec を探す
  const patterns: RegExp[] = [
    /"playerStoryboardSpec":"((?:\\.|[^"\\])*)"/,
    /"spec":"((?:\\.|[^"\\])*M\$M[^"\\]*)"/,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) return decodeStoryboardSpec(m[1]);
  }
  return null;
}

/**
 * spec 文字列（パイプ区切りの品質レベル）からスプライトの URL を構築する。
 * 各レベルの URL テンプレートは "$M" がセグメント番号（0, 1, 2...）のプレースホルダー。
 */
function buildSpriteUrls(spec: string, maxSprites = 3): string[] {
  const levels = spec.split("|").filter(Boolean);
  if (levels.length === 0) return [];

  // 中品質を選ぶ（インデックス 1、なければ 0）
  const targetLevel = levels[Math.min(1, levels.length - 1)];
  const template = targetLevel.split("#")[0]; // '#' 以降はフレーム数等のメタ情報

  const urls: string[] = [];
  for (let m = 0; urls.length < maxSprites; m++) {
    const url = template.replace(/\$M/g, String(m));
    if (!url.startsWith("https://")) break;
    urls.push(url);
    if (m >= 10) break; // 安全ガード
  }
  return urls;
}

// ---- 画像フェッチ -------------------------------------------------------

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 1000) return null; // 壊れた・空の画像を除外
    const b64 = Buffer.from(buf).toString("base64");
    return `data:image/jpeg;base64,${b64}`;
  } catch {
    return null;
  }
}

// ---- メイン関数 --------------------------------------------------------

/**
 * YouTube 動画から視覚フレームを取得する。
 * - まずスプライト（storyboard）を最大 `maxSprites` 枚取得
 * - 失敗時はサムネイル URL を返す
 * - サムネイルは URL のままで返す（YouTube の公開画像なので OpenAI が直接アクセスできる）
 */
export async function fetchYoutubeVideoFrames(
  videoId: string,
  { maxSprites = 3 }: { maxSprites?: number } = {}
): Promise<YoutubeVideoFrames | null> {
  // --- storyboard 試行 ---
  let html = "";
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "ja,en;q=0.9" },
      signal: AbortSignal.timeout(12000),
    });
    if (res.ok) html = await res.text();
  } catch (e) {
    console.warn("[youtube-video-frames] watch page fetch failed", e);
  }

  if (html) {
    const spec = extractStoryboardSpec(html);
    if (spec) {
      const spriteUrls = buildSpriteUrls(spec, maxSprites);
      const fetched = await Promise.all(spriteUrls.map(fetchImageAsBase64));
      const sprites = fetched.filter((s): s is string => s !== null);
      if (sprites.length > 0) {
        return {
          images: sprites.map((url) => ({ url, kind: "storyboard" as const })),
          // スプライト 1 枚あたり平均 25 フレーム前後（5x5 グリッド）
          frameCount: sprites.length * 20,
        };
      }
    }
  }

  // --- サムネイルフォールバック ---
  const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  // サムネイルが実際に存在するか確認
  try {
    const check = await fetch(thumbnailUrl, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    });
    if (check.ok) {
      return {
        images: [{ url: thumbnailUrl, kind: "thumbnail" }],
        frameCount: 1,
      };
    }
  } catch {
    // スルー
  }

  return null;
}
