"use client";

import Image, { ImageProps } from "next/image";
import { normalizeImageUrl } from "@/lib/image-url-utils";

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
 * Google Drive / GitHub のURLは表示用に正規化される。
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
  const displaySrc = src ? normalizeImageUrl(src) : undefined;

  if (displaySrc) {
    return (
      <Image
        src={displaySrc}
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

  // 画像なし: タイトルをテキストで表示（日本語対応）。背景は明るい青（従来の placehold に近い）
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
