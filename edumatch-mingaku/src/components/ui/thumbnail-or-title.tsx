"use client";

import Image, { ImageProps } from "next/image";

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

  if (src) {
    return (
      <Image
        src={src}
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

  // 画像なし: タイトルをテキストで表示（日本語対応）
  const fillClass = fill ? "absolute inset-0" : "";
  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 text-foreground overflow-hidden ${fillClass} ${className}`}
      aria-label={effectiveAlt}
    >
      <span className="font-semibold text-center line-clamp-4 px-3 py-2 break-words [word-break:break-word] text-sm">
        {title}
      </span>
    </div>
  );
}
