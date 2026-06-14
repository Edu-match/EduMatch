"use client";

import { youtubeEmbedUrl } from "@/lib/youtube";

interface VideoPlayerProps {
  youtubeId: string;
  title?: string;
}

export function VideoPlayer({ youtubeId, title = "動画" }: VideoPlayerProps) {
  if (!youtubeId) return null;
  return (
    <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted shadow-sm">
      <iframe
        src={youtubeEmbedUrl(youtubeId)}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
}
