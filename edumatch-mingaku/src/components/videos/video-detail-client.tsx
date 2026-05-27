"use client";

import { ChevronLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { Card, CardContent } from "@/components/ui/card";
import { RelativeTime } from "@/components/community/relative-time";
import { VideoPlayer } from "@/components/videos/video-player";
import { VideoCommentSection } from "@/components/videos/video-comment-section";

export type VideoDetail = {
  id: string;
  title: string;
  description: string;
  youtubeUrl: string;
  youtubeId: string;
  aiSummary: string | null;
  isPublished: boolean;
  createdAt: string;
};

interface Props {
  video: VideoDetail;
}

export function VideoDetailClient({ video }: Props) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div>
        <Link
          href="/videos"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          動画一覧に戻る
        </Link>
      </div>

      <VideoPlayer youtubeId={video.youtubeId} title={video.title} />

      <div className="space-y-2">
        <h1 className="text-2xl font-bold leading-tight">{video.title}</h1>
        <p className="text-xs text-muted-foreground">
          投稿日: <RelativeTime iso={video.createdAt} />
          {!video.isPublished && (
            <span className="ml-2 inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold">
              非公開
            </span>
          )}
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

      <VideoCommentSection videoId={video.id} />
    </div>
  );
}
