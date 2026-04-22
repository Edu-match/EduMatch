/**
 * ブロックエディタが保存する「動画として埋め込む」行の Markdown 形式。
 * これ以外の YouTube URL は通常のリンクのまま（自動で iframe にはしない）。
 */
export const VIDEO_EMBED_MARKDOWN_LINE = /^\s*\[動画\]\((https?:\/\/[^)]+)\)\s*$/;

export function matchVideoEmbedMarkdownLine(line: string): RegExpExecArray | null {
  const m = VIDEO_EMBED_MARKDOWN_LINE.exec(line.trim());
  return m ?? null;
}
