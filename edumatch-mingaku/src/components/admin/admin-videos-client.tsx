"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { VideoVisibility } from "@prisma/client";
import { Loader2, Plus, Video as VideoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VideoForm, type VideoFormValue } from "@/components/admin/video-form";
import { RelativeTime } from "@/components/community/relative-time";
import { youtubeThumbnailUrl } from "@/lib/youtube";
import { VIDEO_VISIBILITY_LABELS } from "@/lib/video-visibility";

type AdminVideoItem = {
  id: string;
  title: string;
  description: string;
  youtubeUrl: string;
  youtubeId: string;
  aiSummary: string | null;
  visibility: VideoVisibility;
  createdAt: string;
  updatedAt: string;
};

const EMPTY_FORM: VideoFormValue = {
  title: "",
  description: "",
  youtubeUrl: "",
  visibility: "PRIVATE",
  aiSummary: null,
};

function visibilityBadgeVariant(visibility: VideoVisibility) {
  if (visibility === "PUBLIC") return "default" as const;
  if (visibility === "UNLISTED") return "secondary" as const;
  return "outline" as const;
}

export function AdminVideosClient() {
  const [videos, setVideos] = useState<AdminVideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/videos?includeAll=true", {
        credentials: "include",
      });
      const data = await res.json();
      setVideos(data.videos ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const editingVideo = editingId ? videos.find((v) => v.id === editingId) : null;
  const editingForm: VideoFormValue | null = editingVideo
    ? {
        id: editingVideo.id,
        title: editingVideo.title,
        description: editingVideo.description,
        youtubeUrl: editingVideo.youtubeUrl,
        visibility: editingVideo.visibility,
        aiSummary: editingVideo.aiSummary,
      }
    : null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <VideoIcon className="h-6 w-6 text-primary" />
          学びの動画を管理
        </h1>
        {!creating && !editingId && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            新規動画を投稿
          </Button>
        )}
      </header>

      {creating && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-muted-foreground">新規動画</h2>
          <VideoForm
            initial={EMPTY_FORM}
            onSaved={(saved) => {
              setCreating(false);
              setEditingId(saved.id);
              void reload();
            }}
          />
          <div>
            <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>
              キャンセル
            </Button>
          </div>
        </section>
      )}

      {editingForm && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-muted-foreground">編集中: {editingForm.title}</h2>
          <VideoForm
            initial={editingForm}
            onSaved={() => {
              void reload();
            }}
            onDeleted={() => {
              setEditingId(null);
              void reload();
            }}
          />
          <div>
            <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
              編集を終了
            </Button>
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-muted-foreground">動画一覧</h2>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            読み込み中…
          </div>
        ) : videos.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              まだ動画はありません。
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-2">
            {videos.map((v) => (
              <li key={v.id}>
                <Card>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-32 aspect-video rounded overflow-hidden bg-muted shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={youtubeThumbnailUrl(v.youtubeId)}
                        alt={v.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{v.title}</h3>
                        <Badge variant={visibilityBadgeVariant(v.visibility)}>
                          {VIDEO_VISIBILITY_LABELS[v.visibility]}
                        </Badge>
                        {v.aiSummary && (
                          <Badge variant="outline" className="text-xs">AI要約あり</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {v.description || "（説明なし）"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        作成: <RelativeTime iso={v.createdAt} /> / 更新: <RelativeTime iso={v.updatedAt} />
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingId(v.id)}
                      >
                        編集
                      </Button>
                      <Link
                        href={`/videos/${v.id}`}
                        className="text-xs text-primary hover:underline"
                        prefetch={false}
                      >
                        プレビュー
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
