"use client";

import { useState } from "react";
import { serviceThumbnailPlaceholder } from "@/lib/utils";

export function RankingServiceImage({
  src,
  alt,
}: {
  src: string | null;
  alt: string;
}) {
  const placeholder = serviceThumbnailPlaceholder(alt, 120, 68);
  const [imgSrc, setImgSrc] = useState<string>(src || placeholder);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imgSrc}
      alt={alt}
      onError={() => setImgSrc(placeholder)}
      className="w-20 h-[45px] flex-shrink-0 rounded-md border bg-muted object-contain"
    />
  );
}
