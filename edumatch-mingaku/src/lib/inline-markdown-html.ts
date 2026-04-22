/**
 * インライン Markdown（**太字** *斜体* ~~取り消し線~~ [text](url)）を HTML に変換
 * contenteditable での表示用。リンクは target="_blank"
 *
 * リンクは先に構造化してからエスケープする（URL 内の & 等を壊さない）。
 */
import {
  escapeHtmlAttr,
  findMarkdownInlineLinks,
} from "@/lib/markdown-inline-links";

function escapeHtmlText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** リンク以外の断片に太字・斜体・取消線・改行を適用（テキストは未エスケープ想定） */
function formatInlineNoStructuralLinks(md: string): string {
  let html = escapeHtmlText(md);
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/~~(.+?)~~/g, "<del>$1</del>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/\r\n|\r|\n/g, "<br>");
  return html;
}

export function inlineMarkdownToHtml(md: string): string {
  if (!md) return "";
  const links = findMarkdownInlineLinks(md);
  if (links.length === 0) {
    return formatInlineNoStructuralLinks(md);
  }
  let out = "";
  let pos = 0;
  for (const link of links) {
    out += formatInlineNoStructuralLinks(md.slice(pos, link.start));
    const labelHtml = inlineMarkdownToHtml(link.label);
    const href = escapeHtmlAttr(link.url);
    out += `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline hover:text-blue-700">${labelHtml}</a>`;
    pos = link.end;
  }
  out += formatInlineNoStructuralLinks(md.slice(pos));
  return out;
}
