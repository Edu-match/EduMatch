/**
 * 記事本文などに含まれるHTMLを安全にサニタイズする
 * script/イベント属性/javascript: を除去
 */
export function sanitizeHtml(html: string): string {
  if (typeof html !== "string") return "";

  let out = html
    // コメント除去
    .replace(/<!--[\s\S]*?-->/g, "")
    // WordPressの空のブロックコメント除去
    .replace(/<!--\s*\/?wp:[\s\S]*?-->/g, "");

  // script, style, iframe, object, embed, form を中身ごと削除
  out = out.replace(
    /<(script|style|iframe|object|embed|form)[^>]*>[\s\S]*?<\/\1>/gi,
    ""
  );
  // 自己閉じや単体タグも削除
  out = out.replace(/<(script|style|iframe|object|embed|input|button)[^>]*\/?>/gi, "");

  // on* イベント属性を削除
  out = out.replace(/\s+on\w+=["'][^"']*["']/gi, "");
  out = out.replace(/\s+on\w+=\s*[^\s>]+/gi, "");

  // javascript: を無効化
  out = out.replace(/javascript:/gi, "");

  // data: URLをimgのsrc以外では危険なので、imgのsrcは許可するが data: は残す（多くの場合 base64 画像）
  // その他の危険なプロトコル
  out = out.replace(/(<(?:a|img)[^>]+)(href|src)=["']([^"']+)["']/gi, (_, before, attr, url) => {
    const u = url.trim().toLowerCase();
    if (u.startsWith("javascript:") || u.startsWith("vbscript:")) return before;
    return before + attr + '="' + url + '"';
  });

  return out;
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
