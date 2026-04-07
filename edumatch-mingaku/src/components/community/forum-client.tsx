"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Flame,
  LogIn,
  MessageSquare,
  PenSquare,
  TrendingUp,
  X,
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
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  FORUM_CATEGORIES,
  FORUM_SORT_OPTIONS,
  type ForumThread,
} from "@/lib/mock-community";
import { CommentSection } from "./comment-section";
import Link from "next/link";

// ─── 認証フック ────────────────────────────────────────────
function useAuthUser() {
  const [auth, setAuth] = useState<{
    name: string;
    isLoading: boolean;
    isLoggedIn: boolean;
  }>({ name: "", isLoading: true, isLoggedIn: false });

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const name =
          data?.profile?.name ?? data?.user?.email?.split("@")[0] ?? null;
        setAuth({ name: name ?? "", isLoading: false, isLoggedIn: !!name });
      })
      .catch(() => setAuth({ name: "", isLoading: false, isLoggedIn: false }));
  }, []);

  return auth;
}

// ─── ユーティリティ ────────────────────────────────────────
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

// ─── スレッドカード ────────────────────────────────────────
function ThreadCard({
  thread,
  onClick,
}: {
  thread: ForumThread;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border bg-card text-left shadow-xs transition-all duration-150 hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="p-5">
        {/* メタ情報 */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-xs">{thread.category}</Badge>
          <span className="text-xs text-muted-foreground">{thread.authorName}</span>
          <span className="text-xs text-muted-foreground">{formatDate(thread.postedAt)}</span>
        </div>

        {/* タイトル */}
        <p className="mb-2 text-base font-semibold leading-7">{thread.title}</p>

        {/* 本文プレビュー */}
        <p className="mb-4 line-clamp-2 text-sm leading-6 text-muted-foreground">
          {thread.body}
        </p>

        {/* タグ */}
        {thread.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {thread.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border bg-muted/40 px-2.5 py-0.5 text-xs text-muted-foreground"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* フッター */}
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              コメント {thread.commentCount}
            </span>
          </div>
          <span className="text-xs font-medium text-primary">詳細を見る →</span>
        </div>
      </div>
    </button>
  );
}

// ─── スレッド詳細 Sheet 内コンテンツ ──────────────────────
function ThreadDetailContent({ thread }: { thread: ForumThread }) {
  return (
    <div className="flex flex-col gap-6">
      {/* ヘッダー情報 */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-xs">{thread.category}</Badge>
          <span className="text-xs text-muted-foreground">{thread.authorName}</span>
          <span className="text-xs text-muted-foreground">{formatDate(thread.postedAt)}</span>
        </div>
        <h2 className="text-lg font-semibold leading-8">{thread.title}</h2>
        {thread.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {thread.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border bg-muted/40 px-2.5 py-0.5 text-xs text-muted-foreground"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 本文 */}
      <div className="rounded-xl bg-muted/40 px-5 py-4">
        <p className="whitespace-pre-wrap text-sm leading-8">{thread.body}</p>
      </div>

      <Separator />

      {/* コメントセクション */}
      <div className="space-y-4">
        <p className="text-sm font-semibold">コメント</p>
        <CommentSection
          initialComments={thread.comments}
          placeholder="この投稿に関して意見や情報を共有しましょう"
          submitLabel="コメントを投稿"
          emptyMessage="まだコメントはありません。最初の投稿をしてみましょう。"
        />
      </div>
    </div>
  );
}

// ─── 新規投稿ダイアログ ────────────────────────────────────
type DraftState = {
  title: string;
  body: string;
  category: string;
  tags: string;
};

function NewThreadDialog({
  auth,
  onSubmit,
}: {
  auth: ReturnType<typeof useAuthUser>;
  onSubmit: (thread: ForumThread) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DraftState>({
    title: "",
    body: "",
    category: "授業づくり",
    tags: "",
  });

  const handleSubmit = () => {
    if (!draft.title.trim() || !draft.body.trim()) return;

    const thread: ForumThread = {
      id: `thread-${Date.now()}`,
      title: draft.title.trim(),
      body: draft.body.trim(),
      category: draft.category,
      tags: draft.tags
        .split(/[,\s、]+/)
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 5),
      authorName: auth.name,
      postedAt: new Date().toISOString(),
      commentCount: 0,
      comments: [],
    };

    onSubmit(thread);
    setDraft({ title: "", body: "", category: "授業づくり", tags: "" });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full gap-2">
          <PenSquare className="h-4 w-4" />
          新しい投稿をする
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>新しい投稿</DialogTitle>
          <DialogDescription>
            {auth.isLoggedIn ? (
              <>
                <span className="font-medium text-foreground">{auth.name}</span>
                {" "}として投稿します
              </>
            ) : (
              "投稿するにはログインが必要です"
            )}
          </DialogDescription>
        </DialogHeader>

        {auth.isLoggedIn ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-title">タイトル</Label>
              <Input
                id="new-title"
                value={draft.title}
                onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                placeholder="相談・共有したいテーマを入力"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-body">本文</Label>
              <Textarea
                id="new-body"
                rows={6}
                value={draft.body}
                onChange={(e) => setDraft((p) => ({ ...p, body: e.target.value }))}
                placeholder="状況や背景を具体的に書いてください"
                className="resize-none"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>カテゴリ</Label>
                <Select
                  value={draft.category}
                  onValueChange={(v) => setDraft((p) => ({ ...p, category: v }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORUM_CATEGORIES.filter((c) => c !== "すべて").map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-tags">タグ（任意・カンマ区切り）</Label>
                <Input
                  id="new-tags"
                  value={draft.tags}
                  onChange={(e) => setDraft((p) => ({ ...p, tags: e.target.value }))}
                  placeholder="例: ICT, 数学, 中学校"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>キャンセル</Button>
              <Button
                onClick={handleSubmit}
                disabled={!draft.title.trim() || !draft.body.trim()}
              >
                投稿する
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              投稿するにはログインが必要です
            </p>
            <Button asChild>
              <Link href="/login">
                <LogIn className="h-4 w-4" />
                ログインする
              </Link>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── メインコンポーネント ───────────────────────────────────
export function ForumClient() {
  const auth = useAuthUser();
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("すべて");
  const [selectedTag, setSelectedTag] = useState<string>("すべて");
  const [sortBy, setSortBy] =
    useState<(typeof FORUM_SORT_OPTIONS)[number]["value"]>("newest");
  const [openThread, setOpenThread] = useState<ForumThread | null>(null);

  const allTags = useMemo(() => {
    const tags = Array.from(new Set(threads.flatMap((t) => t.tags))).sort();
    return tags.length > 0 ? ["すべて", ...tags] : [];
  }, [threads]);

  const filteredThreads = useMemo(() => {
    const base = threads.filter((t) => {
      const matchCat = selectedCategory === "すべて" || t.category === selectedCategory;
      const matchTag = selectedTag === "すべて" || t.tags.includes(selectedTag);
      return matchCat && matchTag;
    });
    return [...base].sort((a, b) =>
      sortBy === "popular"
        ? b.commentCount - a.commentCount
        : new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
    );
  }, [threads, selectedCategory, selectedTag, sortBy]);

  const categoryCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const t of threads) {
      m[t.category] = (m[t.category] ?? 0) + 1;
    }
    return m;
  }, [threads]);

  const handleNewThread = (thread: ForumThread) => {
    setThreads((prev) => [thread, ...prev]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* ─── ヘッダー ─── */}
      <section className="relative overflow-hidden border-b bg-gradient-to-br from-primary/8 via-primary/4 to-background">
        <div className="container py-12 md:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
              教育悩み相談室
            </h1>
            <p className="mb-8 text-base leading-8 text-muted-foreground">
              教員・保護者・学生が、教育に関する悩みや実践知を持ち寄って話し合えるコミュニティです。
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
              <span className="rounded-full border bg-background/80 px-4 py-2 backdrop-blur-sm">
                投稿数 {threads.length}
              </span>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute -top-20 -right-20 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-60 w-60 rounded-full bg-primary/5 blur-2xl" />
      </section>

      {/* ─── メインコンテンツ ─── */}
      <div className="container py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_260px]">
          {/* ── 左：フィルタ + スレッド一覧 ── */}
          <div className="min-w-0 space-y-5">
            {/* フィルタバー */}
            <Card className="border shadow-sm">
              <CardContent className="space-y-4 p-4">
                {/* カテゴリ */}
                <div className="flex flex-wrap items-center gap-2">
                  {FORUM_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={[
                        "rounded-full border px-3.5 py-1 text-xs font-medium transition-all",
                        selectedCategory === cat
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-primary/5",
                      ].join(" ")}
                    >
                      {cat}
                      {cat !== "すべて" && categoryCounts[cat]
                        ? ` (${categoryCounts[cat]})`
                        : ""}
                    </button>
                  ))}
                </div>

                {/* タグ（存在する場合のみ表示） */}
                {allTags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">タグ:</span>
                    {allTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setSelectedTag(tag)}
                        className={[
                          "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all",
                          selectedTag === tag
                            ? "border-primary/60 bg-primary/10 text-primary"
                            : "border-border bg-muted/30 text-muted-foreground hover:text-foreground",
                        ].join(" ")}
                      >
                        #{tag === "すべて" ? "すべて" : tag}
                      </button>
                    ))}
                  </div>
                )}

                {/* 件数と並び替え */}
                <div className="flex items-center justify-between border-t pt-3">
                  <p className="text-xs text-muted-foreground">
                    {filteredThreads.length} 件の投稿
                  </p>
                  <Tabs
                    value={sortBy}
                    onValueChange={(v) =>
                      setSortBy(v as (typeof FORUM_SORT_OPTIONS)[number]["value"])
                    }
                  >
                    <TabsList className="h-7">
                      <TabsTrigger value="newest" className="h-5 px-2.5 text-xs">
                        新着順
                      </TabsTrigger>
                      <TabsTrigger value="popular" className="h-5 px-2.5 text-xs">
                        <Flame className="mr-1 h-3 w-3" />
                        コメント順
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardContent>
            </Card>

            {/* スレッドリスト */}
            {filteredThreads.length === 0 ? (
              <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed bg-muted/20 py-16 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground/30" />
                <div>
                  <p className="text-base font-medium">まだ投稿がありません</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    最初の投稿をしてコミュニティを始めましょう
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredThreads.map((thread) => (
                  <ThreadCard
                    key={thread.id}
                    thread={thread}
                    onClick={() => setOpenThread(thread)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── 右：サイドバー ── */}
          <div className="space-y-5 lg:sticky lg:top-20 lg:self-start">
            {/* 投稿CTA */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="space-y-3 p-5">
                <div>
                  <p className="font-semibold">あなたも投稿しましょう</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    教育現場の悩みや気づきを気軽に共有できます
                  </p>
                </div>
                <NewThreadDialog auth={auth} onSubmit={handleNewThread} />
              </CardContent>
            </Card>

            {/* カテゴリ別件数 */}
            {Object.keys(categoryCounts).length > 0 && (
              <Card>
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    カテゴリ別
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-0.5 pb-4">
                  {FORUM_CATEGORIES.filter((c) => c !== "すべて").map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/60"
                    >
                      <span
                        className={
                          selectedCategory === cat
                            ? "font-medium text-primary"
                            : "text-foreground"
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
            )}

            {/* このページについて */}
            <Card>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm font-semibold">このページについて</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <CardDescription className="text-xs leading-6">
                  教育悩み相談室は、教員・保護者・学生が教育に関する話題を投稿し、
                  コメントを通じてコミュニティ内で議論できるスペースです。
                  現在はモックUIです。
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ─── スレッド詳細 Sheet ─── */}
      <Sheet open={!!openThread} onOpenChange={(o) => { if (!o) setOpenThread(null); }}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-2xl"
        >
          <SheetHeader className="sticky top-0 z-10 border-b bg-background px-6 py-4">
            <div className="flex items-start justify-between gap-3">
              <SheetTitle className="text-left text-base leading-6">
                {openThread?.title}
              </SheetTitle>
              <button
                type="button"
                onClick={() => setOpenThread(null)}
                className="shrink-0 rounded-sm p-1 text-muted-foreground opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="閉じる"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {openThread && <ThreadDetailContent thread={openThread} />}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
