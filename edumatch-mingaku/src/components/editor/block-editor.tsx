"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { uploadImage } from "@/app/_actions";
import { toast } from "sonner";
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Video,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Loader2,
  Trash2,
  GripVertical,
  Plus,
  ChevronUp,
  ChevronDown,
  Quote,
  List,
  ListOrdered,
  Minus,
  ClipboardPaste,
  ChevronRight,
  Bold,
  Italic,
  Strikethrough,
  SplitSquareVertical,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { contentToBlocks } from "@/lib/markdown-to-blocks";
import { RichTextEditable, htmlToMarkdown } from "@/components/editor/rich-text-editable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type BlockType =
  | "heading1"
  | "heading2"
  | "heading3"
  | "paragraph"
  | "image"
  | "video"
  | "quote"
  | "divider"
  | "bulletList"
  | "numberedList"
  | "markdown";

export type TextAlign = "left" | "center" | "right";

export interface ContentBlock {
  id: string;
  type: BlockType;
  content: string;
  align?: TextAlign;
  url?: string;
  caption?: string;
  items?: string[];
}

interface BlockEditorProps {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
  maxLength?: number; // 全体の文字数制限（オプション）
  /** 一括貼り付け機能を表示するか（デフォルト: true） */
  showBulkPaste?: boolean;
  /** タイプ時のMarkdown自動変換を有効にするか（デフォルト: true） */
  autoConvertMarkdown?: boolean;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

const blockTypeLabels: Record<BlockType, string> = {
  heading1: "大見出し",
  heading2: "中見出し",
  heading3: "小見出し",
  paragraph: "本文",
  image: "画像",
  video: "動画",
  quote: "引用",
  divider: "区切り線",
  bulletList: "箇条書き",
  numberedList: "番号付きリスト",
  markdown: "Markdown",
};

export function BlockEditor({
  blocks,
  onChange,
  maxLength,
  showBulkPaste = true,
  autoConvertMarkdown = true,
}: BlockEditorProps) {
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<number | null>(null);
  const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);
  const [bulkPasteOpen, setBulkPasteOpen] = useState(false);
  const [bulkPasteText, setBulkPasteText] = useState("");
  const [selectionBubble, setSelectionBubble] = useState<{
    blockId: string;
    refKey: string;
    itemIndex?: number;
    rect: DOMRect;
  } | null>(null);
  const [blockTypeDropdownOpen, setBlockTypeDropdownOpen] = useState<string | null>(null);
  const [activeFormats, setActiveFormats] = useState<{
    blockId: string;
    bold: boolean;
    italic: boolean;
    strikethrough: boolean;
  } | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const textInputRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | HTMLElement | null>>({});
  
  // 全体の文字数を計算
  const calculateTotalLength = useCallback((blocksToCheck: ContentBlock[]) => {
    return blocksToCheck.reduce((acc, block) => {
      if (block.content) {
        return acc + block.content.length;
      }
      if (block.items) {
        return acc + block.items.join("").length;
      }
      return acc;
    }, 0);
  }, []);
  
  // 個別ブロックの文字数を計算
  const getBlockLength = useCallback((block: ContentBlock) => {
    if (block.content) {
      return block.content.length;
    }
    if (block.items) {
      return block.items.join("").length;
    }
    return 0;
  }, []);

  const addBlock = useCallback(
    (type: BlockType, index: number) => {
      const newBlock: ContentBlock = {
        id: generateId(),
        type,
        content: "",
        align: "left",
        items: type === "bulletList" || type === "numberedList" ? [""] : undefined,
      };
      const newBlocks = [...blocks];
      newBlocks.splice(index, 0, newBlock);
      onChange(newBlocks);
      setShowBlockMenu(false);
      setMenuPosition(null);
      setActiveBlockId(newBlock.id);
    },
    [blocks, onChange]
  );

  const updateBlock = useCallback(
    (id: string, updates: Partial<ContentBlock>) => {
      const updatedBlocks = blocks.map((b) => (b.id === id ? { ...b, ...updates } : b));
      
      // 文字数制限がある場合、全体の文字数をチェック
      if (maxLength !== undefined) {
        const currentLength = calculateTotalLength(updatedBlocks);
        // 制限を超える場合は、変更を適用しない（ただし、削除や短縮の場合は許可）
        if (currentLength > maxLength) {
          const oldLength = calculateTotalLength(blocks);
          // 文字数が増加している場合のみ制限を適用
          if (currentLength > oldLength) {
            return; // 変更を適用しない
          }
        }
      }
      
      onChange(updatedBlocks);
    },
    [blocks, onChange, maxLength, calculateTotalLength]
  );

  const deleteBlock = useCallback(
    (id: string) => {
      onChange(blocks.filter((b) => b.id !== id));
      setActiveBlockId(null);
    },
    [blocks, onChange]
  );

  const moveBlock = useCallback(
    (id: string, direction: "up" | "down") => {
      const index = blocks.findIndex((b) => b.id === id);
      if (
        (direction === "up" && index === 0) ||
        (direction === "down" && index === blocks.length - 1)
      ) {
        return;
      }
      const newBlocks = [...blocks];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      [newBlocks[index], newBlocks[targetIndex]] = [
        newBlocks[targetIndex],
        newBlocks[index],
      ];
      onChange(newBlocks);
    },
    [blocks, onChange]
  );

  /** 指定ブロックを複数ブロックに置き換え（Markdown自動変換用） */
  const replaceBlockWithBlocks = useCallback(
    (blockId: string, newBlocks: ContentBlock[]) => {
      const index = blocks.findIndex((b) => b.id === blockId);
      if (index < 0) return;
      const newList = [...blocks];
      newList.splice(index, 1, ...newBlocks);
      onChange(newList);
      if (newBlocks.length > 0) {
        setActiveBlockId(newBlocks[0].id);
      }
    },
    [blocks, onChange]
  );

  /** フォーマット適用（contenteditable の場合は execCommand、Input/Textarea の場合はマークダウン挿入） */
  const applyFormat = useCallback(
    (blockId: string, wrapper: "**" | "*" | "~~", itemIndex?: number) => {
      const activeEl = document.activeElement as HTMLElement | null;
      if (activeEl?.isContentEditable) {
        const cmd = wrapper === "**" ? "bold" : wrapper === "*" ? "italic" : "strikeThrough";
        document.execCommand(cmd, false);
        activeEl.dispatchEvent(new Event("input", { bubbles: true }));
        return;
      }
      let refKey = blockId;
      let targetItemIndex: number | undefined = itemIndex;
      const block = blocks.find((b) => b.id === blockId);
      if (block?.items && itemIndex === undefined) {
        for (let i = 0; i < block.items.length; i++) {
          const k = `${blockId}-${i}`;
          if (textInputRefs.current[k] === document.activeElement) {
            refKey = k;
            targetItemIndex = i;
            break;
          }
        }
      } else if (itemIndex !== undefined) {
        refKey = `${blockId}-${itemIndex}`;
      }
      const el = textInputRefs.current[refKey] ?? textInputRefs.current[blockId];
      if (!el || !("value" in el)) return;
      const inputEl = el as HTMLInputElement | HTMLTextAreaElement;
      const start = inputEl.selectionStart ?? 0;
      const end = inputEl.selectionEnd ?? 0;
      if (start === end) return; // 選択なし
      const val = inputEl.value;
      const before = val.slice(0, start);
      const selected = val.slice(start, end);
      const after = val.slice(end);
      const newContent = before + wrapper + selected + wrapper + after;
      if (targetItemIndex !== undefined && block?.items) {
        const newItems = [...block.items];
        newItems[targetItemIndex] = newContent;
        updateBlock(blockId, { items: newItems });
      } else {
        updateBlock(blockId, { content: newContent });
      }
      requestAnimationFrame(() => {
        const newEl = textInputRefs.current[refKey] as HTMLInputElement | HTMLTextAreaElement | null;
        if (newEl && "setSelectionRange" in newEl) {
          newEl.focus();
          const newStart = start + wrapper.length;
          const newEnd = end + wrapper.length;
          newEl.setSelectionRange(newStart, newEnd);
        }
      });
    },
    [blocks, updateBlock]
  );

  /** 選択範囲を行単位で箇条書き・番号付きリスト形式に変換 */
  const applyListFormat = useCallback(
    (blockId: string, listType: "bullet" | "numbered", itemIndex?: number) => {
      let refKey = blockId;
      let targetItemIndex: number | undefined = itemIndex;
      const block = blocks.find((b) => b.id === blockId);
      if (block?.items && itemIndex === undefined) {
        for (let i = 0; i < block.items.length; i++) {
          const k = `${blockId}-${i}`;
          if (textInputRefs.current[k] === document.activeElement) {
            refKey = k;
            targetItemIndex = i;
            break;
          }
        }
      } else if (itemIndex !== undefined) {
        refKey = `${blockId}-${itemIndex}`;
      }
      const el = textInputRefs.current[refKey] ?? textInputRefs.current[blockId];
      if (!el || !("value" in el)) return;
      const inputEl = el as HTMLInputElement | HTMLTextAreaElement;
      const start = inputEl.selectionStart ?? 0;
      const end = inputEl.selectionEnd ?? 0;
      if (start === end) return;
      const val = inputEl.value;
      const selected = val.slice(start, end);
      const lines = selected.split(/\n/);
      const formatted = lines
        .map((line, i) =>
          listType === "bullet" ? `- ${line}` : `${i + 1}. ${line}`
        )
        .join("\n");
      const before = val.slice(0, start);
      const after = val.slice(end);
      const newContent = before + formatted + after;
      if (targetItemIndex !== undefined && block?.items) {
        const newItems = [...block.items];
        newItems[targetItemIndex] = newContent;
        updateBlock(blockId, { items: newItems });
      } else {
        updateBlock(blockId, { content: newContent });
      }
      requestAnimationFrame(() => {
        const newEl = textInputRefs.current[refKey] as HTMLInputElement | HTMLTextAreaElement | null;
        if (newEl && "setSelectionRange" in newEl) {
          newEl.focus();
          const newStart = start;
          const newEnd = start + formatted.length;
          newEl.setSelectionRange(newStart, newEnd);
        }
      });
    },
    [blocks, updateBlock]
  );

  /** 選択したテキストを新しいブロックとして分離 */
  const extractSelectionToBlock = useCallback(() => {
    if (!selectionBubble) return;
    const { blockId, refKey, itemIndex } = selectionBubble;
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;
    const el = textInputRefs.current[refKey] ?? textInputRefs.current[blockId];
    if (!el) return;
    let before: string;
    let selected: string;
    let after: string;
    if (el.isContentEditable) {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      selected = sel.toString();
      if (!selected) return;
      const fragToMd = (frag: DocumentFragment) => {
        const div = document.createElement("div");
        div.appendChild(frag);
        return htmlToMarkdown(div.innerHTML);
      };
      const preRange = document.createRange();
      preRange.selectNodeContents(el);
      preRange.setEnd(range.startContainer, range.startOffset);
      before = fragToMd(preRange.cloneContents()).trimEnd();
      const postRange = document.createRange();
      postRange.selectNodeContents(el);
      postRange.setStart(range.endContainer, range.endOffset);
      after = fragToMd(postRange.cloneContents()).trimStart();
      selected = fragToMd(range.cloneContents());
    } else if ("value" in el) {
      const start = (el as HTMLInputElement).selectionStart ?? 0;
      const end = (el as HTMLInputElement).selectionEnd ?? 0;
      if (start === end) return;
      const val = (el as HTMLInputElement).value;
      before = val.slice(0, start).trimEnd();
      selected = val.slice(start, end);
      after = val.slice(end).trimStart();
    } else return;
    const index = blocks.findIndex((b) => b.id === blockId);
    if (index < 0) return;
    const newBlocks: ContentBlock[] = [];
    if (block.items && itemIndex !== undefined) {
      const items = block.items;
      const newItems = [
        ...items.slice(0, itemIndex),
        ...(before ? [before] : []),
        ...(after ? [after] : []),
        ...items.slice(itemIndex + 1),
      ];
      const modifiedBlock = { ...block, id: generateId(), items: newItems.length > 0 ? newItems : [""] };
      newBlocks.push(modifiedBlock);
      newBlocks.push({ id: generateId(), type: "paragraph", content: selected });
    } else {
      if (before) newBlocks.push({ ...block, id: generateId(), content: before });
      newBlocks.push({ id: generateId(), type: "paragraph", content: selected });
      if (after) newBlocks.push({ ...block, id: generateId(), content: after });
    }
    const result = [...blocks];
    result.splice(index, 1, ...newBlocks);
    const selectedBlock = newBlocks.find((b) => b.type === "paragraph" && b.content === selected);
    onChange(result);
    setSelectionBubble(null);
    if (selectedBlock) setActiveBlockId(selectedBlock.id);
  }, [selectionBubble, blocks, onChange]);

  /** 選択範囲の検出とフォーマット状態の更新 */
  useEffect(() => {
    const getActiveFormats = (value: string, start: number, end: number) => {
      const before = value.slice(0, start);
      const after = value.slice(end);
      const bold = before.endsWith("**") && after.startsWith("**");
      const italic =
        !bold &&
        before.endsWith("*") &&
        !before.endsWith("**") &&
        after.startsWith("*") &&
        !after.startsWith("**");
      const strikethrough = before.endsWith("~~") && after.startsWith("~~");
      return { bold, italic, strikethrough };
    };

    const checkSelection = () => {
      const activeEl = document.activeElement;
      let foundBlockId: string | null = null;
      let foundRefKey: string | null = null;
      let foundItemIndex: number | undefined;
      for (const [key, el] of Object.entries(textInputRefs.current)) {
        if (el && (el === activeEl || el.contains(activeEl))) {
          foundRefKey = key;
          const m = key.match(/^(.+)-(\d+)$/);
          if (m) {
            foundBlockId = m[1];
            foundItemIndex = parseInt(m[2], 10);
          } else {
            foundBlockId = key;
          }
          break;
        }
      }
      if (!foundBlockId || !foundRefKey) {
        setSelectionBubble(null);
        setActiveFormats(null);
        return;
      }
      const block = blocks.find((b) => b.id === foundBlockId);
      const textBlocks = ["heading1", "heading2", "heading3", "paragraph", "quote", "markdown", "bulletList", "numberedList"];
      if (!block || !textBlocks.includes(block.type)) {
        setSelectionBubble(null);
        setActiveFormats(null);
        return;
      }
      const el = textInputRefs.current[foundRefKey];
      if (!el) {
        setActiveFormats(null);
        return;
      }
      if ((el as HTMLElement).isContentEditable) {
        setActiveFormats({
          blockId: foundBlockId,
          bold: document.queryCommandState("bold"),
          italic: document.queryCommandState("italic"),
          strikethrough: document.queryCommandState("strikeThrough"),
        });
      } else if ("value" in el) {
        const value = (el as HTMLInputElement | HTMLTextAreaElement).value;
        const start = (el as HTMLInputElement | HTMLTextAreaElement).selectionStart ?? 0;
        const end = (el as HTMLInputElement | HTMLTextAreaElement).selectionEnd ?? 0;
        const formats = getActiveFormats(value, start, end);
        setActiveFormats({ blockId: foundBlockId, ...formats });
      } else {
        setActiveFormats(null);
      }

      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.getRangeAt(0).collapsed) {
        setSelectionBubble(null);
        return;
      }
      const range = sel.getRangeAt(0);
      try {
        const rect = range.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
          setSelectionBubble(null);
          return;
        }
        setSelectionBubble({
          blockId: foundBlockId,
          refKey: foundRefKey,
          itemIndex: foundItemIndex,
          rect,
        });
      } catch {
        setSelectionBubble(null);
      }
    };
    document.addEventListener("selectionchange", checkSelection);
    return () => document.removeEventListener("selectionchange", checkSelection);
  }, [blocks]);

  /** ブロックタイプを変更（変換ロジック付き） */
  const convertBlockType = useCallback(
    (blockId: string, newType: BlockType) => {
      const block = blocks.find((b) => b.id === blockId);
      if (!block) return;
      const index = blocks.findIndex((b) => b.id === blockId);
      if (index < 0) return;
      let converted: ContentBlock;
      const text = block.content ?? "";
      const items = block.items ?? [];
      switch (newType) {
        case "heading1":
        case "heading2":
        case "heading3":
          converted = { ...block, type: newType, content: text.replace(/^#+\s*/, "").trim() };
          break;
        case "paragraph":
          converted = {
            ...block,
            type: "paragraph",
            content: items.length > 0 ? items.join("\n") : text,
            items: undefined,
          };
          break;
        case "quote":
          converted = { ...block, type: "quote", content: items.length > 0 ? items.join("\n") : text, items: undefined };
          break;
        case "bulletList":
          converted = {
            ...block,
            type: "bulletList",
            content: "",
            items: text ? text.split(/\n/).filter(Boolean) : items.length > 0 ? items : [""],
          };
          break;
        case "numberedList":
          converted = {
            ...block,
            type: "numberedList",
            content: "",
            items: text ? text.split(/\n/).filter(Boolean) : items.length > 0 ? items : [""],
          };
          break;
        case "divider":
          converted = { ...block, type: "divider", content: "", items: undefined };
          break;
        case "markdown":
          converted = { ...block, type: "markdown", content: items.length > 0 ? items.join("\n") : text, items: undefined };
          break;
        case "image":
        case "video":
          converted = { ...block, type: newType, content: "", items: undefined };
          break;
        default:
          return;
      }
      const newBlocks = [...blocks];
      newBlocks[index] = converted;
      onChange(newBlocks);
      setBlockTypeDropdownOpen(null);
    },
    [blocks, onChange]
  );

  const handleBulkPaste = useCallback(() => {
    const text = bulkPasteText.trim();
    if (!text) {
      toast.error("貼り付けするテキストを入力してください");
      return;
    }
    // Markdown はブロック変換せず、1つの markdown ブロックとしてそのまま表示
    const markdownBlock: ContentBlock = {
      id: generateId(),
      type: "markdown",
      content: text,
    };
    const newBlocks = blocks.length === 0 ? [markdownBlock] : [...blocks, markdownBlock];
    if (maxLength !== undefined && calculateTotalLength(newBlocks) > maxLength) {
      toast.error(`文字数が上限（${maxLength.toLocaleString()}文字）を超えます`);
      return;
    }
    onChange(newBlocks);
    setBulkPasteText("");
    setBulkPasteOpen(false);
    toast.success("Markdown を1ブロックで追加しました");
  }, [bulkPasteText, blocks, onChange, maxLength, calculateTotalLength]);

  /** 段落ブロックの内容がMarkdown形式なら自動変換 */
  const tryAutoConvertParagraph = useCallback(
    (block: ContentBlock, content: string) => {
      if (!autoConvertMarkdown || block.type !== "paragraph") return;
      const trimmed = content.trim();
      if (!trimmed) return;
      const lines = content.split(/\r?\n/);
      const firstLine = lines[0].trim();

      // 複数行のMarkdown → 複数ブロックに変換
      if (lines.length > 1) {
        const parsed = contentToBlocks(content);
        if (parsed.length > 1 || (parsed.length === 1 && parsed[0].type !== "paragraph")) {
          replaceBlockWithBlocks(block.id, parsed);
          return;
        }
      }

      // 単一行のMarkdownプレフィックス
      if (firstLine.startsWith("# ")) {
        replaceBlockWithBlocks(block.id, [
          { ...block, type: "heading1", content: firstLine.slice(2).trim(), id: generateId() },
        ]);
        return;
      }
      if (firstLine.startsWith("## ")) {
        replaceBlockWithBlocks(block.id, [
          { ...block, type: "heading2", content: firstLine.slice(3).trim(), id: generateId() },
        ]);
        return;
      }
      if (firstLine.startsWith("### ")) {
        replaceBlockWithBlocks(block.id, [
          { ...block, type: "heading3", content: firstLine.slice(4).trim(), id: generateId() },
        ]);
        return;
      }
      if (firstLine.startsWith("> ")) {
        replaceBlockWithBlocks(block.id, [
          { ...block, type: "quote", content: firstLine.slice(2).trim(), id: generateId() },
        ]);
        return;
      }
      if (firstLine === "---") {
        replaceBlockWithBlocks(block.id, [
          { ...block, type: "divider", content: "", id: generateId() },
        ]);
        return;
      }
      if (firstLine.startsWith("- ")) {
        const items = lines
          .filter((l) => l.trim().startsWith("- "))
          .map((l) => l.trim().slice(2));
        replaceBlockWithBlocks(block.id, [
          { ...block, type: "bulletList", content: "", items: items.length > 0 ? items : [""], id: generateId() },
        ]);
        return;
      }
      const orderedMatch = firstLine.match(/^\d+\.\s+(.*)$/);
      if (orderedMatch) {
        const items: string[] = [];
        for (const line of lines) {
          const m = line.trim().match(/^\d+\.\s+(.*)$/);
          if (m) items.push(m[1]);
          else break;
        }
        replaceBlockWithBlocks(block.id, [
          { ...block, type: "numberedList", content: "", items: items.length > 0 ? items : [""], id: generateId() },
        ]);
      }
    },
    [autoConvertMarkdown, replaceBlockWithBlocks]
  );

  const handleAddBlockClick = (index: number) => {
    setMenuPosition(index);
    setShowBlockMenu(true);
  };

  const renderBlockContent = (block: ContentBlock) => {
    const blockLength = getBlockLength(block);
    
    switch (block.type) {
      case "heading1":
        return (
          <div className="flex items-center gap-2">
            <RichTextEditable
              blockId={block.id}
              value={block.content}
              onChange={(c) => updateBlock(block.id, { content: c })}
              refCallback={(el) => { textInputRefs.current[block.id] = el; }}
              placeholder="大見出しを入力..."
              className={`flex-1 min-w-0 text-4xl font-bold outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground`}
              style={{ textAlign: block.align }}
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {blockLength} 文字
            </span>
          </div>
        );
      case "heading2":
        return (
          <div className="flex items-center gap-2">
            <RichTextEditable
              blockId={block.id}
              value={block.content}
              onChange={(c) => updateBlock(block.id, { content: c })}
              refCallback={(el) => { textInputRefs.current[block.id] = el; }}
              placeholder="中見出しを入力..."
              className={`flex-1 min-w-0 text-2xl font-bold outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground`}
              style={{ textAlign: block.align }}
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {blockLength} 文字
            </span>
          </div>
        );
      case "heading3":
        return (
          <div className="flex items-center gap-2">
            <RichTextEditable
              blockId={block.id}
              value={block.content}
              onChange={(c) => updateBlock(block.id, { content: c })}
              refCallback={(el) => { textInputRefs.current[block.id] = el; }}
              placeholder="小見出しを入力..."
              className={`flex-1 min-w-0 text-xl font-semibold outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground`}
              style={{ textAlign: block.align }}
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {blockLength} 文字
            </span>
          </div>
        );
      case "paragraph":
        return (
          <div className="relative">
            <RichTextEditable
              blockId={block.id}
              value={block.content}
              onChange={(c) => updateBlock(block.id, { content: c })}
              onBlur={(c) => tryAutoConvertParagraph(block, c)}
              refCallback={(el) => { textInputRefs.current[block.id] = el; }}
              placeholder="本文を入力...（# 見出し、- リストなどで自動変換）"
              className={`w-full min-h-[100px] py-2 px-0 bg-transparent resize-none outline-none pr-16 empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground`}
              style={{ textAlign: block.align }}
            />
            <span className="absolute top-2 right-2 text-xs text-muted-foreground">
              {blockLength} 文字
            </span>
          </div>
        );
      case "image":
        return (
          <div className="space-y-3">
            {block.url ? (
              <div className="relative group">
                <img
                  src={block.url}
                  alt={block.caption || ""}
                  className="w-full max-h-[500px] object-contain rounded-lg"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateBlock(block.id, { url: "" });
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 sm:p-12 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    // 画像アップロードを起動
                    fileInputRefs.current[block.id]?.click();
                  }}
                >
                  <ImageIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500">クリックして画像をアップロード</p>
                  <p className="text-xs text-gray-400 mt-1">
                    JPG/PNG/GIF/WebP（最大5MB）
                  </p>
                </div>

                <input
                  ref={(el) => {
                    fileInputRefs.current[block.id] = el;
                  }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onClick={(e) => e.stopPropagation()}
                  onChange={async (e) => {
                    e.stopPropagation();
                    const file = e.target.files?.[0];
                    if (!file) return;

                    setUploadingBlockId(block.id);
                    try {
                      const formData = new FormData();
                      formData.append("file", file);
                      const result = await uploadImage(formData);
                      if (result.success && result.url) {
                        updateBlock(block.id, { url: result.url, content: "" });
                        toast.success("画像をアップロードしました");
                      } else {
                        toast.error("画像アップロードに失敗しました", {
                          description: result.error || "もう一度お試しください",
                        });
                      }
                    } catch (err) {
                      console.error(err);
                      toast.error("画像アップロードに失敗しました");
                    } finally {
                      setUploadingBlockId(null);
                      // 同じファイルを選択できるようにリセット
                      e.currentTarget.value = "";
                    }
                  }}
                />

                <div className="flex items-center justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRefs.current[block.id]?.click();
                    }}
                    disabled={uploadingBlockId === block.id}
                  >
                    {uploadingBlockId === block.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        アップロード中...
                      </>
                    ) : (
                      "画像を選択"
                    )}
                  </Button>
                </div>
              </div>
            )}
            <Input
              value={block.caption || ""}
              onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              placeholder="画像のキャプションを入力..."
              className="text-center text-sm text-muted-foreground"
            />
          </div>
        );
      case "video":
        return (
          <div className="space-y-3">
            {block.url ? (
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden group">
                <iframe
                  src={block.url.includes("youtube.com") || block.url.includes("youtu.be")
                    ? `https://www.youtube.com/embed/${extractYouTubeId(block.url)}`
                    : block.url
                  }
                  className="w-full h-full"
                  allowFullScreen
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateBlock(block.id, { url: "", content: "" });
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                  <Video className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500">動画URLを入力してください</p>
                  <p className="text-xs text-gray-400 mt-1">
                    YouTube, Vimeo対応
                  </p>
                </div>
                <Input
                  value={block.content}
                  onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                  onBlur={(e) => {
                    if (e.target.value) {
                      updateBlock(block.id, { url: e.target.value });
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && block.content) {
                      e.preventDefault();
                      updateBlock(block.id, { url: block.content });
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="動画URL（YouTube, Vimeo）を入力してEnter..."
                />
              </div>
            )}
            <Input
              value={block.caption || ""}
              onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              placeholder="動画のキャプションを入力..."
              className="text-center text-sm text-muted-foreground"
            />
          </div>
        );
      case "quote":
        return (
          <div className="border-l-4 border-primary pl-4 py-2">
            <div className="relative">
              <RichTextEditable
                blockId={block.id}
                value={block.content}
                onChange={(c) => updateBlock(block.id, { content: c })}
                refCallback={(el) => { textInputRefs.current[block.id] = el; }}
                placeholder="引用文を入力..."
                className="w-full min-h-[80px] py-2 px-0 bg-transparent resize-none outline-none italic text-lg pr-16 empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground"
              />
              <span className="absolute top-2 right-2 text-xs text-muted-foreground">
                {block.content?.length || 0} 文字
              </span>
            </div>
            <Input
              value={block.caption || ""}
              onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              placeholder="引用元..."
              className="mt-2 text-sm text-muted-foreground border-none shadow-none bg-transparent"
            />
          </div>
        );
      case "divider":
        return <hr className="border-t-2 border-gray-200 my-4" />;
      case "bulletList":
      case "numberedList":
        return (
          <div className="space-y-2">
            {(block.items || [""]).map((item, itemIndex) => (
              <div key={itemIndex} className="flex items-center gap-2">
                <span className="text-muted-foreground w-6 text-right">
                  {block.type === "numberedList" ? `${itemIndex + 1}.` : "•"}
                </span>
                <Input
                  ref={(el) => { textInputRefs.current[`${block.id}-${itemIndex}`] = el; }}
                  value={item}
                  onChange={(e) => {
                    const newItems = [...(block.items || [""])];
                    newItems[itemIndex] = e.target.value;
                    updateBlock(block.id, { items: newItems });
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const newItems = [...(block.items || [""])];
                      newItems.splice(itemIndex + 1, 0, "");
                      updateBlock(block.id, { items: newItems });
                    }
                    if (e.key === "Backspace" && item === "" && (block.items?.length || 0) > 1) {
                      e.preventDefault();
                      const newItems = [...(block.items || [""])];
                      newItems.splice(itemIndex, 1);
                      updateBlock(block.id, { items: newItems });
                    }
                  }}
                  placeholder="リスト項目を入力..."
                  className="flex-1 border-none shadow-none"
                />
              </div>
            ))}
            <div className="flex justify-end mt-2">
              <span className="text-xs text-muted-foreground">
                合計: {blockLength} 文字
              </span>
            </div>
          </div>
        );
      case "markdown":
        return (
          <div className="space-y-2">
            <Textarea
              ref={(el) => { textInputRefs.current[block.id] = el; }}
              value={block.content}
              onChange={(e) => updateBlock(block.id, { content: e.target.value })}
              placeholder="Markdown を入力..."
              className="min-h-[120px] font-mono text-sm resize-none"
              onClick={(e) => e.stopPropagation()}
            />
            {block.content && (
              <div className="prose prose-sm max-w-none border-t pt-3 mt-3">
                <ReactMarkdown>{block.content}</ReactMarkdown>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 relative">
      {/* 選択テキストをブロックにするバブル */}
      {selectionBubble && (
        <div
          className="fixed z-[100] bg-popover border rounded-lg shadow-lg p-1"
          style={{
            left: selectionBubble.rect.left + selectionBubble.rect.width / 2 - 120,
            top: selectionBubble.rect.top - 44,
          }}
        >
          <Button
            variant="ghost"
            size="sm"
            className="text-sm"
            onMouseDown={(e) => {
              e.preventDefault();
              extractSelectionToBlock();
            }}
          >
            <SplitSquareVertical className="h-4 w-4 mr-2" />
            選択したテキストをブロックにする
          </Button>
        </div>
      )}

      {showBulkPaste && (
        <div className="border rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setBulkPasteOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 text-left text-sm font-medium"
          >
            <span className="flex items-center gap-2">
              <ClipboardPaste className="h-4 w-4" />
              一括貼り付け
            </span>
            {bulkPasteOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {bulkPasteOpen && (
            <div className="p-4 border-t bg-background space-y-4">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Markdown を貼り付けると、1つのブロックとしてそのまま表示されます。
                </p>
                <Textarea
                  value={bulkPasteText}
                  onChange={(e) => setBulkPasteText(e.target.value)}
                  placeholder={"# Markdown見出し\n- 箇条書き\n1. 番号付きリスト\n\n本文..."}
                  className="min-h-[100px] font-mono text-sm"
                  onClick={(e) => e.stopPropagation()}
                />
                <Button type="button" size="sm" onClick={handleBulkPaste}>
                  <ClipboardPaste className="h-4 w-4 mr-2" />
                  貼り付けて追加
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {blocks.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">
            コンテンツブロックを追加してください
          </p>
          <Button variant="outline" onClick={() => handleAddBlockClick(0)}>
            <Plus className="h-4 w-4 mr-2" />
            ブロックを追加
          </Button>
        </div>
      )}

      {blocks.map((block, index) => (
        <div key={block.id}>
          {/* Add block button between blocks */}
          <div className="flex justify-center py-2 opacity-0 hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAddBlockClick(index)}
              className="text-muted-foreground"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Block */}
          <div
            className={`group relative border rounded-lg p-4 transition-all ${
              activeBlockId === block.id
                ? "border-primary ring-2 ring-primary/20"
                : "border-transparent hover:border-gray-200"
            }`}
            onClick={() => setActiveBlockId(block.id)}
          >
            {/* Block move controls & delete - shown on the right for active block */}
            {activeBlockId === block.id && (
              <div className="absolute -right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 bg-white border rounded-lg shadow-sm p-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveBlock(block.id, "up");
                  }}
                  className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                  disabled={index === 0}
                  title="上へ移動"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <div className="p-1 cursor-grab">
                  <GripVertical className="h-4 w-4 text-gray-400" />
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveBlock(block.id, "down");
                  }}
                  className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                  disabled={index === blocks.length - 1}
                  title="下へ移動"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteBlock(block.id);
                  }}
                  className="p-1 hover:bg-red-50 rounded text-destructive hover:text-destructive"
                  title="ブロックを削除"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Block type indicator & controls */}
            {activeBlockId === block.id && block.type !== "divider" && (
              <div className="flex items-center gap-2 mb-3 pb-3 border-b">
                <DropdownMenu open={blockTypeDropdownOpen === block.id} onOpenChange={(open) => setBlockTypeDropdownOpen(open ? block.id : null)}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded hover:bg-muted/80 flex items-center gap-1"
                    >
                      {blockTypeLabels[block.type]}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onClick={() => convertBlockType(block.id, "heading1")}>
                      <Heading1 className="h-4 w-4 mr-2" />大見出し
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => convertBlockType(block.id, "heading2")}>
                      <Heading2 className="h-4 w-4 mr-2" />中見出し
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => convertBlockType(block.id, "heading3")}>
                      <Heading3 className="h-4 w-4 mr-2" />小見出し
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => convertBlockType(block.id, "paragraph")}>
                      <Type className="h-4 w-4 mr-2" />本文
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => convertBlockType(block.id, "image")}>
                      <ImageIcon className="h-4 w-4 mr-2" />画像
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => convertBlockType(block.id, "video")}>
                      <Video className="h-4 w-4 mr-2" />動画
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => convertBlockType(block.id, "quote")}>
                      <Quote className="h-4 w-4 mr-2" />引用
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => convertBlockType(block.id, "bulletList")}>
                      <List className="h-4 w-4 mr-2" />箇条書き
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => convertBlockType(block.id, "numberedList")}>
                      <ListOrdered className="h-4 w-4 mr-2" />番号付きリスト
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => convertBlockType(block.id, "divider")}>
                      <Minus className="h-4 w-4 mr-2" />区切り線
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {/* 太字・斜体・取り消し線・箇条書き・番号付き（選択範囲に適用、オン時はハイライト） */}
                {["heading1", "heading2", "heading3", "paragraph", "quote", "bulletList", "numberedList", "markdown"].includes(block.type) && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant={activeFormats?.blockId === block.id && activeFormats.bold ? "secondary" : "ghost"}
                      size="icon-sm"
                      title="太字"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyFormat(block.id, "**");
                      }}
                    >
                      <Bold className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={activeFormats?.blockId === block.id && activeFormats.italic ? "secondary" : "ghost"}
                      size="icon-sm"
                      title="斜体"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyFormat(block.id, "*");
                      }}
                    >
                      <Italic className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={activeFormats?.blockId === block.id && activeFormats.strikethrough ? "secondary" : "ghost"}
                      size="icon-sm"
                      title="取り消し線"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyFormat(block.id, "~~");
                      }}
                    >
                      <Strikethrough className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="箇条書き"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyListFormat(block.id, "bullet");
                      }}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="番号付きリスト"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyListFormat(block.id, "numbered");
                      }}
                    >
                      <ListOrdered className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Alignment controls for text blocks */}
                {["heading1", "heading2", "heading3", "paragraph"].includes(block.type) && (
                  <div className="flex items-center gap-1 ml-auto">
                    <Button
                      variant={block.align === "left" ? "secondary" : "ghost"}
                      size="icon-sm"
                      onClick={() => updateBlock(block.id, { align: "left" })}
                    >
                      <AlignLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={block.align === "center" ? "secondary" : "ghost"}
                      size="icon-sm"
                      onClick={() => updateBlock(block.id, { align: "center" })}
                    >
                      <AlignCenter className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={block.align === "right" ? "secondary" : "ghost"}
                      size="icon-sm"
                      onClick={() => updateBlock(block.id, { align: "right" })}
                    >
                      <AlignRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            {renderBlockContent(block)}
          </div>
        </div>
      ))}

      {/* Add block button at the end */}
      {blocks.length > 0 && (
        <div className="flex justify-center py-4">
          <Button
            variant="outline"
            onClick={() => handleAddBlockClick(blocks.length)}
          >
            <Plus className="h-4 w-4 mr-2" />
            ブロックを追加
          </Button>
        </div>
      )}

      {/* Block type menu */}
      {showBlockMenu && menuPosition !== null && (
        <div className="fixed inset-0 z-50 bg-black/20" onClick={() => setShowBlockMenu(false)}>
          <div
            className="absolute bg-white border rounded-lg shadow-xl p-4 w-[calc(100vw-2rem)] max-w-sm sm:max-w-md"
            style={{
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold mb-3">ブロックを追加</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              <BlockTypeButton
                icon={<Heading1 className="h-5 w-5" />}
                label="大見出し"
                onClick={() => addBlock("heading1", menuPosition)}
              />
              <BlockTypeButton
                icon={<Heading2 className="h-5 w-5" />}
                label="中見出し"
                onClick={() => addBlock("heading2", menuPosition)}
              />
              <BlockTypeButton
                icon={<Heading3 className="h-5 w-5" />}
                label="小見出し"
                onClick={() => addBlock("heading3", menuPosition)}
              />
              <BlockTypeButton
                icon={<Type className="h-5 w-5" />}
                label="本文"
                onClick={() => addBlock("paragraph", menuPosition)}
              />
              <BlockTypeButton
                icon={<ImageIcon className="h-5 w-5" />}
                label="画像"
                onClick={() => addBlock("image", menuPosition)}
              />
              <BlockTypeButton
                icon={<Video className="h-5 w-5" />}
                label="動画"
                onClick={() => addBlock("video", menuPosition)}
              />
              <BlockTypeButton
                icon={<Quote className="h-5 w-5" />}
                label="引用"
                onClick={() => addBlock("quote", menuPosition)}
              />
              <BlockTypeButton
                icon={<List className="h-5 w-5" />}
                label="箇条書き"
                onClick={() => addBlock("bulletList", menuPosition)}
              />
              <BlockTypeButton
                icon={<ListOrdered className="h-5 w-5" />}
                label="番号リスト"
                onClick={() => addBlock("numberedList", menuPosition)}
              />
              <BlockTypeButton
                icon={<Minus className="h-5 w-5" />}
                label="区切り線"
                onClick={() => addBlock("divider", menuPosition)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BlockTypeButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-gray-100 transition-colors"
    >
      <span className="text-gray-600">{icon}</span>
      <span className="text-xs text-gray-600">{label}</span>
    </button>
  );
}

function extractYouTubeId(url: string): string {
  const match = url.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
  );
  return match ? match[1] : "";
}
