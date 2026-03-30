import type { ContentBlock } from "@/components/editor/block-editor";

const generateId = () => Math.random().toString(36).substr(2, 9);

/** 箇条書き行（-, *, + のいずれか + スペース。GFM 互換） */
function isBulletListLine(trimmed: string): boolean {
  return /^[-*+] /.test(trimmed);
}

function bulletListItemText(trimmed: string): string {
  return trimmed.replace(/^[-*+] /, "").trimStart();
}

/** 段落に取り込まない「構造行」か（見出しは長い一致を先に判定） */
function isParagraphBreakLine(trimmed: string): boolean {
  if (trimmed === "") return true;
  if (trimmed.startsWith("### ")) return true;
  if (trimmed.startsWith("## ")) return true;
  if (trimmed.startsWith("# ")) return true;
  if (trimmed.startsWith("> ")) return true;
  if (isBulletListLine(trimmed)) return true;
  if (/^\d+\.\s/.test(trimmed)) return true;
  if (trimmed === "---") return true;
  if (/^!\[/.test(trimmed)) return true;
  if (/^\[動画\]/.test(trimmed)) return true;
  return false;
}

/** マークダウンブロック1つのまま保存したことを示すプレフィックス（ブロックに分解しない・表示時は除去） */
export const RAW_MARKDOWN_PREFIX = "__EDUMATCH_RAW_MARKDOWN__\n";

/**
 * Markdown を ContentBlock 配列に変換
 * blocksToContent の逆変換（createPost で保存された形式に対応）
 * ※ プレフィックス付きの場合は1つの markdown ブロックとしてそのまま返す
 */
export function contentToBlocks(content: string): ContentBlock[] {
  const trimmed = content.trim();
  if (trimmed.startsWith(RAW_MARKDOWN_PREFIX)) {
    return [
      {
        id: generateId(),
        type: "markdown",
        content: trimmed.slice(RAW_MARKDOWN_PREFIX.length),
      },
    ];
  }

  const blocks: ContentBlock[] = [];
  const lines = content.split(/\r?\n/);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 見出しは「長い # 列」を先に判定（### が # 扱いになるのを防ぐ）
    if (trimmed.startsWith("### ")) {
      blocks.push({
        id: generateId(),
        type: "heading3",
        content: trimmed.slice(4).trim(),
      });
      i++;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      blocks.push({
        id: generateId(),
        type: "heading2",
        content: trimmed.slice(3).trim(),
      });
      i++;
      continue;
    }
    if (trimmed.startsWith("# ")) {
      blocks.push({
        id: generateId(),
        type: "heading1",
        content: trimmed.slice(2).trim(),
      });
      i++;
      continue;
    }
    if (trimmed.startsWith("> ")) {
      blocks.push({
        id: generateId(),
        type: "quote",
        content: trimmed.slice(2).trim(),
      });
      i++;
      continue;
    }
    if (trimmed === "---") {
      blocks.push({
        id: generateId(),
        type: "divider",
        content: "",
      });
      i++;
      continue;
    }
    // 画像 ![alt](url)
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      blocks.push({
        id: generateId(),
        type: "image",
        content: "",
        url: imgMatch[2],
        caption: imgMatch[1] || undefined,
      });
      i++;
      continue;
    }
    // 動画 [動画](url)
    const videoMatch = trimmed.match(/^\[動画\]\(([^)]+)\)$/);
    if (videoMatch) {
      blocks.push({
        id: generateId(),
        type: "video",
        content: "",
        url: videoMatch[1],
      });
      i++;
      continue;
    }
    // 箇条書き（- / * / +）
    if (isBulletListLine(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && isBulletListLine(lines[i].trim())) {
        items.push(bulletListItemText(lines[i].trim()));
        i++;
      }
      blocks.push({
        id: generateId(),
        type: "bulletList",
        content: "",
        items: items.length > 0 ? items : [""],
      });
      continue;
    }
    // 番号付きリスト 1. 2. ...
    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      const items: string[] = [];
      while (i < lines.length) {
        const m = lines[i].trim().match(/^\d+\.\s+(.*)$/);
        if (m) {
          items.push(m[1]);
          i++;
        } else {
          break;
        }
      }
      blocks.push({
        id: generateId(),
        type: "numberedList",
        content: "",
        items: items.length > 0 ? items : [""],
      });
      continue;
    }
    // 空行
    if (trimmed === "") {
      i++;
      continue;
    }
    // 通常の段落（複数行続く場合は結合）
    const paraLines: string[] = [];
    while (i < lines.length && !isParagraphBreakLine(lines[i].trim())) {
      paraLines.push(lines[i]);
      i++;
    }
    const paraText = paraLines.join("\n").trim();
    if (paraText) {
      blocks.push({
        id: generateId(),
        type: "paragraph",
        content: paraText,
      });
    }
  }

  return blocks;
}

/**
 * ContentBlock 配列を Markdown 文字列に変換
 * ブロックが1つかつ markdown の場合はプレフィックス付きで出力し、
 * 読み込み時にブロックに分解されず「ひと続きのマークダウン」として復元される
 */
export function blocksToMarkdown(blocks: ContentBlock[]): string {
  if (blocks.length === 1 && blocks[0].type === "markdown") {
    return RAW_MARKDOWN_PREFIX + (blocks[0].content ?? "");
  }

  const parts: string[] = [];
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
        block.items?.forEach((item) => parts.push(`- ${item}`));
        break;
      case "numberedList":
        block.items?.forEach((item, i) => parts.push(`${i + 1}. ${item}`));
        break;
      case "image":
        if (block.url) parts.push(`![${block.caption || "画像"}](${block.url})`);
        break;
      case "video":
        if (block.url) parts.push(`[動画](${block.url})`);
        break;
      case "divider":
        parts.push("---");
        break;
      case "markdown":
        parts.push(block.content);
        break;
      default:
        break;
    }
    parts.push("");
  }
  return parts.join("\n").trimEnd();
}
