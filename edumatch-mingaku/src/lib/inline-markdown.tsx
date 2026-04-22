import React from "react";
import {
  findMarkdownInlineLinks,
  unescapeMarkdownDisplayText,
} from "@/lib/markdown-inline-links";

/**
 * 太字・斜体・取消しのみ（構造リンクなし）
 */
function renderInlineFormattingOnly(text: string): React.ReactNode {
  if (!text) return null;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const regex = /\*\*(.+?)\*\*|~~(.+?)~~|\*([^*]+)\*/g;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIndex) {
      parts.push(
        <React.Fragment key={`p-${key++}`}>{text.slice(lastIndex, m.index)}</React.Fragment>
      );
    }
    if (m[1] !== undefined) {
      parts.push(
        <strong key={`b-${key++}`}>{renderInlineFormattingOnly(m[1])}</strong>
      );
    } else if (m[2] !== undefined) {
      parts.push(
        <del key={`s-${key++}`}>{renderInlineFormattingOnly(m[2])}</del>
      );
    } else if (m[3] !== undefined) {
      parts.push(<em key={`i-${key++}`}>{m[3]}</em>);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(
      <React.Fragment key={`p-${key++}`}>{text.slice(lastIndex)}</React.Fragment>
    );
  }
  if (parts.length === 0) return null;
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

/**
 * インライン Markdown（**太字** *斜体* ~~取り消し線~~ [text](url)）を React ノードに変換
 * リンクは target="_blank"
 */
export function renderInlineMarkdown(text: string): React.ReactNode {
  if (!text) return null;
  const t = unescapeMarkdownDisplayText(text);
  const links = findMarkdownInlineLinks(t);
  if (links.length === 0) {
    return renderInlineFormattingOnly(t);
  }
  const parts: React.ReactNode[] = [];
  let pos = 0;
  let key = 0;
  for (const link of links) {
    if (link.start > pos) {
      parts.push(
        <React.Fragment key={`t-${key++}`}>
          {renderInlineFormattingOnly(t.slice(pos, link.start))}
        </React.Fragment>
      );
    }
    parts.push(
      <a
        key={`l-${key++}`}
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline hover:text-blue-700"
      >
        {renderInlineMarkdown(link.label)}
      </a>
    );
    pos = link.end;
  }
  if (pos < t.length) {
    parts.push(
      <React.Fragment key={`t-${key++}`}>
        {renderInlineFormattingOnly(t.slice(pos))}
      </React.Fragment>
    );
  }
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}
