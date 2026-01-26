"use client";

import { useState, useCallback, useRef } from "react";
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
} from "lucide-react";

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
  | "numberedList";

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
};

export function BlockEditor({ blocks, onChange }: BlockEditorProps) {
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<number | null>(null);
  const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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
      onChange(blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)));
    },
    [blocks, onChange]
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

  const handleAddBlockClick = (index: number) => {
    setMenuPosition(index);
    setShowBlockMenu(true);
  };

  const renderBlockContent = (block: ContentBlock) => {
    switch (block.type) {
      case "heading1":
        return (
          <input
            type="text"
            value={block.content}
            onChange={(e) => updateBlock(block.id, { content: e.target.value })}
            placeholder="大見出しを入力..."
            className={`w-full bg-transparent text-4xl font-bold outline-none border-none text-${block.align}`}
            style={{ textAlign: block.align }}
          />
        );
      case "heading2":
        return (
          <input
            type="text"
            value={block.content}
            onChange={(e) => updateBlock(block.id, { content: e.target.value })}
            placeholder="中見出しを入力..."
            className={`w-full bg-transparent text-2xl font-bold outline-none border-none`}
            style={{ textAlign: block.align }}
          />
        );
      case "heading3":
        return (
          <input
            type="text"
            value={block.content}
            onChange={(e) => updateBlock(block.id, { content: e.target.value })}
            placeholder="小見出しを入力..."
            className={`w-full bg-transparent text-xl font-semibold outline-none border-none`}
            style={{ textAlign: block.align }}
          />
        );
      case "paragraph":
        return (
          <Textarea
            value={block.content}
            onChange={(e) => updateBlock(block.id, { content: e.target.value })}
            placeholder="本文を入力..."
            className={`w-full min-h-[100px] bg-transparent resize-none border-none shadow-none focus-visible:ring-0`}
            style={{ textAlign: block.align }}
          />
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
            <Textarea
              value={block.content}
              onChange={(e) => updateBlock(block.id, { content: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              placeholder="引用文を入力..."
              className="w-full min-h-[80px] bg-transparent resize-none border-none shadow-none focus-visible:ring-0 italic text-lg"
            />
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
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
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
            {/* Block move controls - shown on the right for active block */}
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
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Block type indicator & controls */}
            {activeBlockId === block.id && block.type !== "divider" && (
              <div className="flex items-center gap-2 mb-3 pb-3 border-b">
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  {blockTypeLabels[block.type]}
                </span>
                
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

                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => deleteBlock(block.id)}
                  className="text-destructive hover:text-destructive ml-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
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
