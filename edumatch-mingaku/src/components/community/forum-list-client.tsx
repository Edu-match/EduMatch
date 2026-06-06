"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  Bot,
  LayoutGrid,
  LayoutList,
  Loader2,
  MessageSquare,
  Search,
  Clock,
  Filter,
  Flame,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OpenAiChatButton } from "@/components/ui/open-ai-chat-button";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ForumRoom } from "@/lib/mock-forum";
import { RelativeTime } from "@/components/community/relative-time";
import { ForumRoomIcon, ROOM_BG_COLORS } from "@/components/community/forum-room-icon";
import { ForumCategoryExplorer } from "@/components/community/forum-category-explorer";

type SortKey = "popular" | "newest" | "participants";
type CategoryKey = "all" | "innovation" | "practice" | "management";
type ViewMode = "bubble" | "list";

const ROOM_CATEGORIES: Record<string, CategoryKey[]> = {
  "ai-lesson":        ["innovation", "practice"],
  "giga-school":      ["innovation", "management"],
  "diverse-learning": ["practice"],
  "teacher-work":     ["management", "practice"],
  "education-gap":    ["innovation", "management"],
  "ai-literacy":      ["innovation", "practice"],
  // 旧ルームID 後方互換
  "ai-dx":    ["innovation", "practice"],
  steam:      ["innovation", "practice"],
  management: ["management"],
  policy:     ["management"],
  diversity:  ["practice"],
  global:     ["practice"],
};

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  all:        "すべて",
  innovation: "AI・テクノロジー",
  practice:   "現場実践",
  management: "制度・運営",
};

function getRoomScore(room: ForumRoom) {
  return room.postCount * 1.5 + room.participantCount * 2;
}

// ─── リスト用ルームカード ─────────────────────────────────

function RoomCard({ room, isFeatured }: { room: ForumRoom; isFeatured?: boolean }) {
  const roomCategories = ROOM_CATEGORIES[room.id] ?? [];

  return (
    <Link href={`/forum/${room.id}`} className="group block">
      <Card className={[
        "h-full border transition-all duration-200 hover:border-primary/40 hover:shadow-md",
        isFeatured ? "border-primary/30 bg-primary/5" : "",
      ].join(" ")}>
        <CardContent className="flex h-full flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`shrink-0 rounded-xl border p-2 ${ROOM_BG_COLORS[room.id] ?? "bg-muted border-border"}`}>
                <ForumRoomIcon roomId={room.id} size={28} />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold leading-tight group-hover:text-primary transition-colors">
                  {room.name}
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                  {room.description}
                </p>
              </div>
            </div>
            <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary/60" />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {roomCategories.map((category) => (
              <Badge key={category} variant="secondary" className="text-[10px]">
                {CATEGORY_LABELS[category]}
              </Badge>
            ))}
            {isFeatured && (
              <Badge className="bg-amber-500/90 text-amber-50 hover:bg-amber-500">注目</Badge>
            )}
            {room.aiDiscussion && (
              <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                <Zap className="h-2.5 w-2.5" />AIディスカッション
              </span>
            )}
          </div>

          {room.description ? (
            <p className="text-xs text-muted-foreground line-clamp-2">{room.description}</p>
          ) : null}

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
              <RelativeTime iso={room.lastPostedAt} />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ─── メインコンポーネント ─────────────────────────────────

export function ForumListClient() {
  const searchParams = useSearchParams();
  const catParam = searchParams.get("cat") ?? undefined;
  const [sort, setSort] = useState<SortKey>("popular");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryKey>("all");
  const [activeOnly, setActiveOnly] = useState(false);
  const [rooms, setRooms] = useState<ForumRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (catParam) return "bubble";
    if (typeof window === "undefined") return "bubble";
    const saved = localStorage.getItem("forum_view_mode") as ViewMode | null;
    return saved === "list" || saved === "bubble" ? saved : "bubble";
  });

  const switchView = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem("forum_view_mode", mode);
  };

  // ?cat= で遷移してきたときはマップビューを表示
  useEffect(() => {
    if (catParam) setViewMode("bubble");
  }, [catParam]);

  // 部屋一覧取得
  useEffect(() => {
    let cancelled = false;
    fetch("/api/forum/rooms", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => { if (!cancelled && data.rooms) setRooms(data.rooms); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filteredRooms = useMemo<ForumRoom[]>(() => {
    const q = query.trim().toLowerCase();
    return rooms.filter((room) => {
      const inCategory = category === "all" || (ROOM_CATEGORIES[room.id] ?? []).includes(category);
      const inSearch = !q || room.name.toLowerCase().includes(q) || room.description.toLowerCase().includes(q);
      const inActivity = activeOnly ? room.postCount >= 5 : true;
      return inCategory && inSearch && inActivity;
    });
  }, [rooms, category, query, activeOnly]);

  const sortedRooms = useMemo<ForumRoom[]>(() => {
    const list = [...filteredRooms];
    if (sort === "popular")      return list.sort((a, b) => b.postCount - a.postCount);
    if (sort === "participants") return list.sort((a, b) => b.participantCount - a.participantCount);
    return list.sort((a, b) => new Date(b.lastPostedAt).getTime() - new Date(a.lastPostedAt).getTime());
  }, [filteredRooms, sort]);

  const totalPosts = rooms.reduce((s, r) => s + r.postCount, 0);
  const totalParticipants = rooms.reduce((s, r) => s + r.participantCount, 0);
  const featuredRooms = [...rooms].sort((a, b) => getRoomScore(b) - getRoomScore(a)).slice(0, 2);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">

      {/* ─── タイトルバー ─── */}
      <div className="border-b bg-background/80 backdrop-blur-sm" data-tutorial="forum-hero-section">
        <div className="container flex items-center gap-3 py-4">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold tracking-tight">井戸端会議</h1>
          <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
            <span><strong className="text-foreground">{rooms.length}</strong> 部屋</span>
            <span>投稿 <strong className="text-foreground">{totalPosts.toLocaleString()}</strong> 件</span>
          </div>
        </div>
      </div>

      {/* ─── コンテンツエリア ─── */}
      <div id="forum-rooms" className="container space-y-6 py-8">

        {/* ビュー切り替え（共通） */}
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-1 rounded-lg border bg-background p-1 shadow-xs" data-tutorial="forum-view-mode">
            <button
              type="button"
              title="トピックマップ"
              aria-label="トピックマップ表示に切り替え"
              aria-pressed={viewMode === "bubble"}
              onClick={() => switchView("bubble")}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
                viewMode === "bubble"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">マップ</span>
            </button>
            <button
              type="button"
              title="リスト"
              aria-label="リスト表示に切り替え"
              aria-pressed={viewMode === "list"}
              onClick={() => switchView("list")}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
                viewMode === "list"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <LayoutList className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">リスト</span>
            </button>
          </div>
        </div>

        {/* リストビュー時のみ：検索 + フィルター + ソート */}
        {viewMode === "list" && (
          <Card>
            <CardContent className="p-4 sm:p-5">
              <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                <div className="space-y-3">
                  <div className="relative" data-tutorial="forum-search">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="pl-9"
                      placeholder="部屋名・説明・今週のお題で検索"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2" data-tutorial="forum-category-filter">
                    {(Object.entries(CATEGORY_LABELS) as [CategoryKey, string][]).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setCategory(key)}
                        className={[
                          "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                          category === key
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background hover:border-primary/40",
                        ].join(" ")}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Tabs value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                    <TabsList className="h-8">
                      <TabsTrigger value="popular" className="h-6 gap-1 px-3 text-xs">
                        <TrendingUp className="h-3 w-3" />人気順
                      </TabsTrigger>
                      <TabsTrigger value="newest" className="h-6 gap-1 px-3 text-xs">
                        <Clock className="h-3 w-3" />新着順
                      </TabsTrigger>
                      <TabsTrigger value="participants" className="h-6 gap-1 px-3 text-xs">
                        <Users className="h-3 w-3" />参加者順
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <Button type="button" size="sm" variant={activeOnly ? "default" : "outline"}
                    onClick={() => setActiveOnly((v) => !v)} className="gap-1.5">
                    {activeOnly ? <Flame className="h-3.5 w-3.5" /> : <Filter className="h-3.5 w-3.5" />}
                    活発な部屋
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div data-tutorial="forum-room-list">
            {/* ─── マップビュー（大カテゴリ → サブカテゴリ） ─── */}
            {viewMode === "bubble" && (
              <section aria-label="カテゴリマップ">
                <ForumCategoryExplorer initialCategorySlug={catParam} />
              </section>
            )}

            {/* ─── リストビュー ─── */}
            {viewMode === "list" && (
              <>
                {featuredRooms.length > 0 && sortedRooms.length === rooms.length && (
                  <section>
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h2 className="text-base font-semibold">注目ルーム</h2>
                      <p className="text-xs text-muted-foreground">投稿数・参加者数で自動ピックアップ</p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {featuredRooms.map((room) => <RoomCard key={room.id} room={room} isFeatured />)}
                    </div>
                  </section>
                )}

                <section>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold">すべての部屋</h2>
                      <p className="text-xs text-muted-foreground">
                        {sortedRooms.length} / {rooms.length} 件
                      </p>
                    </div>
                  </div>

                  {sortedRooms.length === 0 ? (
                    <div className="rounded-xl border border-dashed bg-muted/20 px-6 py-12 text-center">
                      <p className="text-sm font-medium">該当する部屋が見つかりませんでした</p>
                      <p className="mt-1 text-xs text-muted-foreground">キーワードやカテゴリを変更してください</p>
                      <div className="mt-4 flex justify-center">
                        <Button size="sm" variant="outline" onClick={() => { setQuery(""); setCategory("all"); setActiveOnly(false); }}>
                          条件をリセット
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {sortedRooms.map((room) => <RoomCard key={room.id} room={room} />)}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        )}

        {/* ─── はじめての方へ ─── */}
        <div className="rounded-xl border border-dashed bg-muted/20 px-6 py-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">はじめて参加する方へ</p>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">
                部屋に入って「投稿する」ボタンから書き込めます。属性バッジ（教員・専門家など）を選ぶと
                立場が伝わります。匿名投稿も可能です。
              </p>
            </div>
            <Button asChild size="sm">
              <Link href={rooms[0] ? `/forum/${rooms[0].id}` : "/forum"}>
                今すぐ参加
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* ─── AIに相談する ─── */}
        <div
          className="rounded-xl border border-dashed bg-muted/20 px-6 py-8"
          data-tutorial="forum-ai-help"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium flex items-center gap-2">
                <Bot className="h-4 w-4" />
                AIに相談してみよう
              </p>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">
                教育に関する疑問や相談があれば、AIナビゲーターに質問できます。わからないことはAIにサポートしてもらいましょう。
              </p>
            </div>
            <OpenAiChatButton
              className="h-9 px-3 text-xs"
              preferredMode="navigator"
              launchContext="forum-compose"
            >
              AIに聞いてみる
            </OpenAiChatButton>
          </div>
        </div>
      </div>
    </div>
  );
}
