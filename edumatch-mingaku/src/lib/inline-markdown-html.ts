/**
 * インライン Markdown（**太字** *斜体* ~~取り消し線~~）を HTML に変換
 * contenteditable での表示用
 */
export function inlineMarkdownToHtml(md: string): string {
  if (!md) return "";
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  // **bold** を先に
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // ~~strikethrough~~
  html = html.replace(/~~(.+?)~~/g, "<del>$1</del>");
  // *italic*（**の後に処理）
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return html;
}
