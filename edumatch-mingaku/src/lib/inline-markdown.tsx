import React from "react";

/**
 * インライン Markdown（**太字** *斜体* ~~取り消し線~~ [text](url)）を React ノードに変換
 * リンクは target="_blank" でクリック可能
 */
export function renderInlineMarkdown(text: string): React.ReactNode {
  if (!text) return null;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  // [text](url) を先に、**bold**、~~strikethrough~~、*italic* の順でマッチ
  const regex = /\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)|\*\*(.+?)\*\*|~~(.+?)~~|\*([^*]+)\*/g;
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
    if (m[1] !== undefined && m[2] !== undefined) {
      // [text](url) リンク
      const linkText = m[1] || m[2];
      parts.push(
        <a
          key={`l-${key++}`}
          href={m[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:text-blue-700"
        >
          {renderInlineMarkdown(linkText)}
        </a>
      );
    } else if (m[3] !== undefined) {
      // **bold**
      parts.push(
        <strong key={`b-${key++}`}>
          {renderInlineMarkdown(m[3])}
        </strong>
      );
    } else if (m[4] !== undefined) {
      // ~~strikethrough~~
      parts.push(
        <del key={`s-${key++}`}>
          {renderInlineMarkdown(m[4])}
        </del>
      );
    } else if (m[5] !== undefined) {
      // *italic*
      parts.push(
        <em key={`i-${key++}`}>
          {m[5]}
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
