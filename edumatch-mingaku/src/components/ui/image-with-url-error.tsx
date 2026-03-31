"use client";

import type React from "react";
import Image, { type ImageProps } from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  getImageUrlValidationMessage,
  toImageSrcForDisplay,
  IMAGE_LOAD_FAILED_USER_MESSAGE,
} from "@/lib/image-url-utils";

const BASE_ERROR =
  "flex items-center justify-center bg-destructive/10 text-destructive text-sm leading-relaxed px-4 py-4 text-center border border-destructive/20 rounded-lg";

export type ImageWithUrlErrorProps = {
  /** ユーザーが保存・入力した元URL（検証用） */
  originalSrc: string;
  errorBoxClassName?: string;
  /** 検証エラー・読み込み失敗時にエラー枠の代わりに表示（例: サムネイルのタイトルフォールバック） */
  errorFallback?: React.ReactNode;
} & Omit<ImageProps, "src" | "onError">;

/**
 * Google Drive / GitHub / アップロード以外のURLは画像枠内にエラー表示。
 * 共有などで読み込み失敗時も枠内に案内を表示。
 */
export function ImageWithUrlError({
  originalSrc,
  alt,
  errorBoxClassName = "",
  errorFallback,
  fill,
  className,
  unoptimized = true,
  ...imageRest
}: ImageWithUrlErrorProps) {
  const validationMsg = useMemo(
    () => getImageUrlValidationMessage(originalSrc),
    [originalSrc]
  );
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setLoadError(false);
  }, [originalSrc]);

  const errorBox = (message: string) => (
    <div
      className={`${BASE_ERROR} ${fill ? "absolute inset-0 z-0" : "w-full min-h-[120px]"} ${errorBoxClassName}`}
      role="alert"
    >
      {message}
    </div>
  );

  if (validationMsg) {
    if (errorFallback !== undefined) return <>{errorFallback}</>;
    return errorBox(validationMsg);
  }

  const displaySrc = toImageSrcForDisplay(originalSrc);

  if (loadError) {
    if (errorFallback !== undefined) return <>{errorFallback}</>;
    return errorBox(IMAGE_LOAD_FAILED_USER_MESSAGE);
  }

  return (
    <Image
      {...imageRest}
      src={displaySrc}
      alt={alt}
      fill={fill}
      unoptimized={unoptimized}
      className={className}
      onError={() => setLoadError(true)}
    />
  );
}
