"use client";

import { ThumbnailOrTitle } from "@/components/ui/thumbnail-or-title";

export function RankingServiceImage({
  src,
  alt,
}: {
  src: string | null;
  alt: string;
}) {
  return (
    <div className="relative w-20 h-[45px] flex-shrink-0 rounded-md border bg-muted overflow-hidden aspect-video">
      <ThumbnailOrTitle
        src={src ?? undefined}
        title={alt}
        fill
        className="object-contain"
        unoptimized
      />
    </div>
  );
}
