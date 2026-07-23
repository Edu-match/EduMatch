"use client";

import { ArrowRight, ChevronLeft, Link2, MessageSquare, Sparkles } from "lucide-react";
import Link from "next/link";
import type { VideoVisibility } from "@prisma/client";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RelativeTime } from "@/components/community/relative-time";
import { VideoPlayer } from "@/components/videos/video-player";
import { VIDEO_VISIBILITY_LABELS } from "@/lib/video-visibility";

export type VideoDetail = {
  id: string;
  title: string;
  description: string;
  youtubeUrl: string;
  youtubeId: string;
  aiSummary: string | null;
  visibility: VideoVisibility;
  createdAt: string;
};

interface Props {
  video: VideoDetail;
  forumHref?: string;
}

export function VideoDetailClient({ video, forumHref = "/forum" }: Props) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div>
        <Link
          href="/videos"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          学びの動画一覧に戻る
        </Link>
      </div>

      <VideoPlayer youtubeId={video.youtubeId} title={video.title} />

      <div className="space-y-2">
        <div className="flex items-start gap-2 flex-wrap">
          <h1 className="text-2xl font-bold leading-tight">{video.title}</h1>
          {video.visibility === "UNLISTED" && (
            <Badge variant="secondary" className="gap-1">
              <Link2 className="h-3 w-3" />
              {VIDEO_VISIBILITY_LABELS.UNLISTED}
            </Badge>
          )}
          {video.visibility === "PRIVATE" && (
            <Badge variant="outline">{VIDEO_VISIBILITY_LABELS.PRIVATE}</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          投稿日: <RelativeTime iso={video.createdAt} />
        </p>
      </div>

      {video.aiSummary && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Sparkles className="h-4 w-4" />
              AIによる要約
            </div>
            <div className="text-sm prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                {video.aiSummary}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {video.description && (
        <Card>
          <CardContent className="p-4">
            <h2 className="text-sm font-bold mb-2">説明</h2>
            <p className="text-sm whitespace-pre-wrap break-words">{video.description}</p>
          </CardContent>
        </Card>
      )}

      {/* 教育のひろばへの動線：動画の話題は教育のひろばでじっくり語り合う */}
      <Link
        href={forumHref}
        className="group block rounded-xl border border-primary/30 bg-primary/5 p-4 transition-colors hover:border-primary/50 hover:bg-primary/10"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground">
              この動画の話題を教育のひろばで語り合おう
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              教育のテーマごとに部屋があります。動画で学んだことを、みんなと深掘りできます。
            </p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
        </div>
      </Link>
    </div>
  );
}
