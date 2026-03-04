/**
 * 運営記事の body 文字列と BlockEditor 用 blocks の相互変換（クライアント・サーバー両方で利用）
 */

export type SiteUpdateContentBlock = {
  id: string;
  type: "heading1" | "heading2" | "heading3" | "paragraph" | "image" | "video" | "quote" | "divider" | "list" | "ordered-list" | "bulletList" | "numberedList" | "markdown";
  content: string;
  align?: "left" | "center" | "right";
  url?: string;
  caption?: string;
  items?: string[];
};

const genId = () => Math.random().toString(36).slice(2, 11);

export function bodyToBlocks(body: string): SiteUpdateContentBlock[] {
  if (!body || !body.trim()) return [];
  const lines = body.split(/\r?\n/);
  const blocks: SiteUpdateContentBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      i++;
      continue;
    }
    if (trimmed.startsWith("# ")) {
      blocks.push({ id: genId(), type: "heading1", content: trimmed.slice(2).trim() });
      i++;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      blocks.push({ id: genId(), type: "heading2", content: trimmed.slice(3).trim() });
      i++;
      continue;
    }
    if (trimmed.startsWith("### ")) {
      blocks.push({ id: genId(), type: "heading3", content: trimmed.slice(4).trim() });
      i++;
      continue;
    }
    if (trimmed.startsWith("> ")) {
      blocks.push({ id: genId(), type: "quote", content: trimmed.slice(2).trim() });
      i++;
      continue;
    }
    if (trimmed === "---") {
      blocks.push({ id: genId(), type: "divider", content: "" });
      i++;
      continue;
    }
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\((https?:\/\/[^)]+)\)$/);
    if (imgMatch) {
      blocks.push({ id: genId(), type: "image", content: "", url: imgMatch[2], caption: imgMatch[1] || undefined });
      i++;
      continue;
    }
    const videoMatch = trimmed.match(/^\[動画\]\((https?:\/\/[^)]+)\)$/);
    if (videoMatch) {
      blocks.push({ id: genId(), type: "video", content: "", url: videoMatch[1] });
      i++;
      continue;
    }
    if (/^\d+\.\s+/.test(trimmed)) {
      const ordered: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        ordered.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ id: genId(), type: "ordered-list", content: "", items: ordered });
      continue;
    }
    if (trimmed.startsWith("- ")) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("- ")) {
        listItems.push(lines[i].trim().slice(2));
        i++;
      }
      blocks.push({ id: genId(), type: "list", content: "", items: listItems });
      continue;
    }
    blocks.push({ id: genId(), type: "paragraph", content: trimmed });
    i++;
  }
  return blocks;
}

export function blocksToBody(blocks: SiteUpdateContentBlock[]): string {
  const parts: string[] = [];
  for (const block of blocks) {
    const t = block.type === "bulletList" ? "list" : block.type === "numberedList" ? "ordered-list" : block.type;
    switch (t) {
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
      case "list":
        block.items?.forEach((item) => parts.push(`- ${item}`));
        break;
      case "ordered-list":
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
