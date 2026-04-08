"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Flame,
  Heart,
  LinkIcon,
  MessageSquare,
  PenSquare,
  Pin,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  type AuthorRole,
  type ForumPost,
  type ForumReply,
  type ForumRoom,
  getPinnedPosts,
  getPostsByRoom,
} from "@/lib/mock-forum";

// ─── 定数 ────────────────────────────────────────────────

const AUTHOR_ROLES: AuthorRole[] = ["教員", "学生", "専門家", "企業", "一般", "匿名"];

// ─── 属性バッジ ───────────────────────────────────────────

const ROLE_STYLES: Record<
  AuthorRole,
  { bg: string; text: string; border: string; icon: string }
> = {
  教員: {
    bg: "bg-blue-100",
    text: "text-blue-700",
    border: "border-blue-200",
    icon: "🎓",
  },
  学生: {
    bg: "bg-green-100",
    text: "text-green-700",
    border: "border-green-200",
    icon: "📚",
  },
  専門家: {
    bg: "bg-purple-100",
    text: "text-purple-700",
    border: "border-purple-200",
    icon: "🔬",
  },
  企業: {
    bg: "bg-orange-100",
    text: "text-orange-700",
    border: "border-orange-200",
    icon: "🏢",
  },
  一般: {
    bg: "bg-gray-100",
    text: "text-gray-600",
    border: "border-gray-200",
    icon: "👤",
  },
  匿名: {
    bg: "bg-gray-50",
    text: "text-gray-500",
    border: "border-gray-100",
    icon: "🎭",
  },
};

function RoleBadge({ role }: { role: AuthorRole }) {
  const s = ROLE_STYLES[role];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${s.bg} ${s.text} ${s.border}`}
    >
      <span role="img" aria-label={role} className="text-[10px]">
        {s.icon}
      </span>
      {role}
    </span>
  );
}

// ─── 日時フォーマット ──────────────────────────────────────

function formatRelative(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "たった今";
  if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}日前`;
  return new Date(iso).toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
  });
}

// ─── アバター ──────────────────────────────────────────────

function Avatar({ name, role }: { name: string; role: AuthorRole }) {
  const s = ROLE_STYLES[role];
  const initials =
    role === "匿名" ? "?" : name.charAt(0);
  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${s.bg} ${s.text} ${s.border}`}
    >
      {initials}
    </div>
  );
}

// ─── 返信カード ───────────────────────────────────────────

function ReplyCard({ reply }: { reply: ForumReply }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(reply.likeCount);

  const toggleLike = () => {
    if (liked) {
      setLikeCount((n) => n - 1);
    } else {
      setLikeCount((n) => n + 1);
    }
    setLiked((v) => !v);
  };

  return (
    <div className="flex gap-3 pl-4 border-l-2 border-muted">
      <Avatar name={reply.authorName} role={reply.authorRole} />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-sm font-semibold">{reply.authorName}</span>
          <RoleBadge role={reply.authorRole} />
          <span className="text-xs text-muted-foreground">
            {formatRelative(reply.postedAt)}
          </span>
        </div>
        <p className="text-sm leading-7 whitespace-pre-wrap">{reply.body}</p>
        <button
          type="button"
          onClick={toggleLike}
          className={`mt-2 flex items-center gap-1 text-xs transition-colors ${
            liked
              ? "text-pink-500"
              : "text-muted-foreground hover:text-pink-500"
          }`}
        >
          <Heart className={`h-3.5 w-3.5 ${liked ? "fill-pink-500" : ""}`} />
          {likeCount}
        </button>
      </div>
    </div>
  );
}

// ─── 投稿カード ───────────────────────────────────────────

function PostCard({
  post,
  pinned,
}: {
  post: ForumPost;
  pinned?: boolean;
}) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyRole, setReplyRole] = useState<AuthorRole>("教員");
  const [localReplies, setLocalReplies] = useState<ForumReply[]>(
    post.replies ?? []
  );

  const toggleLike = () => {
    setLikeCount((n) => (liked ? n - 1 : n + 1));
    setLiked((v) => !v);
  };

  const submitReply = () => {
    if (!replyText.trim()) return;
    const newReply: ForumReply = {
      id: `r-${Date.now()}`,
      authorName: replyRole === "匿名" ? "匿名ユーザー" : "あなた",
      authorRole: replyRole,
      body: replyText.trim(),
      likeCount: 0,
      postedAt: new Date().toISOString(),
    };
    setLocalReplies((prev) => [...prev, newReply]);
    setReplyText("");
    setShowReplyForm(false);
    setRepliesOpen(true);
  };

  return (
    <div
      className={`rounded-xl border bg-card shadow-xs transition-shadow hover:shadow-sm ${
        pinned ? "border-amber-200 bg-amber-50/40" : ""
      }`}
    >
      <div className="p-5">
        {/* ピンバッジ */}
        {pinned && (
          <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-amber-600">
            <Pin className="h-3.5 w-3.5 fill-amber-500" />
            注目投稿（運営ピックアップ）
          </div>
        )}

        {/* 投稿者情報 */}
        <div className="flex gap-3">
          <Avatar name={post.authorName} role={post.authorRole} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-sm font-semibold">{post.authorName}</span>
              <RoleBadge role={post.authorRole} />
              <span className="text-xs text-muted-foreground">
                {formatRelative(post.postedAt)}
              </span>
            </div>

            {/* 本文 */}
            <p className="text-sm leading-7 whitespace-pre-wrap">{post.body}</p>

            {/* 関連記事 */}
            {post.relatedArticleUrl && (
              <a
                href={post.relatedArticleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <LinkIcon className="h-3 w-3" />
                関連記事
              </a>
            )}

            {/* アクション */}
            <div className="mt-3 flex items-center gap-4">
              <button
                type="button"
                onClick={toggleLike}
                className={`flex items-center gap-1 text-xs transition-colors ${
                  liked
                    ? "text-pink-500"
                    : "text-muted-foreground hover:text-pink-500"
                }`}
              >
                <Heart
                  className={`h-3.5 w-3.5 ${liked ? "fill-pink-500" : ""}`}
                />
                {likeCount}
              </button>

              {localReplies.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setRepliesOpen((v) => !v)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  {localReplies.length} 件の返信
                  {repliesOpen ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>
              ) : (
                <span className="flex items-center gap-1 text-xs text-muted-foreground/60">
                  <MessageSquare className="h-3.5 w-3.5" />
                  返信 0
                </span>
              )}

              <button
                type="button"
                onClick={() => setShowReplyForm((v) => !v)}
                className="text-xs text-primary hover:underline"
              >
                返信する
              </button>
            </div>
          </div>
        </div>

        {/* 返信フォーム */}
        {showReplyForm && (
          <div className="mt-4 ml-12 space-y-3 rounded-lg bg-muted/30 p-4">
            <div className="flex items-center gap-2">
              <Label className="text-xs shrink-0">属性</Label>
              <Select
                value={replyRole}
                onValueChange={(v) => setReplyRole(v as AuthorRole)}
              >
                <SelectTrigger className="h-7 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUTHOR_ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="text-xs">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              rows={3}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="返信を入力..."
              className="resize-none text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowReplyForm(false);
                  setReplyText("");
                }}
              >
                <X className="h-3.5 w-3.5" />
                キャンセル
              </Button>
              <Button
                size="sm"
                onClick={submitReply}
                disabled={!replyText.trim()}
              >
                返信する
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 返信一覧 */}
      {repliesOpen && localReplies.length > 0 && (
        <div className="border-t bg-muted/10 px-5 py-4 space-y-4">
          {localReplies.map((reply) => (
            <ReplyCard key={reply.id} reply={reply} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 投稿フォームダイアログ ──────────────────────────────

type PostDraft = {
  body: string;
  authorRole: AuthorRole;
  relatedArticleUrl: string;
};

function NewPostDialog({
  onSubmit,
}: {
  onSubmit: (post: ForumPost) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PostDraft>({
    body: "",
    authorRole: "教員",
    relatedArticleUrl: "",
  });

  const handleSubmit = () => {
    if (!draft.body.trim()) return;
    const post: ForumPost = {
      id: `post-${Date.now()}`,
      roomId: "",
      authorName: draft.authorRole === "匿名" ? "匿名ユーザー" : "あなた",
      authorRole: draft.authorRole,
      body: draft.body.trim(),
      likeCount: 0,
      replyCount: 0,
      postedAt: new Date().toISOString(),
      relatedArticleUrl: draft.relatedArticleUrl.trim() || undefined,
      replies: [],
    };
    onSubmit(post);
    setDraft({ body: "", authorRole: "教員", relatedArticleUrl: "" });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2 w-full sm:w-auto">
          <PenSquare className="h-4 w-4" />
          投稿する
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>新しい投稿</DialogTitle>
          <DialogDescription>
            今週のお題や話題についてコメントしましょう
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 属性選択 */}
          <div className="space-y-2">
            <Label>投稿者属性</Label>
            <Select
              value={draft.authorRole}
              onValueChange={(v) =>
                setDraft((p) => ({ ...p, authorRole: v as AuthorRole }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUTHOR_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    <span className="flex items-center gap-2">
                      <span>{ROLE_STYLES[r].icon}</span>
                      {r}
                      {r === "匿名" && (
                        <span className="text-xs text-muted-foreground">
                          （匿名投稿）
                        </span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 本文 */}
          <div className="space-y-2">
            <Label htmlFor="post-body">投稿内容</Label>
            <Textarea
              id="post-body"
              rows={6}
              value={draft.body}
              onChange={(e) =>
                setDraft((p) => ({ ...p, body: e.target.value }))
              }
              placeholder="今週のお題について、あなたの経験や意見を書いてください..."
              className="resize-none"
            />
          </div>

          {/* 関連記事URL */}
          <div className="space-y-2">
            <Label htmlFor="post-url">
              関連記事URL{" "}
              <span className="text-xs text-muted-foreground font-normal">
                （任意）
              </span>
            </Label>
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                id="post-url"
                type="url"
                value={draft.relatedArticleUrl}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    relatedArticleUrl: e.target.value,
                  }))
                }
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              キャンセル
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!draft.body.trim()}
            >
              投稿する
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── メインコンポーネント ─────────────────────────────────

type SortKey = "newest" | "popular";

export function ForumRoomClient({ room }: { room: ForumRoom }) {
  const [sort, setSort] = useState<SortKey>("newest");
  const [localPosts, setLocalPosts] = useState<ForumPost[]>(() =>
    getPostsByRoom(room.id)
  );

  const pinnedPosts = useMemo(() => getPinnedPosts(room.id), [room.id]);

  const regularPosts = useMemo<ForumPost[]>(() => {
    const unpinned = localPosts.filter((p) => !p.isPinned);
    if (sort === "popular") {
      return [...unpinned].sort((a, b) => b.likeCount - a.likeCount);
    }
    return [...unpinned].sort(
      (a, b) =>
        new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
    );
  }, [localPosts, sort]);

  const handleNewPost = (post: ForumPost) => {
    setLocalPosts((prev) => [{ ...post, roomId: room.id }, ...prev]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* ─── 部屋ヘッダー ─── */}
      <section className="relative overflow-hidden border-b bg-gradient-to-br from-primary/8 via-primary/4 to-background">
        <div className="container py-8 md:py-12">
          {/* パンくず */}
          <Link
            href="/forum"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            AIUEO 井戸端会議
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="text-4xl shrink-0" role="img" aria-label={room.name}>
                {room.emoji}
              </span>
              <div>
                <h1 className="text-2xl font-bold md:text-3xl">{room.name}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {room.description}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    {localPosts.length} 投稿
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {room.participantCount} 人参加
                  </span>
                </div>
              </div>
            </div>
            <div className="shrink-0">
              <NewPostDialog onSubmit={handleNewPost} />
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute -top-20 -right-20 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
      </section>

      {/* ─── 今週のお題バナー ─── */}
      <div className="border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <div className="container py-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-primary whitespace-nowrap">
              <Sparkles className="h-4 w-4" />
              今週のお題
            </span>
            <p className="text-sm font-medium leading-6 sm:text-base">
              {room.weeklyTopic}
            </p>
          </div>
        </div>
      </div>

      {/* ─── コンテンツ ─── */}
      <div className="container py-8">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* 注目投稿 */}
          {pinnedPosts.length > 0 && (
            <div className="space-y-3">
              {pinnedPosts.map((post) => (
                <PostCard key={post.id} post={post} pinned />
              ))}
            </div>
          )}

          {/* ソート + 投稿一覧 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {regularPosts.length} 件の投稿
              </p>
              <Tabs
                value={sort}
                onValueChange={(v) => setSort(v as SortKey)}
              >
                <TabsList className="h-8">
                  <TabsTrigger value="newest" className="h-6 px-3 text-xs">
                    新着順
                  </TabsTrigger>
                  <TabsTrigger
                    value="popular"
                    className="h-6 gap-1 px-3 text-xs"
                  >
                    <Flame className="h-3 w-3" />
                    人気順
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {regularPosts.length === 0 ? (
              <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed bg-muted/20 py-16 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground/30" />
                <div>
                  <p className="text-base font-medium">まだ投稿がありません</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    最初の投稿者になりましょう
                  </p>
                </div>
                <NewPostDialog onSubmit={handleNewPost} />
              </div>
            ) : (
              <div className="space-y-3">
                {regularPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>

          {/* 属性バッジ凡例 */}
          <Card className="border-dashed">
            <CardContent className="p-4">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5" />
                投稿者バッジの見方
              </p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(ROLE_STYLES) as AuthorRole[]).map((role) => (
                  <RoleBadge key={role} role={role} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
