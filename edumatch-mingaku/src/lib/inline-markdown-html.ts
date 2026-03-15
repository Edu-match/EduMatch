/**
 * インライン Markdown（**太字** *斜体* ~~取り消し線~~ [text](url)）を HTML に変換
 * contenteditable での表示用。リンクは target="_blank" でクリック可能
 */
export function inlineMarkdownToHtml(md: string): string {
  if (!md) return "";
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  // [text](url) リンク（&は上で既に&amp;になっている）
  html = html.replace(
    /\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g,
    (_, text, url) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline hover:text-blue-700">${text || url}</a>`
  );
  // **bold** を先に
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // ~~strikethrough~~
  html = html.replace(/~~(.+?)~~/g, "<del>$1</del>");
  // *italic*（**の後に処理）
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return html;
}
