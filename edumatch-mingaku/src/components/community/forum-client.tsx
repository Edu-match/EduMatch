"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Flame,
  HelpCircle,
  LogIn,
  MessageSquare,
  PenSquare,
  TrendingUp,
  X,
} from "lucide-react";
import Link from "next/link";
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
import { AnswerSection, formatDate, useAuthUser } from "./answer-section";

// ─── 質問カード ────────────────────────────────────────────
function QuestionCard({
  thread,
  onClick,
}: {
  thread: ForumThread;
  onClick: () => void;
}) {
  const isResolved = !!thread.bestAnswerId;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border bg-card text-left shadow-xs transition-all duration-150 hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="p-5">
        {/* ステータス・カテゴリ・メタ */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {isResolved ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-3 w-3" />
              解決済み
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-600">
              <Circle className="h-3 w-3" />
              受付中
            </span>
          )}
          <Badge variant="secondary" className="text-xs">{thread.category}</Badge>
          <span className="text-xs text-muted-foreground">{thread.authorName}</span>
          <span className="text-xs text-muted-foreground">{formatDate(thread.postedAt)}</span>
        </div>

        {/* タイトル（質問として読めるスタイル） */}
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
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5" />
            回答 {thread.answerCount}
          </span>
          <span className="text-xs font-medium text-primary">詳細を見る →</span>
        </div>
      </div>
    </button>
  );
}

// ─── Sheet内：質問詳細 ─────────────────────────────────────
function QuestionDetailContent({
  thread,
  onBestAnswerChange,
}: {
  thread: ForumThread;
  onBestAnswerChange: (id: string | undefined) => void;
}) {
  const isResolved = !!thread.bestAnswerId;

  return (
    <div className="flex flex-col gap-6">
      {/* ステータス・カテゴリ */}
      <div className="flex flex-wrap items-center gap-2">
        {isResolved ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            解決済み
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-600">
            <Circle className="h-3.5 w-3.5" />
            受付中
          </span>
        )}
        <Badge variant="secondary" className="text-xs">{thread.category}</Badge>
        {thread.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border bg-muted/40 px-2.5 py-0.5 text-xs text-muted-foreground"
          >
            #{tag}
          </span>
        ))}
      </div>

      {/* 質問者・日時 */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          {thread.authorName.charAt(0)}
        </div>
        <span>{thread.authorName}</span>
        <span className="text-xs">{formatDate(thread.postedAt)}</span>
      </div>

      {/* 質問本文 */}
      <div className="rounded-xl bg-muted/40 px-6 py-5">
        <p className="whitespace-pre-wrap text-sm leading-8">{thread.body}</p>
      </div>

      <Separator />

      {/* 回答セクション */}
      <AnswerSection
        initialAnswers={thread.answers}
        questionAuthorName={thread.authorName}
        initialBestAnswerId={thread.bestAnswerId}
        onBestAnswerChange={onBestAnswerChange}
      />
    </div>
  );
}

// ─── 新規質問ダイアログ ────────────────────────────────────
type DraftState = {
  title: string;
  body: string;
  category: string;
  tags: string;
};

function NewQuestionDialog({
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
      id: `q-${Date.now()}`,
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
      answerCount: 0,
      answers: [],
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
          質問する
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>質問する</DialogTitle>
          <DialogDescription>
            {auth.isLoggedIn ? (
              <>
                <span className="font-medium text-foreground">{auth.name}</span>
                {" "}として投稿します
              </>
            ) : (
              "質問するにはログインが必要です"
            )}
          </DialogDescription>
        </DialogHeader>

        {auth.isLoggedIn ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="q-title">タイトル（質問の概要）</Label>
              <Input
                id="q-title"
                value={draft.title}
                onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                placeholder="例: 不登校傾向の生徒への最初のアプローチ方法は？"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="q-body">詳細・補足</Label>
              <Textarea
                id="q-body"
                rows={6}
                value={draft.body}
                onChange={(e) => setDraft((p) => ({ ...p, body: e.target.value }))}
                placeholder="状況・背景・試したことなどを具体的に書いてください"
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
                <Label htmlFor="q-tags">タグ（任意・カンマ区切り）</Label>
                <Input
                  id="q-tags"
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
                質問を投稿する
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              質問するにはログインが必要です
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
      const matchUnsolved = sortBy !== "unsolved" || !t.bestAnswerId;
      return matchCat && matchTag && matchUnsolved;
    });

    return [...base].sort((a, b) => {
      if (sortBy === "popular") return b.answerCount - a.answerCount;
      return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
    });
  }, [threads, selectedCategory, selectedTag, sortBy]);

  const categoryCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const t of threads) {
      m[t.category] = (m[t.category] ?? 0) + 1;
    }
    return m;
  }, [threads]);

  const resolvedCount = threads.filter((t) => t.bestAnswerId).length;
  const openCount = threads.length - resolvedCount;

  const handleNewThread = (thread: ForumThread) => {
    setThreads((prev) => [thread, ...prev]);
  };

  const handleBestAnswerChange = (threadId: string, bestId: string | undefined) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, bestAnswerId: bestId } : t))
    );
    if (openThread?.id === threadId) {
      setOpenThread((prev) => (prev ? { ...prev, bestAnswerId: bestId } : null));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* ─── ヘッダー ─── */}
      <section className="relative overflow-hidden border-b bg-gradient-to-br from-primary/8 via-primary/4 to-background">
        <div className="container py-12 md:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-background/80 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
              <HelpCircle className="h-3.5 w-3.5 text-primary" />
              みんなで解決！Q&Aコミュニティ
            </div>
            <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
              教育悩み相談室
            </h1>
            <p className="mb-8 text-base leading-8 text-muted-foreground">
              教育に関する疑問・悩みを投稿すると、教員・保護者・専門家がコミュニティで回答してくれます。
            </p>

            {/* 統計 */}
            {threads.length > 0 && (
              <div className="mb-8 flex flex-wrap items-center justify-center gap-3 text-sm">
                <span className="rounded-full border bg-background/80 px-4 py-2 backdrop-blur-sm">
                  質問数 <strong>{threads.length}</strong>
                </span>
                <span className="rounded-full border bg-background/80 px-4 py-2 backdrop-blur-sm">
                  <span className="text-orange-600 font-semibold">受付中</span> {openCount}
                </span>
                <span className="rounded-full border bg-background/80 px-4 py-2 backdrop-blur-sm">
                  <span className="text-emerald-600 font-semibold">解決済み</span> {resolvedCount}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="pointer-events-none absolute -top-20 -right-20 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-60 w-60 rounded-full bg-primary/5 blur-2xl" />
      </section>

      {/* ─── メインコンテンツ ─── */}
      <div className="container py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_260px]">
          {/* ── 左：フィルタ + 質問一覧 ── */}
          <div className="min-w-0 space-y-5">
            {/* フィルタ */}
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

                {/* タグ */}
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

                {/* 件数・並び替え */}
                <div className="flex items-center justify-between border-t pt-3">
                  <p className="text-xs text-muted-foreground">
                    {filteredThreads.length} 件の質問
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
                        回答順
                      </TabsTrigger>
                      <TabsTrigger value="unsolved" className="h-5 px-2.5 text-xs">
                        未解決
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardContent>
            </Card>

            {/* 質問リスト */}
            {filteredThreads.length === 0 ? (
              <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed bg-muted/20 py-16 text-center">
                <HelpCircle className="h-12 w-12 text-muted-foreground/30" />
                <div>
                  <p className="text-base font-medium">
                    {sortBy === "unsolved" ? "未解決の質問はありません" : "まだ質問がありません"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {sortBy === "unsolved"
                      ? "すべての質問が解決済みです"
                      : "最初の質問を投稿してコミュニティを始めましょう"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredThreads.map((thread) => (
                  <QuestionCard
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
            {/* 質問CTA */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="space-y-3 p-5">
                <div>
                  <p className="font-semibold">質問してみましょう</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    教育現場の悩みをコミュニティが一緒に考えます
                  </p>
                </div>
                <NewQuestionDialog auth={auth} onSubmit={handleNewThread} />
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
                <CardTitle className="text-sm font-semibold">使い方</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <CardDescription className="space-y-2 text-xs leading-6">
                  <p>① 「質問する」ボタンから質問を投稿</p>
                  <p>② コミュニティメンバーが回答</p>
                  <p>③ 役立った回答を「ベストアンサー」に選択すると解決済みになります</p>
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ─── 質問詳細 Sheet ─── */}
      <Sheet open={!!openThread} onOpenChange={(o) => { if (!o) setOpenThread(null); }}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        >
          <SheetHeader className="sticky top-0 z-10 border-b bg-background px-6 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {openThread && (
                    <>
                      {openThread.bestAnswerId ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          解決済み
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-600">
                          <Circle className="h-3 w-3" />
                          受付中
                        </span>
                      )}
                    </>
                  )}
                </div>
                <SheetTitle className="text-left text-base leading-6">
                  {openThread?.title}
                </SheetTitle>
              </div>
              <button
                type="button"
                onClick={() => setOpenThread(null)}
                className="shrink-0 rounded-sm p-1 text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="閉じる"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {openThread && (
              <QuestionDetailContent
                thread={openThread}
                onBestAnswerChange={(id) =>
                  handleBestAnswerChange(openThread.id, id)
                }
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
