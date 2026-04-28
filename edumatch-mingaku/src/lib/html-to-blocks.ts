import type { ContentBlock } from "@/components/editor/block-editor";

const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * 要素からテキストを抽出（子要素のテキストも再帰的に取得、HTMLタグは除去）
 */
function getTextContent(el: Element): string {
  return el.textContent?.trim() || "";
}

/**
 * YouTube URL を抽出
 */
function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/
  );
  return match ? match[1] : null;
}

/**
 * HTML（＋CSS含む）を ContentBlock 配列に変換
 * ブラウザの DOMParser 使用（クライアントコンポーネント専用）
 */
export function htmlToBlocks(html: string): ContentBlock[] {
  if (typeof document === "undefined") return [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const blocks: ContentBlock[] = [];

  const processed = new Set<Element>();

  function processElement(el: Element): ContentBlock[] {
    if (processed.has(el)) return [];

    const tag = el.tagName.toLowerCase();
    const text = getTextContent(el);

    switch (tag) {
      case "h1":
        processed.add(el);
        return text ? [{ id: generateId(), type: "heading1", content: text }] : [];
      case "h2":
        processed.add(el);
        return text ? [{ id: generateId(), type: "heading2", content: text }] : [];
      case "h3":
      case "h4":
      case "h5":
      case "h6":
        processed.add(el);
        return text ? [{ id: generateId(), type: "heading3", content: text }] : [];
      case "p":
        processed.add(el);
        return text ? [{ id: generateId(), type: "paragraph", content: text }] : [];
      case "ul":
        processed.add(el);
        const ulItems = Array.from(el.querySelectorAll(":scope > li")).map((li) =>
          getTextContent(li)
        );
        return [
          {
            id: generateId(),
            type: "bulletList",
            content: "",
            items: ulItems.length > 0 ? ulItems : [""],
          },
        ];
      case "ol":
        processed.add(el);
        const olItems = Array.from(el.querySelectorAll(":scope > li")).map((li) =>
          getTextContent(li)
        );
        const startAttr = Number(el.getAttribute("start") || "1");
        return [
          {
            id: generateId(),
            type: "numberedList",
            content: "",
            items: olItems.length > 0 ? olItems : [""],
            start: Number.isFinite(startAttr) && startAttr > 0 ? startAttr : 1,
          },
        ];
      case "blockquote":
        processed.add(el);
        return text ? [{ id: generateId(), type: "quote", content: text }] : [];
      case "hr":
        processed.add(el);
        return [{ id: generateId(), type: "divider", content: "" }];
      case "img":
        processed.add(el);
        const src = el.getAttribute("src") || "";
        const alt = el.getAttribute("alt") || "";
        return src
          ? [
              {
                id: generateId(),
                type: "image",
                content: "",
                url: src,
                caption: alt || undefined,
              },
            ]
          : [];
      case "iframe":
        processed.add(el);
        const iframeSrc = el.getAttribute("src") || "";
        const ytId =
          extractYouTubeId(iframeSrc) ||
          (iframeSrc.includes("youtube") ? iframeSrc : null);
        if (ytId) {
          return [
            {
              id: generateId(),
              type: "video",
              content: "",
              url: `https://www.youtube.com/watch?v=${ytId}`,
            },
          ];
        }
        return [];
      case "figure":
        processed.add(el);
        const img = el.querySelector("img");
        const figcaption = el.querySelector("figcaption");
        if (img) {
          const imgSrc = img.getAttribute("src") || "";
          if (imgSrc) {
            return [
              {
                id: generateId(),
                type: "image",
                content: "",
                url: imgSrc,
                caption: figcaption ? getTextContent(figcaption) : undefined,
              },
            ];
          }
        }
        if (figcaption && !img) {
          return text ? [{ id: generateId(), type: "paragraph", content: text }] : [];
        }
        return [];
      case "div":
        processed.add(el);
        // div 内のブロック要素を再帰的に処理（直接の子のみ）
        const childBlocks: ContentBlock[] = [];
        const directChildren = el.children;
        for (let i = 0; i < directChildren.length; i++) {
          const child = directChildren[i];
          const childTag = child.tagName.toLowerCase();
          if (
            ["h1", "h2", "h3", "h4", "h5", "h6", "p", "ul", "ol", "blockquote", "hr", "figure"].includes(
              childTag
            )
          ) {
            childBlocks.push(...processElement(child));
          } else if (childTag === "div") {
            childBlocks.push(...processElement(child));
          }
        }
        // 子がなくてテキストがある場合は段落として扱う
        if (childBlocks.length === 0 && text) {
          return [{ id: generateId(), type: "paragraph", content: text }];
        }
        return childBlocks;
      default:
        return [];
    }
  }

  // ブロック要素を順に処理（既に子として処理されたものはスキップ）
  const walk = (parent: Element) => {
    const children = parent.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const tag = child.tagName.toLowerCase();
      if (
        ["h1", "h2", "h3", "h4", "h5", "h6", "p", "ul", "ol", "blockquote", "hr", "figure", "img", "iframe"].includes(
          tag
        )
      ) {
        blocks.push(...processElement(child));
      } else if (tag === "div") {
        const divBlocks = processElement(child);
        if (divBlocks.length > 0) {
          blocks.push(...divBlocks);
        } else {
          walk(child);
        }
      } else if (tag === "section" || tag === "article" || tag === "main") {
        walk(child);
      }
    }
  };

  walk(doc.body);

  // ブロック要素が見つからなかった場合は body のテキストを段落に
  if (blocks.length === 0) {
    const bodyText = getTextContent(doc.body);
    if (bodyText) {
      blocks.push({
        id: generateId(),
        type: "paragraph",
        content: bodyText,
      });
    }
  }

  return blocks;
}

/**
 * TSX/JSX を HTML 風に変換（DOMParser がパースできるように）
 * - { ... } を空白に置換
 * - className → class
 */
export function preprocessTsxForHtml(tsx: string): string {
  let s = tsx;
  // import ... を除去
  s = s.replace(/import\s+.*?from\s+['"].*?['"]\s*;?\s*/g, "");
  // export を除去
  s = s.replace(/export\s+(default\s+)?/g, "");
  // { ... } を空白に置換（ネスト対応）
  const parts: string[] = [];
  let i = 0;
  while (i < s.length) {
    if (s[i] === "{") {
      let depth = 1;
      const start = i;
      i++;
      while (i < s.length && depth > 0) {
        if (s[i] === "{") depth++;
        else if (s[i] === "}") depth--;
        i++;
      }
      parts.push(" ".repeat(i - start));
    } else {
      parts.push(s[i]);
      i++;
    }
  }
  s = parts.join("");
  // className= を class= に
  s = s.replace(/\bclassName=/g, "class=");
  // 複数行コメント除去
  s = s.replace(/\/\*[\s\S]*?\*\//g, "");
  // 単行コメント除去
  s = s.replace(/\/\/[^\n]*/g, "");
  return s;
}

/**
 * テキストがHTMLと判断できるか（< で始まる、またはタグらしきパターンを含む）
 */
export function looksLikeHtml(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.startsWith("<")) return true;
  if (/<[a-zA-Z][^>]*>/.test(trimmed)) return true;
  if (/<\/[a-zA-Z]+>/.test(trimmed)) return true;
  return false;
}
