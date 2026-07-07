import DOMPurify from "isomorphic-dompurify";

/**
 * 記事本文などに含まれるHTMLを安全にサニタイズする（DOMPurifyベース）。
 * script/iframe/イベント属性/javascript: 等の危険な要素・属性を除去する。
 * サーバー（RSC/Route Handler）・クライアント両方で動作する。
 */
export function sanitizeHtml(html: string): string {
  if (typeof html !== "string") return "";

  return DOMPurify.sanitize(html, {
    // 許可タグ: 記事系コンテンツで使う標準的なものに限定
    ALLOWED_TAGS: [
      "a", "abbr", "b", "blockquote", "br", "caption", "code", "col",
      "colgroup", "dd", "del", "div", "dl", "dt", "em", "figcaption",
      "figure", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "i", "img",
      "ins", "li", "mark", "ol", "p", "pre", "q", "s", "small", "span",
      "strong", "sub", "sup", "table", "tbody", "td", "tfoot", "th",
      "thead", "tr", "u", "ul",
    ],
    ALLOWED_ATTR: [
      "href", "src", "srcset", "sizes", "alt", "title", "width", "height",
      "loading", "decoding", "class", "id", "colspan", "rowspan", "scope",
      "target", "rel", "lang", "dir", "start", "type", "datetime",
    ],
    // javascript:/vbscript: 等は既定で除去される。data: は画像（base64）用途があるため
    // DOMPurify の既定ポリシー（img src の data: を許可）に従う
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ["style", "form", "input", "button", "iframe", "object", "embed"],
    FORBID_ATTR: ["style"],
  });
}

/** 本文がWordPress由来のHTMLかどうか（タグがそのまま表示されないようHTMLとして扱うか） */
export function looksLikeHtml(content: string): boolean {
  if (!content || typeof content !== "string") return false;
  const trimmed = content.trim();
  return (
    trimmed.startsWith("<") ||
    /<\/(p|div|h[1-6]|figure|ul|li|span)>/i.test(trimmed) ||
    /<figure[\s>]|<img\s/i.test(trimmed)
  );
}
