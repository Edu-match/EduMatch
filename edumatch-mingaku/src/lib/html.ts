/**
 * HTMLタグを除去してプレーンテキストを返す（一覧の抜粋表示用）
 */
export function stripHtml(html: string): string {
  if (!html || typeof html !== "string") return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * HTMLを除去した上で指定文字数で切り詰める（省略記号付き）
 */
export function excerptFromHtml(html: string, maxLength: number = 150): string {
  const plain = stripHtml(html);
  if (plain.length <= maxLength) return plain;
  return plain.slice(0, maxLength).trim() + "…";
}
