"use client";

import { ImageProps } from "next/image";
import { ImageWithUrlError } from "@/components/ui/image-with-url-error";
import { getImageUrlValidationMessage } from "@/lib/image-url-utils";

type ThumbnailOrTitleProps = Omit<ImageProps, "src" | "alt"> & {
  /** 画像URL。未設定の場合は title をテキストで表示 */
  src: string | null | undefined;
  /** 画像の代替テキスト。未設定時・画像なし時に表示するタイトル（日本語対応） */
  title: string;
  alt?: string;
};

function TitleOnSkyBackground({
  title,
  effectiveAlt,
  fill,
  className = "",
}: {
  title: string;
  effectiveAlt: string;
  fill?: boolean;
  className?: string;
}) {
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

/**
 * サムネイル画像がある場合は表示、ない・または表示できないURLの場合は水色背景にタイトルを表示。
 * 日本語タイトルもそのまま表示される（外部プレースホルダ画像に頼らない）。
 * Google Drive はプロキシ経由。
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
  const trimmed = src?.trim() ?? "";

  const titleFallback = (
    <TitleOnSkyBackground
      title={title}
      effectiveAlt={effectiveAlt}
      fill={fill}
      className={className}
    />
  );

  if (!trimmed || getImageUrlValidationMessage(trimmed)) {
    return titleFallback;
  }

  return (
    <ImageWithUrlError
      originalSrc={trimmed}
      alt={effectiveAlt}
      fill={fill}
      sizes={sizes}
      priority={priority}
      unoptimized={unoptimized}
      className={className}
      errorFallback={titleFallback}
      {...rest}
    />
  );
}
