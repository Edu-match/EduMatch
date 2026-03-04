"use client";

import { Button } from "@/components/ui/button";
import { FileImportButton } from "@/components/content/file-import-button";
import { ImportedContentRenderer } from "@/components/content/imported-content-renderer";
import { BlockEditor, type ContentBlock } from "@/components/editor/block-editor";
import {
  isImportedContent,
  parseImportedContent,
} from "@/lib/imported-content";
import { ArrowLeft } from "lucide-react";

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

const DEFAULT_EMPTY_BLOCKS: ContentBlock[] = [
  { id: "init", type: "paragraph", content: "" },
];

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

  const handleImport = (importedContent: string) => {
    onChange(importedContent);
  };

  const handleBackToBlocks = () => {
    onChange(blocksToContent(emptyBlocks));
  };

  const handleBlocksChange = (blocks: ContentBlock[]) => {
    onChange(blocksToContent(blocks));
  };

  if (isImported && parsed) {
    return (
      <div className="space-y-4">
        {/* ページ上部: ファイルインポート + ブロック編集に戻る */}
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

  const blocks = parseToBlocks(content);
  const displayBlocks =
    blocks.length > 0 ? blocks : emptyBlocks;

  return (
    <div className="space-y-4">
      {/* ページ上部: ファイルインポートボタン */}
      <div className="flex items-center gap-2">
        <FileImportButton onImport={handleImport} />
      </div>

      {/* ブロックエディター */}
      <BlockEditor
        blocks={displayBlocks}
        onChange={handleBlocksChange}
        maxLength={maxLength}
        showBulkPaste={true}
        autoConvertMarkdown={true}
      />
    </div>
  );
}
