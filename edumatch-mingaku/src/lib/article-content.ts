import type { ContentBlock } from "@/components/editor/block-editor";

/**
 * 記事用: ブロックをコンテンツ文字列に変換（leadText を含む）
 * posts.ts の blocksToContent と同一ロジック（クライアントで利用）
 */
export function blocksToArticleContent(
  blocks: ContentBlock[],
  leadText: string
): string {
  const parts: string[] = [];

  if (leadText) {
    parts.push(leadText);
    parts.push("");
  }

  for (const block of blocks) {
    switch (block.type) {
      case "heading1":
        parts.push(`# ${block.content}`);
        break;
      case "heading2":
        parts.push(`## ${block.content}`);
        break;
      case "heading3":
        parts.push(`### ${block.content}`);
        break;
      case "paragraph":
        parts.push(block.content);
        break;
      case "quote":
        parts.push(`> ${block.content}`);
        break;
      case "bulletList":
        if (block.items) {
          block.items.forEach((item) => parts.push(`- ${item}`));
        }
        break;
      case "numberedList":
        if (block.items) {
          block.items.forEach((item, i) => parts.push(`${i + 1}. ${item}`));
        }
        break;
      case "image":
        if (block.url) {
          parts.push(`![${block.caption || "画像"}](${block.url})`);
        }
        break;
      case "video":
        if (block.url) {
          parts.push(`[動画](${block.url})`);
        }
        break;
      case "divider":
        parts.push("---");
        break;
      case "markdown":
        parts.push(block.content);
        break;
    }
    parts.push("");
  }

  return parts.join("\n");
}

/**
 * コンテンツ先頭から、リード文と同一のテキストを（空白区切りで）連続している限り除去する。
 * AI が lead と同じ段落を本文 Markdown に繰り返した場合や、旧下書きの二重保存に対応。
 * 本文がリードと同一文字列で始まる1語だけのケースは、直後に空白がないと除去しない（誤除去防止）。
 */
export function stripLeadText(content: string, leadText: string): string {
  const lt = (leadText || "").replace(/\r\n/g, "\n").trim();
  if (!lt) return content;

  let cur = content.replace(/\r\n/g, "\n").trimStart();
  while (cur.startsWith(lt)) {
    const after = cur.slice(lt.length);
    if (after.length === 0) return "";
    if (!/^\s/.test(after)) break;
    cur = after.replace(/^\s+/, "");
  }
  return cur;
}
