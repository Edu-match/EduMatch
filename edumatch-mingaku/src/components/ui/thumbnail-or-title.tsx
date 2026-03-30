"use client";

import { ImageProps } from "next/image";
import { ImageWithUrlError } from "@/components/ui/image-with-url-error";

type ThumbnailOrTitleProps = Omit<ImageProps, "src" | "alt"> & {
  /** 画像URL。未設定の場合は title をテキストで表示 */
  src: string | null | undefined;
  /** 画像の代替テキスト。未設定時・画像なし時に表示するタイトル（日本語対応） */
  title: string;
  alt?: string;
};

/**
 * サムネイル画像がある場合は表示、ない場合はタイトルをテキストで表示。
 * 日本語タイトルもそのまま表示される（placehold.co の ??? を避けるため）。
 * Google Drive はプロキシ経由。未対応URL・読み込み失敗時は枠内に案内を表示。
 */
export function ThumbnailOrTitle({
  src,
  title,
  alt,
  className = "",
  fill,
  sizes,
  priority,
  unoptimized,
  ...rest
}: ThumbnailOrTitleProps) {
  const effectiveAlt = alt ?? title;

  if (src?.trim()) {
    return (
      <ImageWithUrlError
        originalSrc={src}
        alt={effectiveAlt}
        fill={fill}
        sizes={sizes}
        priority={priority}
        unoptimized={unoptimized}
        className={className}
        {...rest}
      />
    );
  }

  const fillClass = fill ? "absolute inset-0" : "";
  return (
    <div
      className={`flex items-center justify-center bg-sky-100 overflow-hidden ${fillClass} ${className}`}
      aria-label={effectiveAlt}
    >
      <span className="font-semibold text-center text-sky-700 line-clamp-4 px-3 py-2 break-words [word-break:break-word] text-sm sm:text-base">
        {title}
      </span>
    </div>
  );
}
