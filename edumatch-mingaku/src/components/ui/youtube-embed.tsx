"use client";

interface YouTubeEmbedProps {
  url: string;
  title?: string;
}

/**
 * YouTubeのURLから動画IDを抽出する
 */
function extractVideoId(url: string): string | null {
  if (!url) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

export function YouTubeEmbed({ url, title = "YouTube video" }: YouTubeEmbedProps) {
  const videoId = extractVideoId(url);

  if (!videoId) {
    return null;
  }

  return (
    <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
}
