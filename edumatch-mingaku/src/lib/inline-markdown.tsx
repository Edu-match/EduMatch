import React from "react";

/**
 * インライン Markdown（**太字** *斜体* ~~取り消し線~~）を React ノードに変換
 */
export function renderInlineMarkdown(text: string): React.ReactNode {
  if (!text) return null;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  // **bold** を先に、~~strikethrough~~、*italic* の順でマッチ
  const regex = /\*\*(.+?)\*\*|~~(.+?)~~|\*([^*]+)\*/g;
  let m;
  let key = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIndex) {
      parts.push(
        <React.Fragment key={`t-${key++}`}>
          {text.slice(lastIndex, m.index)}
        </React.Fragment>
      );
    }
    if (m[1] !== undefined) {
      // **bold**
      parts.push(
        <strong key={`b-${key++}`}>
          {renderInlineMarkdown(m[1])}
        </strong>
      );
    } else if (m[2] !== undefined) {
      // ~~strikethrough~~
      parts.push(
        <del key={`s-${key++}`}>
          {renderInlineMarkdown(m[2])}
        </del>
      );
    } else {
      // *italic*
      parts.push(
        <em key={`i-${key++}`}>
          {m[3]}
        </em>
      );
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(
      <React.Fragment key={`t-${key++}`}>
        {text.slice(lastIndex)}
      </React.Fragment>
    );
  }
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}
