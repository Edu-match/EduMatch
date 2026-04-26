"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  ChevronDown,
  ChevronUp,
  Flame,
  Heart,
  LinkIcon,
  Loader2,
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
} from "@/lib/mock-forum";
import { RelativeTime } from "@/components/community/relative-time";
import { ForumRoomIcon, ROOM_BG_COLORS } from "@/components/community/forum-room-icon";
import { useAuthUser } from "@/components/community/answer-section";

// ─── セッションID（ゲストいいね用） ──────────────────────

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = sessionStorage.getItem("forum_session_id");
  if (!sid) {
    sid = `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem("forum_session_id", sid);
  }
  return sid;
}

// ─── 定数 ────────────────────────────────────────────────

/** アカウントの organization_type → AuthorRole 変換 */
const ORG_TYPE_TO_ROLE: Record<string, AuthorRole> = {
  elementary:  "教員",
  "junior-high": "教員",
  "high-school": "教員",
  university:  "専門家",
  company:     "企業",
  parent:      "一般",
  student:     "学生",
  other:       "一般",
};

/** organization_type からフォーラム表示ロールを決定（不明時は "一般"） */
function resolveAuthorRole(organizationType: string | null): AuthorRole {
  if (!organizationType) return "一般";
  return ORG_TYPE_TO_ROLE[organizationType] ?? "一般";
}

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

// ─── AI検定合格バッジ ──────────────────────────────────────

function AiKenteiBadge() {
  return (
    <span
      title="AI検定 合格者"
      className="inline-flex items-center gap-0.5 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700"
    >
      <Sparkles className="h-2.5 w-2.5" />
      AI検定合格
    </span>
  );
}

// ─── アバター ──────────────────────────────────────────────

function Avatar({ name, role, isAi, size = "md" }: { name: string; role: AuthorRole; isAi?: boolean; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const textSize = size === "sm" ? "text-xs" : "text-sm";
  if (isAi) {
    return (
      <div className={`flex ${dim} shrink-0 items-center justify-center rounded-full border border-violet-200 bg-violet-100 text-violet-700`}>
        <Bot className={iconSize} />
      </div>
    );
  }
  const s = ROLE_STYLES[role];
  const initials = role === "匿名" ? "?" : name.charAt(0);
  return (
    <div className={`flex ${dim} shrink-0 items-center justify-center rounded-full border font-bold ${s.bg} ${s.text} ${s.border} ${textSize}`}>
      {initials}
    </div>
  );
}

// ─── AIストリーミング返信カード ────────────────────────────

function AiStreamingReply({ streamText }: { streamText: string }) {
  return (
    <div className="relative pl-7">
      {/* シナプス縦線 */}
      <span aria-hidden className="absolute left-3 top-0 bottom-0 w-px bg-violet-200" />
      {/* 接続ドット */}
      <span aria-hidden className="absolute left-2.5 top-5 h-1.5 w-1.5 rounded-full bg-violet-400" />

      <div className="flex gap-3">
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
            <span className="inline-block w-0.5 h-4 bg-violet-500 ml-0.5 animate-pulse align-text-bottom" />
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── 返信カード ───────────────────────────────────────────

function ReplyCard({ reply, isAi }: { reply: ForumReply & { isAi?: boolean }; isAi?: boolean }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(reply.likeCount);

  const toggleLike = async () => {
    // 楽観的UI
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((n) => (newLiked ? n + 1 : n - 1));

    try {
      await fetch("/api/forum/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          targetId: reply.id,
          targetType: "reply",
          sessionId: getSessionId(),
        }),
      });
    } catch {
      // ネットワークエラー時はロールバック
      setLiked(!newLiked);
      setLikeCount((n) => (newLiked ? n - 1 : n + 1));
    }
  };

  return (
    <div className="relative pl-7">
      {/* シナプス縦線 */}
      <span aria-hidden className={`absolute left-3 top-0 bottom-0 w-px ${isAi ? "bg-violet-200" : "bg-muted"}`} />
      {/* 接続ドット */}
      <span aria-hidden className={`absolute left-2.5 top-5 h-1.5 w-1.5 rounded-full ${isAi ? "bg-violet-400" : "bg-muted-foreground/40"}`} />

      <div className="flex gap-3">
        <Avatar name={reply.authorName} role={reply.authorRole as AuthorRole} isAi={isAi} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`text-sm font-semibold ${isAi ? "text-violet-800" : ""}`}>{reply.authorName}</span>
            {isAi ? <AiBadge /> : <RoleBadge role={reply.authorRole as AuthorRole} />}
            {!isAi && reply.aiKenteiPassed && <AiKenteiBadge />}
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
    </div>
  );
}

// ─── 投稿カード（ストリーミング対応） ──────────────────────

function PostCardWithStream({
  post,
  streamText,
  roomId,
  roomName,
  weeklyTopic,
  aiDiscussion,
  onReplyAdded,
  userName,
  isLoggedIn,
  avatarUrl,
  organizationType,
  aiKenteiPassed,
}: {
  post: ForumPost;
  streamText: string | null;
  roomId: string;
  roomName: string;
  weeklyTopic: string;
  aiDiscussion: boolean;
  onReplyAdded: (postId: string, reply: ForumReply) => void;
  userName: string;
  isLoggedIn: boolean;
  avatarUrl?: string | null;
  organizationType?: string | null;
  aiKenteiPassed?: boolean;
}) {
  const resolvedReplyRole = resolveAuthorRole(organizationType ?? null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isAnonReplyState, setIsAnonReplyState] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);

  const replies = post.replies ?? [];
  const isStreaming = streamText !== null;
  const autoOpenReplies = repliesOpen || isStreaming;
  const hasReplies = replies.length > 0;

  const toggleLike = async () => {
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((n) => (newLiked ? n + 1 : n - 1));

    try {
      await fetch("/api/forum/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          targetId: post.id,
          targetType: "post",
          sessionId: getSessionId(),
        }),
      });
    } catch {
      setLiked(!newLiked);
      setLikeCount((n) => (newLiked ? n - 1 : n + 1));
    }
  };

  const isAnonReply = isAnonReplyState;
  const effectiveReplyRole: AuthorRole = isAnonReply ? "匿名" : resolvedReplyRole;
  const canSubmitReply = !!replyText.trim() && !submittingReply;

  const submitReply = async () => {
    if (!canSubmitReply) return;
    setSubmittingReply(true);

    const authorName = isAnonReply
      ? "匿名ユーザー"
      : (isLoggedIn && userName ? userName : "ゲスト");

    try {
      const res = await fetch(`/api/forum/posts/${post.id}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          authorName,
          authorRole: effectiveReplyRole,
          replyBody: replyText.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onReplyAdded(post.id, data.reply);
        setReplyText("");
        setShowReplyForm(false);
        setRepliesOpen(true);
      }
    } finally {
      setSubmittingReply(false);
    }
  };

  return (
    <div className={`rounded-xl border bg-card shadow-xs transition-shadow hover:shadow-sm ${post.isPinned ? "border-amber-300 bg-amber-50/60 shadow-amber-100/60" : ""}`}>
      {/* 注目バナー */}
      {post.isPinned && (
        <div className="flex items-center gap-2 rounded-t-xl border-b border-amber-200 bg-amber-100/70 px-5 py-2">
          <Pin className="h-3.5 w-3.5 fill-amber-500 text-amber-500" aria-hidden />
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700">注目</span>
          <span className="ml-1 text-xs text-amber-600/80">運営ピックアップ</span>
        </div>
      )}
      <div className="p-5">

        <div className="flex gap-3">
          <Avatar name={post.authorName} role={post.authorRole as AuthorRole} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-sm font-semibold">{post.authorName}</span>
              <RoleBadge role={post.authorRole as AuthorRole} />
              {post.aiKenteiPassed && <AiKenteiBadge />}
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
          <div className="mt-4 ml-12 overflow-hidden rounded-xl border bg-card">
            {/* 返信者情報 */}
            <div className="flex items-center gap-2.5 border-b bg-muted/20 px-4 py-2.5">
              <UserAvatar
                name={isAnonReply ? "匿名" : (isLoggedIn ? userName : "ゲスト")}
                avatarUrl={isAnonReply ? null : avatarUrl}
                size={26}
                isAnon={isAnonReply}
              />
              <span className="text-xs font-medium text-foreground">
                {isAnonReply ? "匿名ユーザー" : (isLoggedIn ? userName : "ゲスト")}
              </span>
              {!isAnonReply && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <RoleBadge role={effectiveReplyRole} />
                  {aiKenteiPassed && <AiKenteiBadge />}
                </>
              )}
              <div className="ml-auto">
                <button
                  type="button"
                  onClick={() => setIsAnonReplyState((v) => !v)}
                  className={[
                    "rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
                    isAnonReply
                      ? `${ROLE_STYLES["匿名"].bg} ${ROLE_STYLES["匿名"].text} ${ROLE_STYLES["匿名"].border}`
                      : "border-transparent text-muted-foreground hover:bg-muted",
                  ].join(" ")}
                >
                  {ROLE_STYLES["匿名"].icon} 匿名
                </button>
              </div>
            </div>

            {/* テキスト入力 */}
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="返信を入力…"
              rows={3}
              className="w-full resize-none bg-transparent px-4 py-3 text-sm leading-6 outline-none placeholder:text-muted-foreground/50"
              autoFocus
            />

            {/* フッター */}
            <div className="flex items-center justify-end gap-2 border-t bg-muted/20 px-4 py-2">
              <Button variant="ghost" size="sm" onClick={() => { setShowReplyForm(false); setReplyText(""); }} className="h-7 text-xs">
                キャンセル
              </Button>
              <Button size="sm" onClick={submitReply} disabled={!canSubmitReply} className="h-7 rounded-full px-4 text-xs gap-1.5">
                {submittingReply && <Loader2 className="h-3 w-3 animate-spin" />}
                返信する
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 返信 + AIストリーミング */}
      {(autoOpenReplies && (hasReplies || isStreaming)) && (
        <div className="border-t bg-muted/10 px-5 py-4 space-y-4">
          {replies.map((reply) => (
            <ReplyCard key={reply.id} reply={reply as ForumReply & { isAi?: boolean }} isAi={(reply as ForumReply & { isAi?: boolean }).isAi} />
          ))}
          {isStreaming && streamText !== null && (
            streamText === "" ? (
              <div className="relative pl-7">
                <span aria-hidden className="absolute left-3 top-0 bottom-0 w-px bg-violet-200" />
                <span aria-hidden className="absolute left-2.5 top-5 h-1.5 w-1.5 rounded-full bg-violet-400" />
                <div className="flex gap-3">
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

// ─── ユーザーアバター（画像 or イニシャル）────────────────

function UserAvatar({
  name,
  avatarUrl,
  size = 36,
  isAnon = false,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  isAnon?: boolean;
}) {
  const dim = `h-[${size}px] w-[${size}px]`;
  if (isAnon) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm"
      >
        <span aria-hidden>🎭</span>
      </div>
    );
  }
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full object-cover ring-2 ring-primary/10"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className="flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary"
    >
      {name.charAt(0) || "?"}
    </div>
  );
}

// ─── 投稿フォームダイアログ ──────────────────────────────

type PostDraft = { body: string; authorRole: AuthorRole; relatedArticleUrl: string; displayName: string };

const MAX_BODY = 800;

function NewPostDialog({
  onSubmit,
  userName,
  avatarUrl,
  isLoggedIn,
  weeklyTopic,
  submitting,
  organizationType,
  aiKenteiPassed,
}: {
  onSubmit: (draft: PostDraft) => Promise<void>;
  userName: string;
  avatarUrl?: string | null;
  isLoggedIn: boolean;
  weeklyTopic: string;
  submitting: boolean;
  organizationType?: string | null;
  aiKenteiPassed?: boolean;
}) {
  const resolvedRole = resolveAuthorRole(organizationType ?? null);
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [isAnon, setIsAnon] = useState(false);
  const [relatedArticleUrl, setRelatedArticleUrl] = useState("");
  const [showUrl, setShowUrl] = useState(false);

  useEffect(() => {
    if (open) {
      setBody("");
      setIsAnon(false);
      setRelatedArticleUrl("");
      setShowUrl(false);
    }
  }, [open]);

  const effectiveRole: AuthorRole = isAnon ? "匿名" : resolvedRole;
  const displayName = isAnon ? "匿名ユーザー" : (userName || "ゲスト");
  const remaining = MAX_BODY - body.length;
  const canSubmit = body.trim().length > 0 && body.length <= MAX_BODY && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onSubmit({ body, authorRole: effectiveRole, relatedArticleUrl, displayName });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2 w-full sm:w-auto">
          <PenSquare className="h-4 w-4" />投稿する
        </Button>
      </DialogTrigger>

      <DialogContent className="gap-0 p-0 sm:max-w-xl overflow-hidden">
        {/* ヘッダー */}
        <div className="border-b px-6 py-4">
          <DialogTitle className="text-base font-semibold">投稿する</DialogTitle>
          <DialogDescription className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
            {weeklyTopic}
          </DialogDescription>
        </div>

        {/* 投稿者情報バー */}
        <div className="flex items-center gap-2.5 border-b bg-muted/20 px-6 py-2.5">
          <UserAvatar name={displayName} avatarUrl={isAnon ? null : avatarUrl} size={28} isAnon={isAnon} />
          <span className="text-xs font-medium text-foreground">{displayName}</span>
          {!isAnon && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <RoleBadge role={effectiveRole} />
              {aiKenteiPassed && <AiKenteiBadge />}
            </>
          )}
          <div className="ml-auto">
            <button
              type="button"
              onClick={() => setIsAnon((v) => !v)}
              className={[
                "rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition-colors",
                isAnon
                  ? `${ROLE_STYLES["匿名"].bg} ${ROLE_STYLES["匿名"].text} ${ROLE_STYLES["匿名"].border}`
                  : "border-transparent text-muted-foreground hover:bg-muted",
              ].join(" ")}
            >
              {ROLE_STYLES["匿名"].icon} 匿名
            </button>
          </div>
        </div>

        {/* 本文エリア */}
        <div className="px-6 pt-4 pb-3">
          <textarea
            id="post-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="今週のお題について、あなたの経験や意見を書いてください…"
            rows={6}
            maxLength={MAX_BODY + 50}
            className="w-full resize-none bg-transparent text-sm leading-7 text-foreground placeholder:text-muted-foreground/60 outline-none"
            autoFocus={open}
          />

          {/* 関連URL（展開式） */}
          {showUrl && (
            <div className="mt-3">
              <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                <LinkIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <Input
                  type="url"
                  value={relatedArticleUrl}
                  onChange={(e) => setRelatedArticleUrl(e.target.value)}
                  placeholder="https://... （関連記事のURL）"
                  className="h-7 border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
                />
              </div>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="border-t bg-muted/20 px-6 py-3">
          <div className="flex items-center justify-between gap-3">
            {/* 左: URLボタン */}
            <button
              type="button"
              title="関連記事URLを追加"
              onClick={() => setShowUrl((v) => !v)}
              className={[
                "rounded-full border p-1.5 transition-colors",
                showUrl ? "border-primary/40 bg-primary/5 text-primary" : "border-transparent text-muted-foreground hover:bg-muted",
              ].join(" ")}
            >
              <LinkIcon className="h-3 w-3" />
            </button>

            {/* 右: 文字数 + 送信 */}
            <div className="flex shrink-0 items-center gap-3">
              <span className={`text-[11px] tabular-nums ${remaining < 0 ? "text-destructive font-semibold" : remaining < 50 ? "text-amber-500" : "text-muted-foreground/60"}`}>
                {remaining}
              </span>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                size="sm"
                className="gap-1.5 rounded-full px-5"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PenSquare className="h-3.5 w-3.5" />}
                投稿
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── AI ストリーミング hook ───────────────────────────────

function useAiComment() {
  const [pending, setPending] = useState<string | null>(null);
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
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { pending: aiPending, streamTexts, generate } = useAiComment();

  // 投稿一覧取得
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/forum/rooms/${room.id}/posts`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.posts) setPosts(data.posts);
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [room.id]);

  const pinnedPosts = useMemo(() => posts.filter((p) => p.isPinned), [posts]);

  const regularPosts = useMemo<ForumPost[]>(() => {
    const unpinned = posts.filter((p) => !p.isPinned);
    if (sort === "popular") return [...unpinned].sort((a, b) => b.likeCount - a.likeCount);
    return [...unpinned].sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
  }, [posts, sort]);

  const handleNewPost = useCallback(async (draft: { body: string; authorRole: AuthorRole; relatedArticleUrl: string; displayName: string }) => {
    if (submitting) return;
    setSubmitting(true);

    const isAnon = draft.authorRole === "匿名";
    const authorName = isAnon
      ? "匿名ユーザー"
      : (draft.displayName.trim() || (auth.isLoggedIn && auth.name ? auth.name : "ゲスト"));

    try {
      const res = await fetch(`/api/forum/rooms/${room.id}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          authorName,
          authorRole: draft.authorRole,
          postBody: draft.body.trim(),
          relatedArticleUrl: draft.relatedArticleUrl.trim() || undefined,
        }),
      });

      if (!res.ok) {
        console.error("投稿に失敗しました", await res.text());
        return;
      }

      const data = await res.json();
      const newPost: ForumPost = data.post;
      setPosts((prev) => [newPost, ...prev]);

      if (!room.aiDiscussion) return;

      const recentContext = posts.slice(0, 5).map((p) => ({ authorName: p.authorName, body: p.body }));
      const aiText = await generate(newPost.id, newPost.body, room.name, room.weeklyTopic, recentContext);

      if (aiText) {
        // AI返信をDBにも保存
        try {
          await fetch(`/api/forum/posts/${newPost.id}/replies`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              authorName: "AIファシリテーター",
              authorRole: "専門家",
              replyBody: aiText,
            }),
          });
        } catch {
          // 保存失敗しても表示上は反映済み
        }

        const aiReply: ForumReply & { isAi: boolean } = {
          id: `ai-r-${Date.now()}`,
          authorName: "AIファシリテーター",
          authorRole: "専門家",
          body: aiText,
          likeCount: 0,
          postedAt: new Date().toISOString(),
          isAi: true,
        };
        setPosts((prev) =>
          prev.map((p) =>
            p.id !== newPost.id ? p : { ...p, replies: [...(p.replies ?? []), aiReply] }
          )
        );
      }
    } finally {
      setSubmitting(false);
    }
  }, [auth, room, posts, generate, submitting]);

  const handleReplyAdded = useCallback((postId: string, reply: ForumReply) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id !== postId ? p : { ...p, replies: [...(p.replies ?? []), reply] }
      )
    );
  }, []);

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
                    <MessageSquare className="h-3.5 w-3.5" />{posts.length} 投稿
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />{room.participantCount} 人参加
                  </span>
                </div>
              </div>
            </div>
            <div className="shrink-0">
              <NewPostDialog
                onSubmit={handleNewPost}
                userName={auth.name}
                avatarUrl={auth.avatarUrl}
                isLoggedIn={auth.isLoggedIn}
                weeklyTopic={room.weeklyTopic}
                submitting={submitting}
                organizationType={auth.organizationType}
                aiKenteiPassed={auth.aiKenteiPassed}
              />
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute -top-20 -right-20 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
      </section>

      {/* ─── 今週のお題（大きな吹き出しボックス） ─── */}
      <div className="border-b bg-gradient-to-r from-primary/8 via-primary/4 to-background/80">
        <div className="container py-6">
          <div className="mx-auto max-w-3xl">
            <div className="relative rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 px-6 py-5 shadow-sm">
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-primary/70">
                <Sparkles className="h-3.5 w-3.5" />
                今週のお題
              </p>
              <p className="text-base font-semibold leading-7 sm:text-lg">{room.weeklyTopic}</p>
              <p className="mt-2 text-xs text-muted-foreground">このテーマについて、あなたの経験や考えを投稿しよう</p>
              {/* 吹き出しの尻尾 */}
              <span
                aria-hidden
                className="absolute -bottom-2 left-10 h-4 w-4 rotate-45 border-b border-r border-primary/20 bg-gradient-to-br from-primary/5 to-primary/8"
              />
            </div>
          </div>
        </div>
      </div>

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

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* 注目投稿 */}
              {pinnedPosts.length > 0 && (
                <div className="space-y-3">
                  {pinnedPosts.map((post) => (
                    <PostCardWithStream
                      key={post.id}
                      post={post}
                      streamText={aiPending === post.id ? (streamTexts[post.id] ?? "") : null}
                      roomId={room.id}
                      roomName={room.name}
                      weeklyTopic={room.weeklyTopic}
                      aiDiscussion={aiEnabled}
                      onReplyAdded={handleReplyAdded}
                      userName={auth.name}
                      isLoggedIn={auth.isLoggedIn}
                      avatarUrl={auth.avatarUrl}
                      organizationType={auth.organizationType}
                      aiKenteiPassed={auth.aiKenteiPassed}
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
                    <NewPostDialog
                      onSubmit={handleNewPost}
                      userName={auth.name}
                      avatarUrl={auth.avatarUrl}
                      isLoggedIn={auth.isLoggedIn}
                      weeklyTopic={room.weeklyTopic}
                      submitting={submitting}
                      organizationType={auth.organizationType}
                      aiKenteiPassed={auth.aiKenteiPassed}
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {regularPosts.map((post) => (
                      <PostCardWithStream
                        key={post.id}
                        post={post}
                        streamText={aiPending === post.id ? (streamTexts[post.id] ?? "") : null}
                        roomId={room.id}
                        roomName={room.name}
                        weeklyTopic={room.weeklyTopic}
                        aiDiscussion={aiEnabled}
                        onReplyAdded={handleReplyAdded}
                        userName={auth.name}
                        isLoggedIn={auth.isLoggedIn}
                        avatarUrl={auth.avatarUrl}
                        organizationType={auth.organizationType}
                        aiKenteiPassed={auth.aiKenteiPassed}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

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
