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
  /** ブロック編集に戻ったときの空の初期ブロック（デフォルト: 空配列＝最初からブロックなし） */
  emptyBlocks?: ContentBlock[];
  /** onChange をデバウンスするミリ秒（0で即時。重い親コンポーネント向け） */
  debounceMs?: number;
  /** 保存前などに flush() を呼んで保留中の変更を即座に親に反映。戻り値はフラッシュした content（保留がなければ null） */
  editorRef?: React.MutableRefObject<{ flush: () => string | null } | null>;
};

export function ContentEditorWithImport({
  content,
  onChange,
  parseToBlocks,
  blocksToContent,
  maxLength,
  emptyBlocks = [],
  debounceMs = 0,
  editorRef,
}: Props) {
  const isImported = isImportedContent(content);
  const parsed = isImported ? parseImportedContent(content) : null;

  // ブロックを内部状態で保持。content→blocksの往復でブロックIDが失われたり、
  // 空ブロックが消えるバグを防ぐ
  const [blocks, setBlocks] = useState<ContentBlock[]>(() => {
    const parsed = parseToBlocks(content);
    return parsed.length > 0 ? parsed : [...emptyBlocks];
  });
  const isInternalUpdateRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingContentRef = useRef<string | null>(null);

  const flushPendingChange = useCallback((): string | null => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (pendingContentRef.current !== null) {
      const c = pendingContentRef.current;
      pendingContentRef.current = null;
      isInternalUpdateRef.current = true;
      onChange(c);
      return c;
    }
    return null;
  }, [onChange]);

  // editorRef と アンマウント時に保留中の変更を反映
  useEffect(() => {
    editorRef && (editorRef.current = { flush: flushPendingChange });
    return () => {
      editorRef && (editorRef.current = null);
      flushPendingChange();
    };
  }, [flushPendingChange, editorRef]);

  // contentが外部から変わったときのみパースして同期（自らのonChangeによる更新は無視）
  useEffect(() => {
    if (isImported) return;
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }
    const parsed = parseToBlocks(content);
    setBlocks(parsed.length > 0 ? parsed : [...emptyBlocks]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- content変化時のみ同期したい（parseToBlocksは毎回変わるため除外）
  }, [content, isImported]);

  const handleImport = (importedContent: string) => {
    onChange(importedContent);
  };

  const handleBackToBlocks = () => {
    const initialBlocks = [...emptyBlocks];
    setBlocks(initialBlocks);
    onChange(blocksToContent(initialBlocks));
  };

  const handleBlocksChange = useCallback(
    (blocks: ContentBlock[]) => {
      isInternalUpdateRef.current = true;
      setBlocks(blocks);
      const nextContent = blocksToContent(blocks);
      if (debounceMs > 0) {
        pendingContentRef.current = nextContent;
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
          debounceTimerRef.current = null;
          if (pendingContentRef.current !== null) {
            const toSend = pendingContentRef.current;
            pendingContentRef.current = null;
            isInternalUpdateRef.current = true;
            onChange(toSend);
          }
        }, debounceMs);
      } else {
        onChange(nextContent);
      }
    },
    [onChange, blocksToContent, debounceMs]
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
