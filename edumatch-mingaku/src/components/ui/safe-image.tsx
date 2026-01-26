"use client";

import Image, { ImageProps } from "next/image";
import { useState } from "react";
import { ImageOff } from "lucide-react";

interface SafeImageProps extends Omit<ImageProps, "onError"> {
  fallbackSrc?: string;
  fallbackClassName?: string;
}

/**
 * 画像読み込みエラー時にフォールバック表示するImageコンポーネント
 */
export function SafeImage({
  src,
  alt,
  fallbackSrc = "https://placehold.co/400x300/e5e7eb/9ca3af?text=No+Image",
  fallbackClassName,
  className,
  ...props
}: SafeImageProps) {
  const [error, setError] = useState(false);
  const [imageSrc, setImageSrc] = useState(src);

  const handleError = () => {
    if (!error) {
      setError(true);
      if (fallbackSrc) {
        setImageSrc(fallbackSrc);
      }
    }
  };

  // srcが空またはnullの場合はフォールバック
  if (!src) {
    return (
      <div
        className={`flex items-center justify-center bg-muted ${fallbackClassName || className}`}
      >
        <ImageOff className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <Image
      src={imageSrc}
      alt={alt}
      className={className}
      onError={handleError}
      unoptimized
      {...props}
    />
  );
}
