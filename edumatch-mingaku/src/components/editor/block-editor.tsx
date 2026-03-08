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
  FileText,
  SplitSquareVertical,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { contentToBlocks } from "@/lib/markdown-to-blocks";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [addMenuIndex, setAddMenuIndex] = useState<number | null>(null);
  const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);
  const [bulkPasteOpen, setBulkPasteOpen] = useState(false);
  const [bulkPasteText, setBulkPasteText] = useState("");
  /** アクティブブロック内でテキストが選択されているか（選択時のみ「選択したテキストをブロックにする」を表示） */
  const [hasSelectionInActiveBlock, setHasSelectionInActiveBlock] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const textInputRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});

  /** アクティブブロックの入力欄で選択があるか判定（フォーカス中の入力がアクティブブロックかつ選択範囲あり） */
  const checkSelectionInActiveBlock = useCallback(() => {
    const activeEl = document.activeElement;
    if (!activeEl || !(activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement)) {
      setHasSelectionInActiveBlock(false);
      return;
    }
    const textBlockTypes = ["heading1", "heading2", "heading3", "paragraph", "quote", "markdown"];
    let focusedBlockId: string | null = null;
    for (const [key, el] of Object.entries(textInputRefs.current)) {
      if (el === activeEl) {
        focusedBlockId = key.includes("-") ? key.replace(/-\d+$/, "") : key;
        break;
      }
    }
    if (!focusedBlockId || focusedBlockId !== activeBlockId) {
      setHasSelectionInActiveBlock(false);
      return;
    }
    const block = blocks.find((b) => b.id === activeBlockId);
    if (!block || !textBlockTypes.includes(block.type) || block.items) {
      setHasSelectionInActiveBlock(false);
      return;
    }
    const start = activeEl.selectionStart ?? 0;
    const end = activeEl.selectionEnd ?? 0;
    setHasSelectionInActiveBlock(start !== end);
  }, [activeBlockId, blocks]);

  useEffect(() => {
    setHasSelectionInActiveBlock(false);
    setAddMenuIndex(null);
  }, [activeBlockId]);

  const handleSelectionChange = useCallback(() => {
    checkSelectionInActiveBlock();
  }, [checkSelectionInActiveBlock]);
  
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
      setAddMenuIndex(null);
      setActiveBlockId(newBlock.id);
    },
    [blocks, onChange]
  );

  const toggleAddMenu = useCallback((index: number) => {
    setAddMenuIndex((current) => (current === index ? null : index));
  }, []);

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

  /** 選択範囲に太字・斜体・取り消し線を適用（onMouseDown でボタンクリック時にフォーカスを維持） */
  const applyFormat = useCallback(
    (blockId: string, wrapper: "**" | "*" | "~~", itemIndex?: number) => {
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
      const activeEl = document.activeElement;
      if (!el || el !== activeEl || !(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
      const start = el.selectionStart ?? 0;
      const end = el.selectionEnd ?? 0;
      if (start === end) return;
      const val = el.value;
      const before = val.slice(0, start);
      const selected = val.slice(start, end);
      const after = val.slice(end);
      const newContent = before + wrapper + selected + wrapper + after;
      const newStart = start + wrapper.length;
      const newEnd = end + wrapper.length;
      if (targetItemIndex !== undefined && block?.items) {
        const newItems = [...block.items];
        newItems[targetItemIndex] = newContent;
        updateBlock(blockId, { items: newItems });
      } else {
        updateBlock(blockId, { content: newContent });
      }
      setTimeout(() => {
        const target = textInputRefs.current[refKey] ?? textInputRefs.current[blockId];
        if (target) {
          target.focus();
          target.setSelectionRange(newStart, newEnd);
        }
      }, 0);
    },
    [blocks, updateBlock]
  );

  /** 選択したテキストをブロックに分割 */
  const convertSelectedToBlocks = useCallback(
    (blockId: string) => {
      const block = blocks.find((b) => b.id === blockId);
      if (!block) return;
      const textBlockTypes = ["heading1", "heading2", "heading3", "paragraph", "quote", "markdown"];
      if (!textBlockTypes.includes(block.type)) {
        toast.error("このブロックでは利用できません");
        return;
      }

      if (block.items) {
        toast.error("本文・見出し・引用ブロックでテキストを選択してから実行してください");
        return;
      }

      const el = textInputRefs.current[blockId];
      if (!el) return;
      const start = el.selectionStart ?? 0;
      const end = el.selectionEnd ?? 0;
      if (start === end) {
        toast.error("テキストを選択してから実行してください");
        return;
      }
      const val = block.content ?? "";
      const before = val.slice(0, start).trim();
      const selected = val.slice(start, end);
      const after = val.slice(end).trim();
      const parsed = contentToBlocks(selected);
      if (parsed.length === 0) {
        toast.error("選択したテキストをブロックに変換できませんでした");
        return;
      }
      const newBlocks: ContentBlock[] = [];
      if (before) {
        newBlocks.push({
          id: generateId(),
          type: block.type,
          content: before,
          align: block.align,
        });
      }
      newBlocks.push(...parsed.map((b) => ({ ...b, id: generateId() })));
      if (after) {
        newBlocks.push({
          id: generateId(),
          type: block.type,
          content: after,
          align: block.align,
        });
      }
      replaceBlockWithBlocks(blockId, newBlocks);
      toast.success(`${parsed.length} 個のブロックに分割しました`);
    },
    [blocks, updateBlock, replaceBlockWithBlocks]
  );

  /** ブロックタイプを変更 */
  const changeBlockType = useCallback(
    (blockId: string, newType: BlockType) => {
      const block = blocks.find((b) => b.id === blockId);
      if (!block) return;
      if (block.type === newType) return;

      const newBlock: ContentBlock = {
        ...block,
        type: newType,
        items: newType === "bulletList" || newType === "numberedList" ? [block.content || ""] : undefined,
        content: newType === "bulletList" || newType === "numberedList" ? "" : block.content,
        url: ["image", "video"].includes(newType) ? undefined : block.url,
        caption: ["image", "video"].includes(newType) ? undefined : block.caption,
      };
      if (newType === "divider") {
        newBlock.content = "";
        newBlock.items = undefined;
      }
      if (newType === "image" || newType === "video") {
        newBlock.content = "";
        newBlock.items = undefined;
      }
      updateBlock(blockId, newBlock);
    },
    [blocks, updateBlock]
  );

  const handleBulkPaste = useCallback(() => {
    const text = bulkPasteText.trim();
    if (!text) {
      toast.error("貼り付けするテキストを入力してください");
      return;
    }
    // 一括貼り付けはマークダウン用。見出し・太字・箇条書きなどに自動変換してブロック追加
    const parsed = contentToBlocks(text);
    const blocksToAdd: ContentBlock[] =
      parsed.length > 0
        ? parsed.map((b) => ({ ...b, id: generateId() }))
        : [{ id: generateId(), type: "markdown", content: text }];
    const newBlocks = blocks.length === 0 ? blocksToAdd : [...blocks, ...blocksToAdd];
    if (maxLength !== undefined && calculateTotalLength(newBlocks) > maxLength) {
      toast.error(`文字数が上限（${maxLength.toLocaleString()}文字）を超えます`);
      return;
    }
    onChange(newBlocks);
    setBulkPasteText("");
    setBulkPasteOpen(false);
    toast.success(
      blocksToAdd.length > 1
        ? `Markdown を${blocksToAdd.length}個のブロックに変換して追加しました`
        : "ブロックを追加しました"
    );
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

  const renderBlockContent = (block: ContentBlock) => {
    const blockLength = getBlockLength(block);
    
    switch (block.type) {
      case "heading1":
        return (
          <div className="flex items-center gap-2">
            <input
              ref={(el) => { textInputRefs.current[block.id] = el; }}
              type="text"
              value={block.content}
              onChange={(e) => updateBlock(block.id, { content: e.target.value })}
              onSelect={handleSelectionChange}
              onKeyUp={handleSelectionChange}
              onMouseUp={handleSelectionChange}
              placeholder="大見出しを入力..."
              className={`flex-1 bg-transparent text-4xl font-bold outline-none border-none text-${block.align}`}
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
            <input
              ref={(el) => { textInputRefs.current[block.id] = el; }}
              type="text"
              value={block.content}
              onChange={(e) => updateBlock(block.id, { content: e.target.value })}
              onSelect={handleSelectionChange}
              onKeyUp={handleSelectionChange}
              onMouseUp={handleSelectionChange}
              placeholder="中見出しを入力..."
              className={`flex-1 bg-transparent text-2xl font-bold outline-none border-none`}
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
            <input
              ref={(el) => { textInputRefs.current[block.id] = el; }}
              type="text"
              value={block.content}
              onChange={(e) => updateBlock(block.id, { content: e.target.value })}
              onSelect={handleSelectionChange}
              onKeyUp={handleSelectionChange}
              onMouseUp={handleSelectionChange}
              placeholder="小見出しを入力..."
              className={`flex-1 bg-transparent text-xl font-semibold outline-none border-none`}
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
            <Textarea
              ref={(el) => { textInputRefs.current[block.id] = el; }}
              value={block.content}
              onChange={(e) => updateBlock(block.id, { content: e.target.value })}
              onBlur={(e) => tryAutoConvertParagraph(block, e.target.value)}
              onSelect={handleSelectionChange}
              onKeyUp={handleSelectionChange}
              onMouseUp={handleSelectionChange}
              placeholder="本文を入力...（# 見出し、- リストなどで自動変換）"
              className={`w-full min-h-[100px] bg-transparent resize-none border-none shadow-none focus-visible:ring-0 pr-16`}
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
              <Textarea
                ref={(el) => { textInputRefs.current[block.id] = el; }}
                value={block.content}
                onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                onSelect={handleSelectionChange}
                onKeyUp={handleSelectionChange}
                onMouseUp={handleSelectionChange}
                placeholder="引用文を入力..."
                className="w-full min-h-[80px] bg-transparent resize-none border-none shadow-none focus-visible:ring-0 italic text-lg pr-16"
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
              onSelect={handleSelectionChange}
              onKeyUp={handleSelectionChange}
              onMouseUp={handleSelectionChange}
              placeholder="Markdown を入力..."
              className="min-h-[120px] font-mono text-sm resize-none"
              onClick={(e) => e.stopPropagation()}
            />
            {block.content && (
              <div className="prose prose-sm max-w-none border-t pt-3 mt-3">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.content}</ReactMarkdown>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
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
                  通常のブロック編集はマークダウンではありません。ここは<strong>マークダウン用</strong>です。貼り付けると見出し・太字・斜体・箇条書きなどに自動変換されてブロックで追加されます。
                </p>
                <Textarea
                  value={bulkPasteText}
                  onChange={(e) => setBulkPasteText(e.target.value)}
                  placeholder={"# 見出し\n**太字** や *斜体*\n- 箇条書き\n1. 番号付き\n\n本文..."}
                  className="min-h-[100px] font-mono text-sm"
                  onClick={(e) => e.stopPropagation()}
                />
                <Button type="button" size="sm" onClick={handleBulkPaste}>
                  <ClipboardPaste className="h-4 w-4 mr-2" />
                  貼り付けてブロックに変換
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
          <Button variant="outline" onClick={() => toggleAddMenu(0)}>
            <Plus className="h-4 w-4 mr-2" />
            ブロックを追加
          </Button>
          {addMenuIndex === 0 && (
            <div className="mt-4 flex justify-center">
              <AddBlockGrid addBlock={addBlock} index={0} />
            </div>
          )}
        </div>
      )}

      {blocks.map((block, index) => (
        <div key={block.id}>
          {/* Add block button between blocks */}
          <div className="py-2">
            <div className="flex justify-center opacity-0 hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleAddMenu(index)}
                className="text-muted-foreground"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {addMenuIndex === index && (
              <div className="mt-2 flex justify-center">
                <AddBlockGrid addBlock={addBlock} index={index} />
              </div>
            )}
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
            {activeBlockId === block.id && (
              <div className="flex flex-wrap items-center gap-2 mb-3 pb-3 border-b">
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  {blockTypeLabels[block.type]}
                </span>
                
                {/* 太字・斜体・取り消し線・箇条書き・番号付き（同じ行に5つ並べる） */}
                {["heading1", "heading2", "heading3", "paragraph", "quote", "bulletList", "numberedList", "markdown"].includes(block.type) && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
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
                      variant="ghost"
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
                      variant="ghost"
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
                      onClick={(e) => {
                        e.stopPropagation();
                        changeBlockType(block.id, "bulletList");
                      }}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="番号付き箇条書き"
                      onClick={(e) => {
                        e.stopPropagation();
                        changeBlockType(block.id, "numberedList");
                      }}
                    >
                      <ListOrdered className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* テキスト選択時のみ表示：選択したテキストをブロックに外に出す */}
                {["heading1", "heading2", "heading3", "paragraph", "quote", "markdown"].includes(block.type) && hasSelectionInActiveBlock && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="text-xs shrink-0"
                    title="選択部分をブロックに分割して外に出す"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      convertSelectedToBlocks(block.id);
                      setHasSelectionInActiveBlock(false);
                    }}
                  >
                    <SplitSquareVertical className="h-4 w-4 mr-1" />
                    選択したテキストをブロックにする
                  </Button>
                )}

                {/* ブロックタイプを変更（setTimeout でドロップダウン閉じた後に更新し固まり防止） */}
                <Select
                  value={block.type}
                  onValueChange={(v) => setTimeout(() => changeBlockType(block.id, v as BlockType), 0)}
                >
                  <SelectTrigger className="w-[160px] h-8 text-xs border" onClick={(e) => e.stopPropagation()}>
                    <SelectValue placeholder="ブロックタイプを変更" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="heading1">大見出し</SelectItem>
                    <SelectItem value="heading2">中見出し</SelectItem>
                    <SelectItem value="heading3">小見出し</SelectItem>
                    <SelectItem value="paragraph">本文</SelectItem>
                    <SelectItem value="quote">引用</SelectItem>
                    <SelectItem value="bulletList">箇条書き</SelectItem>
                    <SelectItem value="numberedList">番号付きリスト</SelectItem>
                    <SelectItem value="image">画像</SelectItem>
                    <SelectItem value="video">動画</SelectItem>
                    <SelectItem value="divider">区切り線</SelectItem>
                    <SelectItem value="markdown">Markdown</SelectItem>
                  </SelectContent>
                </Select>

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
          <div className="w-full">
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => toggleAddMenu(blocks.length)}>
                <Plus className="h-4 w-4 mr-2" />
                ブロックを追加
              </Button>
            </div>
            {addMenuIndex === blocks.length && (
              <div className="mt-3 flex justify-center">
                <AddBlockGrid addBlock={addBlock} index={blocks.length} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AddBlockGrid({
  addBlock,
  index,
}: {
  addBlock: (type: BlockType, index: number) => void;
  index: number;
}) {
  const items: { type: BlockType; icon: React.ReactNode; label: string }[] = [
    { type: "heading1", icon: <Heading1 className="h-4 w-4" />, label: "大見出し" },
    { type: "heading2", icon: <Heading2 className="h-4 w-4" />, label: "中見出し" },
    { type: "heading3", icon: <Heading3 className="h-4 w-4" />, label: "小見出し" },
    { type: "paragraph", icon: <Type className="h-4 w-4" />, label: "本文" },
    { type: "image", icon: <ImageIcon className="h-4 w-4" />, label: "画像" },
    { type: "video", icon: <Video className="h-4 w-4" />, label: "動画" },
    { type: "quote", icon: <Quote className="h-4 w-4" />, label: "引用" },
    { type: "bulletList", icon: <List className="h-4 w-4" />, label: "箇条書き" },
    { type: "numberedList", icon: <ListOrdered className="h-4 w-4" />, label: "番号付きリスト" },
    { type: "divider", icon: <Minus className="h-4 w-4" />, label: "区切り線" },
    { type: "markdown", icon: <FileText className="h-4 w-4" />, label: "Markdown" },
  ];
  return (
    <div className="w-full max-w-md rounded-xl border bg-background p-3 shadow-sm">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {items.map(({ type, icon, label }) => (
        <button
          key={type}
          type="button"
          onClick={() => addBlock(type, index)}
          className="flex h-16 flex-col items-center justify-center gap-1 rounded-lg border border-transparent transition-colors hover:bg-muted hover:border-border"
        >
          <span className="text-muted-foreground">{icon}</span>
          <span className="text-[11px] leading-none">{label}</span>
        </button>
      ))}
      </div>
    </div>
  );
}

function extractYouTubeId(url: string): string {
  const match = url.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
  );
  return match ? match[1] : "";
}
