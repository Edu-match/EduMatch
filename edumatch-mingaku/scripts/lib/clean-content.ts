/**
 * WordPress/WooCommerce 由来のHTML・エスケープをプレーンテキストに整える
 */

/** CSV内のリテラル \n を実際の改行に変換 */
export function unescapeNewlines(s: string): string {
  return s.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
}

/**
 * HTML をプレーンテキストに変換（見出し・リスト・リンクを読みやすく）
 */
export function htmlToPlainText(html: string): string {
  if (!html || !html.trim()) return '';

  let t = html;

  // リテラル \n を改行に
  t = unescapeNewlines(t);

  // ダブルクォートのエスケープ（CSV由来 "" -> "）
  t = t.replace(/""/g, '"');

  // <style>...</style> と <script>...</script> を削除
  t = t.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  t = t.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

  // HTMLコメントを削除
  t = t.replace(/<!--[\s\S]*?-->/g, '');

  // ブロック要素の終了タグで改行
  t = t.replace(/<\s*\/\s*(p|div|h[1-6]|li|tr|br)\s*\/?\s*>/gi, '\n');

  // <br>, <br/>, <br /> を改行に
  t = t.replace(/<br\s*\/?\s*>/gi, '\n');

  // <li> の直後を箇条書きに（・ を付ける）
  t = t.replace(/<\s*li\s*[^>]*>\s*/gi, '\n・ ');

  // <a href="...">テキスト</a> → テキスト (URL) または URL
  t = t.replace(/<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, url: string, text: string) => {
    const trimmed = (text || '').replace(/<[^>]+>/g, '').trim();
    if (trimmed && trimmed !== url) return `${trimmed} (${url})`;
    return url;
  });

  // 残りのタグを削除
  t = t.replace(/<[^>]+>/g, '');

  // 実体参照を復元
  t = t.replace(/&nbsp;/gi, ' ');
  t = t.replace(/&amp;/gi, '&');
  t = t.replace(/&lt;/gi, '<');
  t = t.replace(/&gt;/gi, '>');
  t = t.replace(/&quot;/gi, '"');
  t = t.replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(parseInt(code, 10)));
  t = t.replace(/&#x([0-9a-f]+);/gi, (_m, code) => String.fromCharCode(parseInt(code, 16)));

  // 連続改行を最大2つに、前後の空白を整理
  t = t.replace(/\n{3,}/g, '\n\n').replace(/^\s+|\s+$/g, '');

  return t;
}

/**
 * 短文用（簡単な説明など）：HTMLタグ除去＋改行正規化
 */
export function cleanShortText(s: string | null | undefined): string {
  if (s == null || s === '') return '';
  let t = unescapeNewlines(String(s));
  t = t.replace(/<[^>]+>/g, ' ');
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

const IMG_SRC_REGEX = /<img[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi;

/**
 * WordPressのHTMLから画像URLを抽出
 */
export function extractImageUrlsFromHtml(html: string): string[] {
  if (!html || !html.trim()) return [];
  const urls: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(IMG_SRC_REGEX.source, 'gi');
  while ((m = re.exec(html)) !== null) {
    const url = (m[1] || '').trim();
    if (url && !url.startsWith('data:')) urls.push(url);
  }
  return [...new Set(urls)];
}

/**
 * WordPressのHTMLをプレーンテキストにしつつ、画像はURLの行として残す（ContentRendererで表示される）
 */
export function wordpressHtmlToContentWithImages(html: string): string {
  if (!html || !html.trim()) return '';
  let t = unescapeNewlines(html);
  t = t.replace(/""/g, '"');
  t = t.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  t = t.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  t = t.replace(/<!--[\s\S]*?-->/g, '');

  // <img src="URL" ...> を改行+URL+改行に置換（本文中に画像URLが残り、ContentRendererで表示される）
  t = t.replace(/<img[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi, (_match, url: string) => {
    const u = (url || '').trim();
    return u && !u.startsWith('data:') ? `\n\n${u}\n\n` : '\n\n';
  });
  // <figure>...</figure> 内の画像は上で置換済み。残りの figure タグは中身を残してから削除
  t = t.replace(/<figure[^>]*>([\s\S]*?)<\/figure>/gi, (_, inner) => (inner || '').trim() ? `\n${inner}\n` : '\n');

  return htmlToPlainText(t);
}
