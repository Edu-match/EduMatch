"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { FileImportButton } from "@/components/content/file-import-button";
import { ImportedContentRenderer } from "@/components/content/imported-content-renderer";
import { BlockEditor, type ContentBlock } from "@/components/editor/block-editor";
import {
  isImportedContent,
  parseImportedContent,
} from "@/lib/imported-content";
import { ArrowLeft, Trash2 } from "lucide-react";

export type ParseToBlocks = (content: string) => ContentBlock[];
export type BlocksToContent = (blocks: ContentBlock[]) => string;

type Props = {
  content: string;
  onChange: (content: string) => void;
  parseToBlocks: ParseToBlocks;
  blocksToContent: BlocksToContent;
  maxLength?: number;
  /** ブロック編集に戻ったときの空の初期ブロック */
  emptyBlocks?: ContentBlock[];
};

/** ブロック編集に戻ったときの初期ブロック（空でよい場合は []） */
const DEFAULT_EMPTY_BLOCKS: ContentBlock[] = [];

export function ContentEditorWithImport({
  content,
  onChange,
  parseToBlocks,
  blocksToContent,
  maxLength,
  emptyBlocks = DEFAULT_EMPTY_BLOCKS,
}: Props) {
  const isImported = isImportedContent(content);
  const parsed = isImported ? parseImportedContent(content) : null;

  const [blocks, setBlocks] = useState<ContentBlock[]>(() => {
    const parsed = parseToBlocks(content);
    return parsed.length > 0 ? parsed : [...emptyBlocks];
  });

  // 自分が親に送った最後の content を記録し、外部からの変更と区別する
  const lastSentContentRef = useRef<string>(content);

  useEffect(() => {
    if (isImported) return;
    // 自分が送った content と同じなら再パースしない（循環防止）
    if (content === lastSentContentRef.current) return;
    lastSentContentRef.current = content;
    const parsed = parseToBlocks(content);
    setBlocks(parsed.length > 0 ? parsed : [...emptyBlocks]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, isImported]);

  const handleImport = (importedContent: string) => {
    onChange(importedContent);
  };

  const handleBackToBlocks = () => {
    const initialBlocks = [...emptyBlocks];
    setBlocks(initialBlocks);
    const newContent = blocksToContent(initialBlocks);
    lastSentContentRef.current = newContent;
    onChange(newContent);
  };

  const handleBlocksChange = useCallback((newBlocks: ContentBlock[]) => {
    setBlocks(newBlocks);
    const newContent = blocksToContent(newBlocks);
    lastSentContentRef.current = newContent;
    onChange(newContent);
  }, [blocksToContent, onChange]);

  if (isImported && parsed) {
    return (
      <div className="space-y-4">
        {/* ページ上部: ファイルインポート + ブロック編集に戻る + 削除 */}
        <div className="flex items-center gap-2 flex-wrap">
          <FileImportButton onImport={handleImport} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBackToBlocks}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            ブロック編集に戻る
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBackToBlocks}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            削除
          </Button>
        </div>

        {/* インポート時はブロック追加UIは表示しない。プレビューのみ */}
        <div className="rounded-lg border bg-muted/20 p-4">
          <p className="text-xs text-muted-foreground mb-3">
            インポートしたコンテンツのプレビュー
          </p>
          <ImportedContentRenderer
            type={parsed.type}
            content={parsed.raw}
            className="min-h-[120px]"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ページ上部: ファイルインポートボタン */}
      <div className="flex items-center gap-2">
        <FileImportButton onImport={handleImport} />
      </div>

      {/* ブロックエディター */}
      <BlockEditor
        blocks={blocks}
        onChange={handleBlocksChange}
        maxLength={maxLength}
        showBulkPaste={true}
        autoConvertMarkdown={true}
      />
    </div>
  );
}
