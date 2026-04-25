"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Bot,
  Compass,
  MessageSquare,
  Search,
  Users,
  Clock,
  TrendingUp,
  Sparkles,
  Filter,
  Plus,
  Save,
  Flame,
  Zap,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { ForumRoom } from "@/lib/mock-forum";
import { RelativeTime } from "@/components/community/relative-time";
import { ForumRoomIcon, ROOM_BG_COLORS } from "@/components/community/forum-room-icon";

type SortKey = "popular" | "newest" | "participants";
type CategoryKey = "all" | "innovation" | "practice" | "management" | "global";

const ROOM_CATEGORIES: Record<string, CategoryKey[]> = {
  "ai-dx": ["innovation", "practice"],
  steam: ["innovation", "practice"],
  management: ["management"],
  policy: ["management"],
  diversity: ["practice"],
  global: ["global", "practice"],
};

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  all: "すべて",
  innovation: "AI・探究",
  practice: "現場実践",
  management: "制度・運営",
  global: "国際",
};

function getRoomScore(room: ForumRoom) {
  return room.postCount * 1.5 + room.participantCount * 2;
}

function RoomCard({ room, isFeatured }: { room: ForumRoom; isFeatured?: boolean }) {
  const roomCategories = ROOM_CATEGORIES[room.id] ?? [];

  return (
    <Link href={`/forum/${room.id}`} className="group block">
      <Card
        className={[
          "h-full border transition-all duration-200 hover:border-primary/40 hover:shadow-md group-hover:shadow-primary/5",
          isFeatured ? "border-primary/30 bg-primary/5" : "",
        ].join(" ")}
      >
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
              <RelativeTime iso={room.lastPostedAt} />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ─── 新規ルーム作成ダイアログ ─────────────────────────────

type NewRoomDraft = { name: string; description: string; weeklyTopic: string; aiDiscussion: boolean };

function CreateRoomDialog({
  onCreated,
  hero = false,
}: {
  onCreated: (room: ForumRoom) => void;
  /** ヒーロー内では大きめ・文言を強調 */
  hero?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<NewRoomDraft>({ name: "", description: "", weeklyTopic: "", aiDiscussion: false });

  const isValid = draft.name.trim() && draft.weeklyTopic.trim();

  const handleCreate = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/forum/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: draft.name.trim(),
          description: draft.description.trim(),
          weeklyTopic: draft.weeklyTopic.trim(),
          aiDiscussion: draft.aiDiscussion,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onCreated(data.room as ForumRoom);
        setDraft({ name: "", description: "", weeklyTopic: "", aiDiscussion: false });
        setOpen(false);
      } else {
        console.error("部屋作成に失敗しました", await res.text());
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size={hero ? "lg" : "sm"}
          variant={hero ? "default" : "outline"}
          className={cn(
            hero
              ? "min-h-11 gap-2 px-6 text-base font-semibold shadow-sm"
              : "gap-1.5"
          )}
        >
          <Plus className={hero ? "h-5 w-5" : "h-4 w-4"} />
          {hero ? "新しい部屋を作成" : "部屋を作成"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>新しい部屋を作成</DialogTitle>
          <DialogDescription>フォーラムに新しいテーマ部屋を追加します</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>部屋名 <span className="text-destructive">*</span></Label>
            <Input
              value={draft.name}
              onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
              placeholder="例: 保護者・家庭教育"
            />
          </div>
          <div className="space-y-1.5">
            <Label>説明文</Label>
            <Textarea
              rows={2}
              value={draft.description}
              onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
              className="resize-none"
              placeholder="この部屋のテーマを簡潔に説明してください"
            />
          </div>
          <div className="space-y-1.5">
            <Label>今週のお題 <span className="text-destructive">*</span></Label>
            <Textarea
              rows={3}
              value={draft.weeklyTopic}
              onChange={(e) => setDraft((p) => ({ ...p, weeklyTopic: e.target.value }))}
              className="resize-none"
              placeholder="参加者への最初の問いかけを入力してください"
            />
          </div>

          {/* AI ディスカッション トグル */}
          <button
            type="button"
            onClick={() => setDraft((p) => ({ ...p, aiDiscussion: !p.aiDiscussion }))}
            className={[
              "w-full flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
              draft.aiDiscussion
                ? "border-violet-300 bg-violet-50"
                : "border-border bg-muted/20 hover:border-border/80",
            ].join(" ")}
          >
            <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${draft.aiDiscussion ? "border-violet-500 bg-violet-500" : "border-muted-foreground/30"}`}>
              {draft.aiDiscussion && <span className="block h-2 w-2 rounded-full bg-white" />}
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <Zap className={`h-4 w-4 ${draft.aiDiscussion ? "text-violet-600" : "text-muted-foreground"}`} />
                AIディスカッションを有効にする
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground leading-5">
                投稿があるとAIファシリテーターが自動で返信し、議論を深めます。
                共感・多視点の提示・問いかけでコミュニティを盛り上げます。
              </p>
              {draft.aiDiscussion && (
                <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-violet-700">
                  <Bot className="h-3 w-3" />
                  有効 — 投稿するとAIが返信します
                </p>
              )}
            </div>
          </button>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setOpen(false)}>キャンセル</Button>
            <Button onClick={handleCreate} disabled={!isValid || saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
              作成する
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ForumListClient() {
  const [sort, setSort] = useState<SortKey>("popular");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryKey>("all");
  const [activeOnly, setActiveOnly] = useState(false);
  const [rooms, setRooms] = useState<ForumRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/forum/rooms", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.rooms) setRooms(data.rooms);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const filteredRooms = useMemo<ForumRoom[]>(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rooms.filter((room) => {
      const inCategory =
        category === "all" ? true : (ROOM_CATEGORIES[room.id] ?? []).includes(category);
      const inSearch =
        !normalizedQuery ||
        room.name.toLowerCase().includes(normalizedQuery) ||
        room.description.toLowerCase().includes(normalizedQuery) ||
        room.weeklyTopic.toLowerCase().includes(normalizedQuery);
      const inActivity = activeOnly ? room.postCount >= 25 : true;
      return inCategory && inSearch && inActivity;
    });
  }, [rooms, category, query, activeOnly]);

  const sortedRooms = useMemo<ForumRoom[]>(() => {
    const list = [...filteredRooms];
    if (sort === "popular") {
      return list.sort((a, b) => b.postCount - a.postCount);
    }
    if (sort === "participants") {
      return list.sort((a, b) => b.participantCount - a.participantCount);
    }
    return list.sort(
      (a, b) => new Date(b.lastPostedAt).getTime() - new Date(a.lastPostedAt).getTime()
    );
  }, [filteredRooms, sort]);

  const totalPosts = rooms.reduce((s, r) => s + r.postCount, 0);
  const totalParticipants = rooms.reduce((s, r) => s + r.participantCount, 0);
  const highActivityCount = rooms.filter((room) => room.postCount >= 25).length;
  const featuredRooms = [...rooms]
    .sort((a, b) => getRoomScore(b) - getRoomScore(a))
    .slice(0, 2);

  const handleRoomCreated = (room: ForumRoom) => {
    setRooms((prev) => [...prev, room]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <section className="relative overflow-hidden border-b bg-gradient-to-br from-primary/8 via-primary/4 to-background">
        <div className="container py-12 md:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-background/80 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
              <MessageSquare className="h-3.5 w-3.5 text-primary" />
              AIUEO コミュニティ
            </div>
            <h1 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">
              AIUEO 井戸端会議
            </h1>
            <p className="mb-8 text-sm leading-7 text-muted-foreground">
              教育に関わるすべての人が、テーマ別の「部屋」でざっくばらんに語り合う場。
              <br className="hidden sm:block" />
              教員・専門家・保護者・企業、立場を超えてつながりましょう。
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
              <span className="rounded-full border bg-background/80 px-4 py-2 backdrop-blur-sm">
                <strong>{rooms.length}</strong> 部屋
              </span>
              <span className="rounded-full border bg-background/80 px-4 py-2 backdrop-blur-sm">
                投稿 <strong>{totalPosts.toLocaleString()}</strong> 件
              </span>
              <span className="rounded-full border bg-background/80 px-4 py-2 backdrop-blur-sm">
                参加者 <strong>{totalParticipants}</strong> 人
              </span>
              <span className="rounded-full border bg-background/80 px-4 py-2 backdrop-blur-sm">
                活発な部屋 <strong>{highActivityCount}</strong>
              </span>
            </div>

            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:mt-10 sm:flex-row sm:items-center sm:gap-4">
              <CreateRoomDialog onCreated={handleRoomCreated} hero />
              <Button
                asChild
                variant="outline"
                size="lg"
                className="min-h-11 border-2 px-6 text-base font-semibold shadow-sm"
              >
                <a href="#forum-rooms" className="inline-flex items-center gap-2.5">
                  <Compass className="h-5 w-5 shrink-0" />
                  <span className="flex flex-col items-start text-left leading-tight">
                    <span>検索・一覧へ</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      キーワードやカテゴリで部屋を選ぶ
                    </span>
                  </span>
                </a>
              </Button>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute -top-20 -right-20 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-60 w-60 rounded-full bg-primary/5 blur-2xl" />
      </section>

      <div id="forum-rooms" className="container space-y-8 py-8">
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
              <div className="space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-9"
                    placeholder="部屋名・説明・今週のお題で検索"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCategory(key as CategoryKey)}
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

              <div className="flex flex-wrap items-center justify-between gap-2 lg:flex-col lg:items-end">
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
                    <TabsTrigger value="participants" className="h-6 gap-1 px-3 text-xs">
                      <Users className="h-3 w-3" />
                      参加者順
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button
                  type="button"
                  size="sm"
                  variant={activeOnly ? "default" : "outline"}
                  onClick={() => setActiveOnly((prev) => !prev)}
                  className="gap-1.5"
                >
                  {activeOnly ? <Flame className="h-3.5 w-3.5" /> : <Filter className="h-3.5 w-3.5" />}
                  活発な部屋のみ
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {featuredRooms.length > 0 && (
              <section>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-base font-semibold">注目ルーム</h2>
                  <p className="text-xs text-muted-foreground">投稿数と参加者数から自動ピックアップ</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {featuredRooms.map((room) => (
                    <RoomCard key={room.id} room={room} isFeatured />
                  ))}
                </div>
              </section>
            )}

            <section>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">すべての部屋</h2>
                  <p className="text-xs text-muted-foreground">
                    条件に一致した部屋: {sortedRooms.length} / {rooms.length}
                  </p>
                </div>
              </div>

              {sortedRooms.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-muted/20 px-6 py-12 text-center">
                  <p className="text-sm font-medium">該当する部屋が見つかりませんでした</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    キーワードやカテゴリを変更するか、新しい部屋を作成してください。
                  </p>
                  <div className="mt-4 flex justify-center">
                    <Button size="sm" variant="outline" onClick={() => { setQuery(""); setCategory("all"); setActiveOnly(false); }}>
                      条件をリセット
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {sortedRooms.map((room) => (
                    <RoomCard key={room.id} room={room} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        <div className="rounded-xl border border-dashed bg-muted/20 px-6 py-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">はじめて参加する方へ</p>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">
                各部屋に入って「投稿する」ボタンから書き込めます。属性バッジ（教員・専門家など）を選ぶと、
                誰がどんな立場で発言しているかが一目で分かります。匿名投稿も可能です。
              </p>
            </div>
            <Button asChild size="sm">
              <Link href={sortedRooms[0] ? `/forum/${sortedRooms[0].id}` : "/forum"}>
                今すぐ参加
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
