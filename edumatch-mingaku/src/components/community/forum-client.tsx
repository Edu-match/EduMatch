"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Eye,
  Flame,
  MessageCircle,
  MessageSquare,
  PenSquare,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  COMMUNITY_ROLE_LABELS,
  FORUM_CATEGORIES,
  FORUM_SORT_OPTIONS,
  type CommunityRole,
  type ForumThread,
} from "@/lib/mock-community";
import { RoleBadge } from "./role-badge";

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(new Date(dateString));
}

type ThreadComposerState = {
  title: string;
  body: string;
  category: string;
  tags: string;
  role: CommunityRole;
  name: string;
  anonymous: boolean;
};

function createDefaultThreadComposer(): ThreadComposerState {
  return {
    title: "",
    body: "",
    category: "授業づくり",
    tags: "",
    role: "general",
    name: "",
    anonymous: false,
  };
}

function NewThreadDialog({
  composer,
  setComposer,
  isOpen,
  setIsOpen,
  onSubmit,
}: {
  composer: ThreadComposerState;
  setComposer: React.Dispatch<React.SetStateAction<ThreadComposerState>>;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full gap-2">
          <PenSquare className="h-4 w-4" />
          新規スレッドを投稿
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>新しい相談を投稿</DialogTitle>
          <DialogDescription>
            このフォームはモックです。投稿後は一覧上に即時反映されます。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="forum-title">タイトル</Label>
            <Input
              id="forum-title"
              value={composer.title}
              onChange={(e) => setComposer((p) => ({ ...p, title: e.target.value }))}
              placeholder="相談したいテーマを入力"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="forum-body">本文</Label>
            <Textarea
              id="forum-body"
              rows={6}
              value={composer.body}
              onChange={(e) => setComposer((p) => ({ ...p, body: e.target.value }))}
              placeholder="状況や背景、相談したいポイントを書いてください"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>カテゴリ</Label>
              <Select
                value={composer.category}
                onValueChange={(v) => setComposer((p) => ({ ...p, category: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="カテゴリを選択" />
                </SelectTrigger>
                <SelectContent>
                  {FORUM_CATEGORIES.filter((c) => c !== "すべて").map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>投稿者属性</Label>
              <Select
                value={composer.role}
                disabled={composer.anonymous}
                onValueChange={(v) => setComposer((p) => ({ ...p, role: v as CommunityRole }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="属性を選択" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(COMMUNITY_ROLE_LABELS)
                    .filter(([r]) => r !== "anonymous")
                    .map(([r, l]) => (
                      <SelectItem key={r} value={r}>{l}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="forum-name">表示名</Label>
              <Input
                id="forum-name"
                value={composer.name}
                disabled={composer.anonymous}
                onChange={(e) => setComposer((p) => ({ ...p, name: e.target.value }))}
                placeholder="例: 都内中学校教員"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="forum-tags">タグ（カンマ区切り）</Label>
              <Input
                id="forum-tags"
                value={composer.tags}
                onChange={(e) => setComposer((p) => ({ ...p, tags: e.target.value }))}
                placeholder="例: ICT, 学級経営, 不登校"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="forum-anonymous"
              checked={composer.anonymous}
              onCheckedChange={(checked) =>
                setComposer((p) => ({ ...p, anonymous: checked === true }))
              }
            />
            <Label htmlFor="forum-anonymous">匿名で投稿する</Label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>閉じる</Button>
            <Button onClick={onSubmit} disabled={!composer.title.trim() || !composer.body.trim()}>
              投稿する
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ForumClient({ initialThreads }: { initialThreads: ForumThread[] }) {
  const [threads, setThreads] = useState(initialThreads);
  const [selectedCategory, setSelectedCategory] = useState<string>("すべて");
  const [selectedTag, setSelectedTag] = useState<string>("すべて");
  const [sortBy, setSortBy] =
    useState<(typeof FORUM_SORT_OPTIONS)[number]["value"]>("newest");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [composer, setComposer] = useState<ThreadComposerState>(createDefaultThreadComposer());

  const allTags = useMemo(
    () => ["すべて", ...Array.from(new Set(threads.flatMap((t) => t.tags))).sort()],
    [threads]
  );

  const filteredThreads = useMemo(() => {
    const base = threads.filter((t) => {
      const matchCat = selectedCategory === "すべて" || t.category === selectedCategory;
      const matchTag = selectedTag === "すべて" || t.tags.includes(selectedTag);
      return matchCat && matchTag;
    });
    return [...base].sort((a, b) =>
      sortBy === "popular"
        ? b.viewCount + b.replyCount * 20 - (a.viewCount + a.replyCount * 20)
        : new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
    );
  }, [threads, selectedCategory, selectedTag, sortBy]);

  const handleSubmitThread = () => {
    if (!composer.title.trim() || !composer.body.trim()) return;

    const role = composer.anonymous ? "anonymous" : composer.role;
    const name = composer.anonymous
      ? "匿名ユーザー"
      : composer.name.trim() || `${COMMUNITY_ROLE_LABELS[composer.role]}ユーザー`;

    const next: ForumThread = {
      id: `forum-draft-${Date.now()}`,
      title: composer.title.trim(),
      summary: composer.body.trim().slice(0, 70),
      body: composer.body.trim(),
      category: composer.category,
      tags: composer.tags
        .split(/[,\s、]+/)
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 5),
      authorName: name,
      authorRole: role,
      postedAt: new Date().toISOString(),
      replyCount: 0,
      viewCount: 1,
      comments: [],
    };

    setThreads((prev) => [next, ...prev]);
    setComposer(createDefaultThreadComposer());
    setIsDialogOpen(false);
  };

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of threads) {
      counts[t.category] = (counts[t.category] ?? 0) + 1;
    }
    return counts;
  }, [threads]);

  const totalComments = threads.reduce((sum, t) => sum + t.replyCount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* ─── ヒーローセクション ─── */}
      <section className="relative overflow-hidden border-b bg-gradient-to-br from-primary/10 via-primary/5 to-background">
        <div className="container py-12 md:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4 gap-1.5 px-3 py-1 text-xs">
              <Sparkles className="h-3 w-3" />
              新機能モック
            </Badge>
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              教育悩み相談室
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-lg leading-8 text-muted-foreground">
              教員・保護者・学生・研究者が教育に関する悩みや実践知を持ち寄る、
              オープンなQ&Aコミュニティです。
            </p>

            {/* 統計バッジ */}
            <div className="mb-8 flex flex-wrap items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-2 rounded-full border bg-background/80 px-4 py-2 shadow-sm backdrop-blur-sm">
                <MessageCircle className="h-4 w-4 text-primary" />
                <span className="font-medium">{threads.length}</span>
                <span className="text-muted-foreground">スレッド</span>
              </div>
              <div className="flex items-center gap-2 rounded-full border bg-background/80 px-4 py-2 shadow-sm backdrop-blur-sm">
                <MessageSquare className="h-4 w-4 text-primary" />
                <span className="font-medium">{totalComments}</span>
                <span className="text-muted-foreground">回答</span>
              </div>
              <div className="flex items-center gap-2 rounded-full border bg-background/80 px-4 py-2 shadow-sm backdrop-blur-sm">
                <Users className="h-4 w-4 text-primary" />
                <span className="font-medium">5</span>
                <span className="text-muted-foreground">種の属性</span>
              </div>
            </div>

            <NewThreadDialog
              composer={composer}
              setComposer={setComposer}
              isOpen={isDialogOpen}
              setIsOpen={setIsDialogOpen}
              onSubmit={handleSubmitThread}
            />
          </div>
        </div>
        {/* 背景の装飾 */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-64 w-64 rounded-full bg-primary/8 blur-2xl" />
      </section>

      {/* ─── メインコンテンツ ─── */}
      <div className="container py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
          {/* ── 左：フィルタ + スレッド一覧 ── */}
          <div className="min-w-0 space-y-6">
            {/* フィルタ */}
            <Card className="border shadow-sm">
              <CardContent className="space-y-4 p-5">
                {/* カテゴリ */}
                <div className="space-y-2.5">
                  <p className="text-sm font-semibold text-foreground/80">カテゴリで絞る</p>
                  <div className="flex flex-wrap gap-2">
                    {FORUM_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`rounded-full border px-3.5 py-1 text-sm font-medium transition-all ${
                          selectedCategory === cat
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-primary/5"
                        }`}
                      >
                        {cat}
                        {cat !== "すべて" && categoryCounts[cat]
                          ? ` (${categoryCounts[cat]})`
                          : ""}
                      </button>
                    ))}
                  </div>
                </div>

                {/* タグ */}
                <div className="space-y-2.5">
                  <p className="text-sm font-semibold text-foreground/80">タグで絞る</p>
                  <div className="flex flex-wrap gap-2">
                    {allTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setSelectedTag(tag)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                          selectedTag === tag
                            ? "border-primary/60 bg-primary/10 text-primary"
                            : "border-border bg-muted/30 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                        }`}
                      >
                        #{tag === "すべて" ? "すべてのタグ" : tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 件数・並び替え */}
                <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-bold text-foreground">{filteredThreads.length}</span>
                    {" "}件のスレッド
                  </p>
                  <Tabs
                    value={sortBy}
                    onValueChange={(v) =>
                      setSortBy(v as (typeof FORUM_SORT_OPTIONS)[number]["value"])
                    }
                  >
                    <TabsList className="h-8">
                      <TabsTrigger value="newest" className="h-6 px-3 text-xs">
                        新着順
                      </TabsTrigger>
                      <TabsTrigger value="popular" className="h-6 px-3 text-xs">
                        <Flame className="mr-1 h-3 w-3" />
                        人気順
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardContent>
            </Card>

            {/* スレッドリスト */}
            <div className="space-y-3">
              {filteredThreads.map((thread) => (
                <ThreadCard key={thread.id} thread={thread} />
              ))}

              {filteredThreads.length === 0 && (
                <Card>
                  <CardContent className="py-16 text-center">
                    <MessageCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
                    <p className="text-base font-semibold">条件に合うスレッドがありません</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      カテゴリやタグを変更してお試しください。
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* ── 右：サイドバー ── */}
          <div className="space-y-5 lg:sticky lg:top-20 lg:self-start">
            {/* 新規投稿CTA */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center gap-2">
                  <PenSquare className="h-5 w-5 text-primary" />
                  <p className="font-semibold">あなたも相談してみましょう</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  教育現場の悩みや気づきを気軽に共有できます。匿名投稿も可能です。
                </p>
                <NewThreadDialog
                  composer={composer}
                  setComposer={setComposer}
                  isOpen={isDialogOpen}
                  setIsOpen={setIsDialogOpen}
                  onSubmit={handleSubmitThread}
                />
              </CardContent>
            </Card>

            {/* カテゴリ別件数 */}
            <Card>
              <CardHeader className="pb-3 pt-4">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  カテゴリ別スレッド数
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 pb-4">
                {FORUM_CATEGORIES.filter((c) => c !== "すべて").map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted/60"
                  >
                    <span
                      className={
                        selectedCategory === cat ? "font-medium text-primary" : "text-foreground"
                      }
                    >
                      {cat}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {categoryCounts[cat] ?? 0}
                    </span>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* 投稿者属性について */}
            <Card>
              <CardHeader className="pb-3 pt-4">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Users className="h-4 w-4 text-primary" />
                  投稿者の属性バッジ
                </CardTitle>
                <CardDescription className="text-xs">
                  回答者の立場がひと目でわかります
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 pb-4">
                {(
                  [
                    ["teacher", "教員"],
                    ["student", "学生"],
                    ["expert", "専門家"],
                    ["guardian", "保護者"],
                    ["general", "一般"],
                    ["anonymous", "匿名"],
                  ] as const
                ).map(([role, label]) => (
                  <div key={role} className="flex items-center gap-2">
                    <RoleBadge role={role} />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThreadCard({ thread }: { thread: ForumThread }) {
  return (
    <Card className="group overflow-hidden transition-all duration-200 hover:border-primary/40 hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="text-xs">{thread.category}</Badge>
          <RoleBadge role={thread.authorRole} />
          <span className="text-xs text-muted-foreground">{thread.authorName}</span>
          <span className="text-xs text-muted-foreground">{formatDate(thread.postedAt)}</span>
        </div>
        <CardTitle className="mt-2 text-base leading-7 group-hover:text-primary transition-colors">
          {thread.title}
        </CardTitle>
        <CardDescription className="line-clamp-2 text-sm leading-6">
          {thread.summary}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-1.5 mb-4">
          {thread.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              #{tag}
            </Badge>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              返信 {thread.replyCount}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              閲覧 {thread.viewCount}
            </span>
          </div>
          <Button asChild size="sm" variant="outline" className="text-xs">
            <Link href={`/forum/${thread.id}`}>スレッドを見る →</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
