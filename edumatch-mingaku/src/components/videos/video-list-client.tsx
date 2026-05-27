"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, MessageSquare, PlayCircle, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RelativeTime } from "@/components/community/relative-time";
import { youtubeThumbnailUrl } from "@/lib/youtube";

type VideoListItem = {
  id: string;
  title: string;
  description: string;
  youtubeUrl: string;
  youtubeId: string;
  aiSummary: string | null;
  isPublished: boolean;
  createdAt: string;
  commentCount: number;
};

export function VideoListClient() {
  const [videos, setVideos] = useState<VideoListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/videos", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`status ${r.status}`))))
      .then((data) => {
        if (cancelled) return;
        setVideos(data.videos ?? []);
      })
      .catch((e) => {
        if (cancelled) return;
        console.error(e);
        setError("動画の取得に失敗しました。");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PlayCircle className="h-6 w-6 text-primary" />
          動画
        </h1>
        <p className="text-sm text-muted-foreground">
          運営が厳選した教育関連の動画を、AI要約・コメント付きで閲覧できます。
        </p>
      </header>

      {loading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          読み込み中…
        </div>
      )}

      {error && !loading && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {!loading && !error && videos.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            まだ動画が投稿されていません。
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map((v) => (
          <Link key={v.id} href={`/videos/${v.id}`} className="group block">
            <Card className="overflow-hidden transition-all hover:border-primary/40 hover:shadow-md py-0">
              <div className="relative aspect-video bg-muted overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={youtubeThumbnailUrl(v.youtubeId)}
                  alt={v.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/30 transition-opacity">
                  <PlayCircle className="h-14 w-14 text-white drop-shadow" />
                </div>
              </div>
              <CardContent className="p-4 space-y-2">
                <h2 className="font-semibold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                  {v.title}
                </h2>
                {v.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{v.description}</p>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <RelativeTime iso={v.createdAt} />
                  <div className="flex items-center gap-2">
                    {v.aiSummary && (
                      <Badge variant="secondary" className="gap-1">
                        <Sparkles className="h-3 w-3" />
                        AI要約
                      </Badge>
                    )}
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {v.commentCount}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
