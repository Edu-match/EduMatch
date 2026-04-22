/**
 * ContentRenderer 内の YouTube 埋め込み用プレースホルダー。
 * 旧実装は __YOUTUBE__url__ を [^_]+ で分割していたため、動画 ID に _ があると破損した。
 * 現在は「長さ + コロン + URL + 終端 __」で一意に復元する。
 */

export const YOUTUBE_PLACEHOLDER_PREFIX = "__YOUTUBE__";

/** プレースホルダーにエンコード（URL に _ や & を含めても安全） */
export function encodeYoutubePlaceholder(url: string): string {
  const u = url.trim();
  return `${YOUTUBE_PLACEHOLDER_PREFIX}${u.length}:${u}__`;
}

/**
 * s[idx] が YOUTUBE_PLACEHOLDER_PREFIX の先頭であるとき、URL と終了インデックス（排他）を返す。
 */
export function decodeYoutubePlaceholderAt(
  s: string,
  idx: number
): { url: string; end: number } | null {
  const P = YOUTUBE_PLACEHOLDER_PREFIX;
  if (s.slice(idx, idx + P.length) !== P) return null;
  let p = idx + P.length;

  // 新形式: __YOUTUBE__123:https://...__
  if (p < s.length && s[p] >= "0" && s[p] <= "9") {
    let lenStr = "";
    while (p < s.length && s[p] >= "0" && s[p] <= "9") lenStr += s[p++];
    if (!lenStr || s[p] !== ":") return decodeLegacyYoutubePlaceholder(s, idx);
    p++;
    const len = parseInt(lenStr, 10);
    if (!Number.isFinite(len) || len < 0 || p + len > s.length) return decodeLegacyYoutubePlaceholder(s, idx);
    const url = s.slice(p, p + len);
    if (s.slice(p + len, p + len + 2) !== "__") return decodeLegacyYoutubePlaceholder(s, idx);
    return { url, end: p + len + 2 };
  }

  return decodeLegacyYoutubePlaceholder(s, idx);
}

/** 旧形式 __YOUTUBE__https://...__（URL に _ 可。終端は最初の __） */
function decodeLegacyYoutubePlaceholder(
  s: string,
  idx: number
): { url: string; end: number } | null {
  const P = YOUTUBE_PLACEHOLDER_PREFIX;
  const rest = s.slice(idx + P.length);
  const m = rest.match(/^(https?:\/\/\S+?)__/);
  if (!m) return null;
  return { url: m[1], end: idx + P.length + m[0].length };
}

/**
 * 保存済みの破損 Markdown を表示前に軽く直す。
 * 例: ](__YOUTUBE__https://youtu.be/CA_x?si=...)__ のような漏れ
 */
export function repairLeakedYoutubePlaceholdersInMarkdown(text: string): string {
  let s = text;
  s = s.replace(/\]\(__YOUTUBE__(\d+):([\s\S]+?)__\)/g, (full, lenStr, payload) => {
    const len = parseInt(lenStr, 10);
    if (!Number.isFinite(len) || payload.length < len + 2) return full;
    const url = payload.slice(0, len);
    if (payload.slice(len, len + 2) !== "__") return full;
    return `](${url})`;
  });
  s = s.replace(/\]\(__YOUTUBE__(https?:\/\/\S+?)__\)/g, "]($1)");
  return s;
}
