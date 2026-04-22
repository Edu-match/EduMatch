/**
 * [label](destination) 形式のインラインリンクを CommonMark に近いルールで解釈する。
 * - destination が <...> で囲まれている場合
 * - または https?:// から始まり、括弧のネストに応じて閉じ ) を判定
 *
 * 出典・URL リンクは query の & や Wikipedia 形式の () を含むことが多いため、
 * [^)\s]+ 一発正規表現は使わない。
 */

export type MarkdownInlineLinkMatch = {
  start: number;
  end: number;
  label: string;
  raw: string;
  url: string;
};

/** Turndown 等が付与する \_ などを表示用に戻す */
export function unescapeMarkdownDisplayText(s: string): string {
  return s.replace(/\\([\\`*_{}[\]()#+\-.!|])/g, "$1");
}

/** リンク先を Markdown の () 内に安全に書く（必要なら <...> で囲む） */
export function formatMarkdownInlineLink(label: string, href: string): string {
  const t = href.trim();
  if (!t) return label;
  const dest = linkDestinationNeedsAngles(t) ? `<${t}>` : t;
  return `[${label}](${dest})`;
}

function linkDestinationNeedsAngles(url: string): boolean {
  if (/\s/.test(url)) return true;
  if (url.includes("(") || url.includes(")")) return true;
  if (url.includes("<") || url.includes(">")) return true;
  return false;
}

/**
 * 文字列全体がちょうど1つのインラインリンクならその情報を返す（リンク解除 UI 用）
 */
export function parseEntireStringAsMarkdownLink(text: string): MarkdownInlineLinkMatch | null {
  const links = findMarkdownInlineLinks(text);
  if (links.length !== 1) return null;
  const m = links[0];
  if (m.start === 0 && m.end === text.length) return m;
  return null;
}

export function findMarkdownInlineLinks(text: string): MarkdownInlineLinkMatch[] {
  const out: MarkdownInlineLinkMatch[] = [];
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf("[", i);
    if (open === -1) break;
    // 画像 ![...](...) はインラインリンクではない
    if (open > 0 && text[open - 1] === "!") {
      i = open + 1;
      continue;
    }
    const op = text.indexOf("](", open + 1);
    if (op === -1) {
      i = open + 1;
      continue;
    }
    const label = text.slice(open + 1, op);
    const destStart = op + 2;
    const dest = parseLinkDestination(text, destStart);
    if (!dest) {
      i = open + 1;
      continue;
    }
    out.push({
      start: open,
      end: dest.closeIndex + 1,
      label,
      raw: text.slice(open, dest.closeIndex + 1),
      url: dest.url,
    });
    i = dest.closeIndex + 1;
  }
  return out;
}

function parseLinkDestination(
  s: string,
  start: number
): { url: string; closeIndex: number } | null {
  let i = start;
  while (i < s.length && /\s/.test(s[i])) i++;
  if (i >= s.length) return null;

  if (s[i] === "<") {
    const close = s.indexOf(">", i + 1);
    if (close === -1) return null;
    const url = s.slice(i + 1, close).trim();
    if (!/^https?:\/\//i.test(url)) return null;
    let j = close + 1;
    while (j < s.length && /\s/.test(s[j])) j++;
    if (j >= s.length || s[j] !== ")") return null;
    return { url, closeIndex: j };
  }

  const head = s.slice(i, i + 8);
  if (!/^https?:\/\//i.test(head)) return null;

  const urlStart = i;
  let depth = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === "(") depth++;
    else if (c === ")") {
      if (depth === 0) return { url: s.slice(urlStart, i), closeIndex: i };
      depth--;
    }
    i++;
  }
  return null;
}

/** HTML 属性値用（href） */
export function escapeHtmlAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
