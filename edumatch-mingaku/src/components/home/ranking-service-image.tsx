"use client";

import { useState } from "react";

const PLACEHOLDER = "https://placehold.co/120x68/e0f2fe/0369a1?text=No+Image";

export function RankingServiceImage({
  src,
  alt,
}: {
  src: string | null;
  alt: string;
}) {
  const [imgSrc, setImgSrc] = useState<string>(src || PLACEHOLDER);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imgSrc}
      alt={alt}
      onError={() => setImgSrc(PLACEHOLDER)}
      className="w-20 h-[45px] flex-shrink-0 rounded-md border bg-muted object-contain"
    />
  );
}
