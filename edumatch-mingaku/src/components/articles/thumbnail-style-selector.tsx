"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  THUMBNAIL_STYLE_KINDS,
  THUMBNAIL_STYLE_META,
  resolveThumbnailStyle,
  type ThumbnailStyleKind,
  type ThumbnailTemplateKind,
} from "@/lib/thumbnail-template";
import { generateArticleThumbnailDataUrl } from "@/lib/article-thumbnail-canvas";

interface ThumbnailStyleSelectorProps {
  /** 選択中のスタイル（旧カテゴリ値も受け付け、対応スタイルとして表示） */
  value: ThumbnailTemplateKind;
  onChange: (style: ThumbnailStyleKind) => void;
  /** ライブプレビューに使うタイトル */
  title: string;
}

/**
 * 5 スタイルのビジュアル選択グリッド＋生成サムネイルのライブプレビュー
 */
export function ThumbnailStyleSelector({
  value,
  onChange,
  title,
}: ThumbnailStyleSelectorProps) {
  const selectedStyle = resolveThumbnailStyle(value);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const requestIdRef = useRef(0);

  // タイトル・スタイル変更時にデバウンスしてプレビューを再生成
  useEffect(() => {
    const t = title.trim();
    if (!t) {
      setPreviewUrl(null);
      setPreviewLoading(false);
      return;
    }
    const requestId = ++requestIdRef.current;
    setPreviewLoading(true);
    const timer = setTimeout(async () => {
      try {
        const url = await generateArticleThumbnailDataUrl({
          templateKind: selectedStyle,
          title: t,
        });
        if (requestIdRef.current === requestId) {
          setPreviewUrl(url);
        }
      } catch (e) {
        console.error("サムネイルプレビューの生成に失敗しました", e);
      } finally {
        if (requestIdRef.current === requestId) {
          setPreviewLoading(false);
        }
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [title, selectedStyle]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {THUMBNAIL_STYLE_KINDS.map((style) => {
          const meta = THUMBNAIL_STYLE_META[style];
          const selected = selectedStyle === style;
          return (
            <button
              key={style}
              type="button"
              onClick={() => onChange(style)}
              aria-pressed={selected}
              title={meta.description}
              className={`rounded-lg border-2 overflow-hidden p-1 transition-colors text-left flex flex-col gap-1 ${
                selected
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-transparent hover:border-muted-foreground/30"
              }`}
            >
              <div
                className="relative w-full aspect-video rounded-sm overflow-hidden flex items-center justify-center"
                style={{
                  background: meta.previewBackground,
                  backgroundSize:
                    style === "tech" ? "12px 12px, 12px 12px, auto" : undefined,
                }}
              >
                <span
                  className="text-[10px] font-bold leading-tight px-1 text-center"
                  style={{ color: meta.previewTextColor }}
                >
                  Aa
                </span>
              </div>
              <span className="text-[10px] block text-center leading-tight text-muted-foreground">
                {meta.label}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        {THUMBNAIL_STYLE_META[selectedStyle].label}：
        {THUMBNAIL_STYLE_META[selectedStyle].description}
      </p>

      {/* ライブプレビュー */}
      <div className="relative w-full aspect-[1200/630] rounded-lg overflow-hidden border bg-muted/30">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="サムネイルプレビュー"
            className="absolute inset-0 w-full h-full object-contain"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            {title.trim()
              ? "プレビューを生成中..."
              : "タイトルを入力するとプレビューが表示されます"}
          </div>
        )}
        {previewLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/40">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}
