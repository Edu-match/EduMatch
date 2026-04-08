"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Users,
  Clock,
  TrendingUp,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FORUM_ROOMS, type ForumRoom } from "@/lib/mock-forum";

// ─── 日時フォーマット ──────────────────────────────────────
function formatRelative(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "たった今";
  if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}日前`;
  return new Date(iso).toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
}

// ─── 部屋カード ───────────────────────────────────────────
function RoomCard({ room }: { room: ForumRoom }) {
  return (
    <Link href={`/forum/${room.id}`} className="group block">
      <Card className="h-full border transition-all duration-200 hover:border-primary/40 hover:shadow-md group-hover:shadow-primary/5">
        <CardContent className="flex h-full flex-col gap-4 p-5">
          {/* ヘッダー行 */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-3xl shrink-0" role="img" aria-label={room.name}>
                {room.emoji}
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-bold leading-tight group-hover:text-primary transition-colors">
                  {room.name}
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                  {room.description}
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-primary/60 mt-0.5" />
          </div>

          {/* 今週のお題 */}
          <div className="rounded-lg bg-primary/5 px-3.5 py-2.5 border border-primary/10">
            <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary/70">
              <Sparkles className="h-3 w-3" />
              今週のお題
            </p>
            <p className="text-xs font-medium leading-5 text-foreground line-clamp-2">
              {room.weeklyTopic}
            </p>
          </div>

          {/* 統計 */}
          <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" />
                {room.postCount.toLocaleString()} 投稿
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {room.participantCount} 人
              </span>
            </div>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatRelative(room.lastPostedAt)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ─── メインコンポーネント ─────────────────────────────────
type SortKey = "popular" | "newest";

export function ForumListClient() {
  const [sort, setSort] = useState<SortKey>("popular");

  const sortedRooms = useMemo<ForumRoom[]>(() => {
    const rooms = [...FORUM_ROOMS];
    if (sort === "popular") {
      return rooms.sort((a, b) => b.postCount - a.postCount);
    }
    return rooms.sort(
      (a, b) =>
        new Date(b.lastPostedAt).getTime() - new Date(a.lastPostedAt).getTime()
    );
  }, [sort]);

  const totalPosts = FORUM_ROOMS.reduce((s, r) => s + r.postCount, 0);
  const totalParticipants = FORUM_ROOMS.reduce(
    (s, r) => s + r.participantCount,
    0
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* ─── ヒーロー ─── */}
      <section className="relative overflow-hidden border-b bg-gradient-to-br from-primary/8 via-primary/4 to-background">
        <div className="container py-12 md:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-background/80 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
              <MessageSquare className="h-3.5 w-3.5 text-primary" />
              テーマ別フォーラム
            </div>
            <h1 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">
              AIUEO 井戸端会議
            </h1>
            <p className="mb-8 text-sm leading-7 text-muted-foreground">
              教育に関わるすべての人が、テーマ別の「部屋」でざっくばらんに語り合う場。
              <br className="hidden sm:block" />
              教員・専門家・保護者・企業、立場を超えてつながりましょう。
            </p>

            {/* 統計バッジ */}
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
              <span className="rounded-full border bg-background/80 px-4 py-2 backdrop-blur-sm">
                <strong>{FORUM_ROOMS.length}</strong> 部屋
              </span>
              <span className="rounded-full border bg-background/80 px-4 py-2 backdrop-blur-sm">
                投稿 <strong>{totalPosts.toLocaleString()}</strong> 件
              </span>
              <span className="rounded-full border bg-background/80 px-4 py-2 backdrop-blur-sm">
                参加者 <strong>{totalParticipants}</strong> 人
              </span>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute -top-20 -right-20 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-60 w-60 rounded-full bg-primary/5 blur-2xl" />
      </section>

      {/* ─── 部屋一覧 ─── */}
      <div className="container py-8">
        {/* ソートタブ */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {FORUM_ROOMS.length} つの部屋
          </p>
          <Tabs value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <TabsList className="h-8">
              <TabsTrigger value="popular" className="h-6 gap-1 px-3 text-xs">
                <TrendingUp className="h-3 w-3" />
                人気順
              </TabsTrigger>
              <TabsTrigger value="newest" className="h-6 gap-1 px-3 text-xs">
                <Clock className="h-3 w-3" />
                新着順
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* グリッド */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedRooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>

        {/* フッター案内 */}
        <div className="mt-10 rounded-xl border border-dashed bg-muted/20 px-6 py-8 text-center">
          <p className="text-sm font-medium">参加するには？</p>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            各部屋に入って「投稿する」ボタンから書き込めます。属性バッジ（教員・専門家など）を選ぶと、
            <br className="hidden sm:block" />
            誰がどんな立場で発言しているかが一目で分かります。匿名投稿も可能です。
          </p>
        </div>
      </div>
    </div>
  );
}
