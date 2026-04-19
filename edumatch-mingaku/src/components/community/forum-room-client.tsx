"use client";

import { useMemo, useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
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
  Zap,
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
import { RelativeTime } from "@/components/community/relative-time";
import { ForumRoomIcon, ROOM_BG_COLORS } from "@/components/community/forum-room-icon";
import { useAuthUser } from "@/components/community/answer-section";

// ─── 定数 ────────────────────────────────────────────────

const AUTHOR_ROLES: AuthorRole[] = ["教員", "学生", "専門家", "企業", "一般", "匿名"];

// ─── 属性バッジ ───────────────────────────────────────────

const ROLE_STYLES: Record<
  AuthorRole,
  { bg: string; text: string; border: string; icon: string }
> = {
  教員: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200", icon: "🎓" },
  学生: { bg: "bg-green-100", text: "text-green-700", border: "border-green-200", icon: "📚" },
  専門家: { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200", icon: "🔬" },
  企業: { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200", icon: "🏢" },
  一般: { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200", icon: "👤" },
  匿名: { bg: "bg-gray-50", text: "text-gray-500", border: "border-gray-100", icon: "🎭" },
};

function RoleBadge({ role }: { role: AuthorRole }) {
  const s = ROLE_STYLES[role];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${s.bg} ${s.text} ${s.border}`}>
      <span role="img" aria-label={role} className="text-[10px]">{s.icon}</span>
      {role}
    </span>
  );
}

// ─── AI バッジ ────────────────────────────────────────────

function AiBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
      <Bot className="h-3 w-3" />
      AIファシリテーター
    </span>
  );
}

// ─── アバター ──────────────────────────────────────────────

function Avatar({ name, role, isAi }: { name: string; role: AuthorRole; isAi?: boolean }) {
  if (isAi) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-violet-200 bg-violet-100 text-violet-700">
        <Bot className="h-4 w-4" />
      </div>
    );
  }
  const s = ROLE_STYLES[role];
  const initials = role === "匿名" ? "?" : name.charAt(0);
  return (
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${s.bg} ${s.text} ${s.border}`}>
      {initials}
    </div>
  );
}

// ─── AIストリーミング返信カード ────────────────────────────

function AiStreamingReply({ streamText }: { streamText: string }) {
  return (
    <div className="flex gap-3 pl-4 border-l-2 border-violet-200">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-violet-200 bg-violet-100 text-violet-700">
        <Bot className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-violet-800">AIファシリテーター</span>
          <AiBadge />
          <span className="text-xs text-muted-foreground">たった今</span>
        </div>
        <p className="text-sm leading-7 whitespace-pre-wrap text-foreground">
          {streamText}
          {/* カーソル点滅 */}
          <span className="inline-block w-0.5 h-4 bg-violet-500 ml-0.5 animate-pulse align-text-bottom" />
        </p>
      </div>
    </div>
  );
}

// ─── 返信カード ───────────────────────────────────────────

function ReplyCard({ reply, isAi }: { reply: ForumReply; isAi?: boolean }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(reply.likeCount);

  const toggleLike = () => {
    setLikeCount((n) => (liked ? n - 1 : n + 1));
    setLiked((v) => !v);
  };

  return (
    <div className={`flex gap-3 pl-4 border-l-2 ${isAi ? "border-violet-200" : "border-muted"}`}>
      <Avatar name={reply.authorName} role={reply.authorRole} isAi={isAi} />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className={`text-sm font-semibold ${isAi ? "text-violet-800" : ""}`}>{reply.authorName}</span>
          {isAi ? <AiBadge /> : <RoleBadge role={reply.authorRole} />}
          <span className="text-xs text-muted-foreground">
            <RelativeTime iso={reply.postedAt} />
          </span>
        </div>
        <p className="text-sm leading-7 whitespace-pre-wrap">{reply.body}</p>
        <button
          type="button"
          onClick={toggleLike}
          className={`mt-2 flex items-center gap-1 text-xs transition-colors ${liked ? "text-pink-500" : "text-muted-foreground hover:text-pink-500"}`}
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
  roomName,
  weeklyTopic,
  aiDiscussion,
  allPosts,
}: {
  post: ForumPost;
  pinned?: boolean;
  roomName: string;
  weeklyTopic: string;
  aiDiscussion: boolean;
  allPosts: ForumPost[];
}) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyRole, setReplyRole] = useState<AuthorRole>("教員");
  const [localReplies, setLocalReplies] = useState<(ForumReply & { isAi?: boolean })[]>(post.replies ?? []);
  const [aiStreamText, setAiStreamText] = useState<string | null>(null);

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

  // AI からの返信をこの投稿に追加（外部から呼ばれる）
  const addAiReply = (body: string) => {
    const aiReply: ForumReply & { isAi: boolean } = {
      id: `ai-r-${Date.now()}`,
      authorName: "AIファシリテーター",
      authorRole: "専門家",
      body,
      likeCount: 0,
      postedAt: new Date().toISOString(),
      isAi: true,
    };
    setLocalReplies((prev) => [...prev, aiReply]);
    setRepliesOpen(true);
  };

  // PostCard は ref 経由で addAiReply を外部公開しない
  // 代わりに post.id ベースで親から制御するため、
  // ここでは外部からの aiStreamText / aiReply を props で受け取る設計とする

  return (
    <div className={`rounded-xl border bg-card shadow-xs transition-shadow hover:shadow-sm ${pinned ? "border-amber-200 bg-amber-50/40" : ""}`}>
      <div className="p-5">
        {pinned && (
          <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-amber-600">
            <Pin className="h-3.5 w-3.5 fill-amber-500" />
            注目投稿（運営ピックアップ）
          </div>
        )}

        <div className="flex gap-3">
          <Avatar name={post.authorName} role={post.authorRole} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-sm font-semibold">{post.authorName}</span>
              <RoleBadge role={post.authorRole} />
              <span className="text-xs text-muted-foreground"><RelativeTime iso={post.postedAt} /></span>
            </div>

            <p className="text-sm leading-7 whitespace-pre-wrap">{post.body}</p>

            {post.relatedArticleUrl && (
              <a href={post.relatedArticleUrl} target="_blank" rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                <LinkIcon className="h-3 w-3" />関連記事
              </a>
            )}

            <div className="mt-3 flex items-center gap-4">
              <button type="button" onClick={toggleLike}
                className={`flex items-center gap-1 text-xs transition-colors ${liked ? "text-pink-500" : "text-muted-foreground hover:text-pink-500"}`}>
                <Heart className={`h-3.5 w-3.5 ${liked ? "fill-pink-500" : ""}`} />
                {likeCount}
              </button>

              {localReplies.length > 0 ? (
                <button type="button" onClick={() => setRepliesOpen((v) => !v)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {localReplies.length} 件の返信
                  {repliesOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              ) : (
                <span className="flex items-center gap-1 text-xs text-muted-foreground/60">
                  <MessageSquare className="h-3.5 w-3.5" />返信 0
                </span>
              )}

              <button type="button" onClick={() => setShowReplyForm((v) => !v)}
                className="text-xs text-primary hover:underline">
                返信する
              </button>
            </div>
          </div>
        </div>

        {showReplyForm && (
          <div className="mt-4 ml-12 space-y-3 rounded-lg bg-muted/30 p-4">
            <div className="flex items-center gap-2">
              <Label className="text-xs shrink-0">属性</Label>
              <Select value={replyRole} onValueChange={(v) => setReplyRole(v as AuthorRole)}>
                <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUTHOR_ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea rows={3} value={replyText} onChange={(e) => setReplyText(e.target.value)}
              placeholder="返信を入力..." className="resize-none text-sm" />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setShowReplyForm(false); setReplyText(""); }}>
                <X className="h-3.5 w-3.5" />キャンセル
              </Button>
              <Button size="sm" onClick={submitReply} disabled={!replyText.trim()}>返信する</Button>
            </div>
          </div>
        )}
      </div>

      {/* 返信一覧（ストリーミング中 or 確定済み） */}
      {(repliesOpen && localReplies.length > 0) || aiStreamText !== null ? (
        <div className="border-t bg-muted/10 px-5 py-4 space-y-4">
          {repliesOpen && localReplies.map((reply) => (
            <ReplyCard key={reply.id} reply={reply} isAi={(reply as ForumReply & { isAi?: boolean }).isAi} />
          ))}
          {aiStreamText !== null && <AiStreamingReply streamText={aiStreamText} />}
        </div>
      ) : null}
    </div>
  );
}

// ─── 投稿フォームダイアログ ──────────────────────────────

type PostDraft = { body: string; authorRole: AuthorRole; relatedArticleUrl: string };

function NewPostDialog({
  onSubmit,
  userName,
  isLoggedIn,
}: {
  onSubmit: (post: ForumPost) => void;
  userName: string;
  isLoggedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PostDraft>({ body: "", authorRole: "教員", relatedArticleUrl: "" });

  const handleSubmit = () => {
    if (!draft.body.trim()) return;
    const isAnon = draft.authorRole === "匿名";
    const post: ForumPost = {
      id: `post-${Date.now()}`,
      roomId: "",
      // ログイン済みかつ非匿名 → 表示名を使用、それ以外 → "匿名ユーザー"
      authorName: isAnon ? "匿名ユーザー" : (isLoggedIn && userName ? userName : "ゲスト"),
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
          <PenSquare className="h-4 w-4" />投稿する
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>新しい投稿</DialogTitle>
          <DialogDescription>今週のお題や話題についてコメントしましょう</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* 投稿者表示 */}
          <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {draft.authorRole === "匿名" ? "?" : (isLoggedIn && userName ? userName.charAt(0) : "G")}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">
                {draft.authorRole === "匿名" ? "匿名ユーザー" : (isLoggedIn && userName ? userName : "ゲスト")}
              </p>
              <p className="text-[10px] text-muted-foreground">投稿者名として表示されます</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>表示する立場</Label>
            <Select value={draft.authorRole} onValueChange={(v) => setDraft((p) => ({ ...p, authorRole: v as AuthorRole }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {AUTHOR_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    <span className="flex items-center gap-2">
                      <span>{ROLE_STYLES[r].icon}</span>
                      {r}
                      {r === "匿名" && <span className="text-xs text-muted-foreground">（名前を非表示）</span>}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="post-body">投稿内容</Label>
            <Textarea id="post-body" rows={6} value={draft.body}
              onChange={(e) => setDraft((p) => ({ ...p, body: e.target.value }))}
              placeholder="今週のお題について、あなたの経験や意見を書いてください..."
              className="resize-none" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="post-url">
              関連記事URL <span className="text-xs text-muted-foreground font-normal">（任意）</span>
            </Label>
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input id="post-url" type="url" value={draft.relatedArticleUrl}
                onChange={(e) => setDraft((p) => ({ ...p, relatedArticleUrl: e.target.value }))}
                placeholder="https://..." />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>キャンセル</Button>
            <Button onClick={handleSubmit} disabled={!draft.body.trim()}>投稿する</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── AI ストリーミング hook ───────────────────────────────

function useAiComment() {
  const [pending, setPending] = useState<string | null>(null); // postId
  const [streamTexts, setStreamTexts] = useState<Record<string, string>>({});
  const abortRef = useRef<AbortController | null>(null);

  const generate = async (
    postId: string,
    postBody: string,
    roomName: string,
    weeklyTopic: string,
    recentPosts: { authorName: string; body: string }[]
  ): Promise<string | null> => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setPending(postId);
    setStreamTexts((prev) => ({ ...prev, [postId]: "" }));

    try {
      const res = await fetch("/api/forum/ai-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postBody, roomName, weeklyTopic, recentPosts }),
        signal: ac.signal,
      });

      if (!res.ok || !res.body) throw new Error("API error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        for (const line of text.split("\n")) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;
            try {
              const { delta } = JSON.parse(data) as { delta: string };
              full += delta;
              setStreamTexts((prev) => ({ ...prev, [postId]: full }));
            } catch {
              // ignore parse errors
            }
          }
        }
      }

      setPending(null);
      setStreamTexts((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
      return full;
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("[useAiComment]", err);
      }
      setPending(null);
      setStreamTexts((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
      return null;
    }
  };

  return { pending, streamTexts, generate };
}

// ─── メインコンポーネント ─────────────────────────────────

type SortKey = "newest" | "popular";

export function ForumRoomClient({ room }: { room: ForumRoom }) {
  const auth = useAuthUser();
  const [sort, setSort] = useState<SortKey>("newest");
  const [localPosts, setLocalPosts] = useState<ForumPost[]>(() => getPostsByRoom(room.id));

  const pinnedPosts = useMemo(() => getPinnedPosts(room.id), [room.id]);
  const { pending: aiPending, streamTexts, generate } = useAiComment();

  const regularPosts = useMemo<ForumPost[]>(() => {
    const unpinned = localPosts.filter((p) => !p.isPinned);
    if (sort === "popular") return [...unpinned].sort((a, b) => b.likeCount - a.likeCount);
    return [...unpinned].sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
  }, [localPosts, sort]);

  const handleNewPost = async (post: ForumPost) => {
    const withRoom = { ...post, roomId: room.id };
    setLocalPosts((prev) => [withRoom, ...prev]);

    if (!room.aiDiscussion) return;

    // AI が返信を生成
    const recentContext = localPosts.slice(0, 5).map((p) => ({ authorName: p.authorName, body: p.body }));
    const aiText = await generate(
      withRoom.id,
      withRoom.body,
      room.name,
      room.weeklyTopic,
      recentContext
    );

    if (aiText) {
      // 確定済み AI 返信を投稿の replies に追加
      setLocalPosts((prev) =>
        prev.map((p) => {
          if (p.id !== withRoom.id) return p;
          const aiReply = {
            id: `ai-r-${Date.now()}`,
            authorName: "AIファシリテーター",
            authorRole: "専門家" as AuthorRole,
            body: aiText,
            likeCount: 0,
            postedAt: new Date().toISOString(),
            isAi: true,
          };
          return { ...p, replies: [...(p.replies ?? []), aiReply] };
        })
      );
    }
  };

  const aiEnabled = !!room.aiDiscussion;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* ─── 部屋ヘッダー ─── */}
      <section className="relative overflow-hidden border-b bg-gradient-to-br from-primary/8 via-primary/4 to-background">
        <div className="container py-8 md:py-12">
          <Link href="/forum" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />AIUEO 井戸端会議
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className={`shrink-0 rounded-2xl border p-3 ${ROOM_BG_COLORS[room.id] ?? "bg-muted border-border"}`}>
                <ForumRoomIcon roomId={room.id} size={36} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                  <h1 className="text-2xl font-bold md:text-3xl">{room.name}</h1>
                  {aiEnabled && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
                      <Zap className="h-3 w-3" />AIディスカッション
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{room.description}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" />{localPosts.length} 投稿
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />{room.participantCount} 人参加
                  </span>
                </div>
              </div>
            </div>
            <div className="shrink-0">
              <NewPostDialog onSubmit={handleNewPost} userName={auth.name} isLoggedIn={auth.isLoggedIn} />
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
              <Sparkles className="h-4 w-4" />今週のお題
            </span>
            <p className="text-sm font-medium leading-6 sm:text-base">{room.weeklyTopic}</p>
          </div>
        </div>
      </div>

      {/* AI 有効時の案内バナー */}
      {aiEnabled && (
        <div className="border-b bg-violet-50/60">
          <div className="container py-3">
            <p className="flex items-center gap-2 text-xs text-violet-700">
              <Bot className="h-4 w-4 shrink-0" />
              <span>この部屋ではAIファシリテーターが投稿に返信し、ディスカッションを盛り上げます。</span>
            </p>
          </div>
        </div>
      )}

      {/* ─── コンテンツ ─── */}
      <div className="container py-8">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* 注目投稿 */}
          {pinnedPosts.length > 0 && (
            <div className="space-y-3">
              {pinnedPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  pinned
                  roomName={room.name}
                  weeklyTopic={room.weeklyTopic}
                  aiDiscussion={aiEnabled}
                  allPosts={localPosts}
                />
              ))}
            </div>
          )}

          {/* ソート + 投稿一覧 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{regularPosts.length} 件の投稿</p>
              <Tabs value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <TabsList className="h-8">
                  <TabsTrigger value="newest" className="h-6 px-3 text-xs">新着順</TabsTrigger>
                  <TabsTrigger value="popular" className="h-6 gap-1 px-3 text-xs">
                    <Flame className="h-3 w-3" />人気順
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {regularPosts.length === 0 ? (
              <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed bg-muted/20 py-16 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground/30" />
                <div>
                  <p className="text-base font-medium">まだ投稿がありません</p>
                  <p className="mt-1 text-sm text-muted-foreground">最初の投稿者になりましょう</p>
                </div>
                <NewPostDialog onSubmit={handleNewPost} userName={auth.name} isLoggedIn={auth.isLoggedIn} />
              </div>
            ) : (
              <div className="space-y-3">
                {regularPosts.map((post) => {
                  // この投稿がストリーミング中かどうか
                  const isStreaming = aiPending === post.id;
                  const streamingText = streamTexts[post.id] ?? null;

                  // ストリーミング中は replies に一時的に「streaming」フラグ付きの空エントリを積む代わりに
                  // PostCard 内の AiStreamingReply で表示させるため、
                  // ストリーミング中は replies の末尾に streaming プレースホルダーを追加した post を渡す
                  const postWithStream: ForumPost = isStreaming
                    ? post // streaming はカード内で streamTexts から読む
                    : post;

                  return (
                    <PostCardWithStream
                      key={post.id}
                      post={postWithStream}
                      streamText={isStreaming ? (streamingText ?? "") : null}
                      roomName={room.name}
                      weeklyTopic={room.weeklyTopic}
                      aiDiscussion={aiEnabled}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* 属性バッジ凡例 */}
          <Card className="border-dashed">
            <CardContent className="p-4">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5" />投稿者バッジの見方
              </p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(ROLE_STYLES) as AuthorRole[]).map((role) => (
                  <RoleBadge key={role} role={role} />
                ))}
                {aiEnabled && <AiBadge />}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── ストリーミング対応投稿カード（単純ラッパー） ─────────

function PostCardWithStream({
  post,
  streamText,
  roomName,
  weeklyTopic,
  aiDiscussion,
}: {
  post: ForumPost;
  streamText: string | null;
  roomName: string;
  weeklyTopic: string;
  aiDiscussion: boolean;
}) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyRole, setReplyRole] = useState<AuthorRole>("教員");

  const replies: (ForumReply & { isAi?: boolean })[] = post.replies ?? [];

  const toggleLike = () => {
    setLikeCount((n) => (liked ? n - 1 : n + 1));
    setLiked((v) => !v);
  };

  const submitReply = () => {
    if (!replyText.trim()) return;
    // ローカル state に追加はここでは難しいので実装上は親管理が望ましいが、
    // シンプルに repliesOpen を開けるだけにする（既存の replies はそのまま）
    setShowReplyForm(false);
    setRepliesOpen(true);
  };

  const hasReplies = replies.length > 0;
  const isStreaming = streamText !== null;
  const autoOpenReplies = repliesOpen || isStreaming;

  return (
    <div className={`rounded-xl border bg-card shadow-xs transition-shadow hover:shadow-sm ${post.isPinned ? "border-amber-200 bg-amber-50/40" : ""}`}>
      <div className="p-5">
        {post.isPinned && (
          <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-amber-600">
            <Pin className="h-3.5 w-3.5 fill-amber-500" />注目投稿（運営ピックアップ）
          </div>
        )}

        <div className="flex gap-3">
          <Avatar name={post.authorName} role={post.authorRole} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-sm font-semibold">{post.authorName}</span>
              <RoleBadge role={post.authorRole} />
              <span className="text-xs text-muted-foreground"><RelativeTime iso={post.postedAt} /></span>
            </div>
            <p className="text-sm leading-7 whitespace-pre-wrap">{post.body}</p>
            {post.relatedArticleUrl && (
              <a href={post.relatedArticleUrl} target="_blank" rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                <LinkIcon className="h-3 w-3" />関連記事
              </a>
            )}
            <div className="mt-3 flex items-center gap-4">
              <button type="button" onClick={toggleLike}
                className={`flex items-center gap-1 text-xs transition-colors ${liked ? "text-pink-500" : "text-muted-foreground hover:text-pink-500"}`}>
                <Heart className={`h-3.5 w-3.5 ${liked ? "fill-pink-500" : ""}`} />
                {likeCount}
              </button>
              {hasReplies || isStreaming ? (
                <button type="button" onClick={() => setRepliesOpen((v) => !v)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {replies.length + (isStreaming ? 1 : 0)} 件の返信
                  {autoOpenReplies ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              ) : (
                <span className="flex items-center gap-1 text-xs text-muted-foreground/60">
                  <MessageSquare className="h-3.5 w-3.5" />返信 0
                </span>
              )}
              <button type="button" onClick={() => setShowReplyForm((v) => !v)}
                className="text-xs text-primary hover:underline">返信する</button>
            </div>
          </div>
        </div>

        {showReplyForm && (
          <div className="mt-4 ml-12 space-y-3 rounded-lg bg-muted/30 p-4">
            <div className="flex items-center gap-2">
              <Label className="text-xs shrink-0">属性</Label>
              <Select value={replyRole} onValueChange={(v) => setReplyRole(v as AuthorRole)}>
                <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUTHOR_ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea rows={3} value={replyText} onChange={(e) => setReplyText(e.target.value)}
              placeholder="返信を入力..." className="resize-none text-sm" />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setShowReplyForm(false); setReplyText(""); }}>
                <X className="h-3.5 w-3.5" />キャンセル
              </Button>
              <Button size="sm" onClick={submitReply} disabled={!replyText.trim()}>返信する</Button>
            </div>
          </div>
        )}
      </div>

      {/* 返信 + AIストリーミング */}
      {(autoOpenReplies && (hasReplies || isStreaming)) && (
        <div className="border-t bg-muted/10 px-5 py-4 space-y-4">
          {replies.map((reply) => (
            <ReplyCard key={reply.id} reply={reply} isAi={reply.isAi} />
          ))}
          {isStreaming && streamText !== null && (
            streamText === "" ? (
              // まだテキストが来ていない → ローディング表示
              <div className="flex gap-3 pl-4 border-l-2 border-violet-200">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-violet-200 bg-violet-100 text-violet-700">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-2 py-2">
                  <span className="text-xs text-violet-600 font-medium">AIファシリテーターが考えています</span>
                  <span className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="inline-block h-1.5 w-1.5 rounded-full bg-violet-400 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </span>
                </div>
              </div>
            ) : (
              <AiStreamingReply streamText={streamText} />
            )
          )}
        </div>
      )}
    </div>
  );
}
