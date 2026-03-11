"use client";

import { useState, useEffect, useRef, useCallback, useTransition } from "react";
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

const DEBOUNCE_MS = 200;

type Props = {
  content: string;
  onChange: (content: string) => void;
  parseToBlocks: ParseToBlocks;
  blocksToContent: BlocksToContent;
  maxLength?: number;
  /** ブロック編集に戻ったときの空の初期ブロック（デフォルト: 空配列＝最初からブロックなし） */
  emptyBlocks?: ContentBlock[];
  /** 保存時などに最新contentを参照するためのref（デバウンス中でも最新を取得可能） */
  latestContentRef?: React.MutableRefObject<string | null>;
};

export function ContentEditorWithImport({
  content,
  onChange,
  parseToBlocks,
  blocksToContent,
  maxLength,
  emptyBlocks = [],
  latestContentRef,
}: Props) {
  const isImported = isImportedContent(content);
  const parsed = isImported ? parseImportedContent(content) : null;
  const [, startTransition] = useTransition();

  // ブロックを内部状態で保持。content→blocksの往復でブロックIDが失われたり、
  // 空ブロックが消えるバグを防ぐ
  const [blocks, setBlocks] = useState<ContentBlock[]>(() => {
    const parsed = parseToBlocks(content);
    return parsed.length > 0 ? parsed : [...emptyBlocks];
  });
  const isInternalUpdateRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingBlocksRef = useRef<ContentBlock[] | null>(null);

  // contentが外部から変わったときのみパースして同期（自らのonChangeによる更新は無視）
  useEffect(() => {
    if (isImported) return;
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }
    const parsed = parseToBlocks(content);
    const nextBlocks = parsed.length > 0 ? parsed : [...emptyBlocks];
    setBlocks(nextBlocks);
    if (latestContentRef) latestContentRef.current = content;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- content変化時のみ同期したい（parseToBlocksは毎回変わるため除外）
  }, [content, isImported]);

  // アンマウント時に未反映の変更を親に渡す
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (pendingBlocksRef.current) {
        onChange(blocksToContent(pendingBlocksRef.current));
        pendingBlocksRef.current = null;
      }
    };
  }, [onChange, blocksToContent]);

  const handleImport = (importedContent: string) => {
    startTransition(() => {
      onChange(importedContent);
    });
  };

  const handleBackToBlocks = () => {
    const initialBlocks = [...emptyBlocks];
    setBlocks(initialBlocks);
    startTransition(() => {
      onChange(blocksToContent(initialBlocks));
    });
  };

  const handleBlocksChange = useCallback(
    (newBlocks: ContentBlock[]) => {
      isInternalUpdateRef.current = true;
      setBlocks(newBlocks);
      pendingBlocksRef.current = newBlocks;
      const latestContent = blocksToContent(newBlocks);
      if (latestContentRef) latestContentRef.current = latestContent;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        pendingBlocksRef.current = null;
        isInternalUpdateRef.current = true;
        startTransition(() => {
          onChange(latestContent);
        });
      }, DEBOUNCE_MS);
    },
    [onChange, blocksToContent, startTransition, latestContentRef]
  );

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
