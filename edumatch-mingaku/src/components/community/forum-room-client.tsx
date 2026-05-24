"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  ChevronDown,
  ChevronUp,
  Flame,
  FileText,
  Heart,
  LogIn,
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
  type ForumPost,
  type ForumReply,
  type ForumRoom,
} from "@/lib/mock-forum";
import {
  type ForumOccupationVisual,
  formatOrganizationTypeDisplay,
  forumOccupationAvatarVisual,
  forumOccupationBadgeText,
} from "@/lib/organization-types";
import { RelativeTime } from "@/components/community/relative-time";
import { ForumRoomIcon, ROOM_BG_COLORS } from "@/components/community/forum-room-icon";
import { useAuthUser } from "@/components/community/answer-section";
import { OpenAiChatButton } from "@/components/ui/open-ai-chat-button";
import { ReportForumContentButton } from "@/components/community/report-forum-content-button";
import { FORUM_AI_FACILITATOR_NAME } from "@/lib/forum-constants";
import { isForumAiFacilitatorReply } from "@/lib/forum-ai-reply";

// ─── 定数 ────────────────────────────────────────────────

const ROLE_STYLES: Record<
  ForumOccupationVisual,
  { bg: string; text: string; border: string; icon: string }
> = {
  教員: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200", icon: "🎓" },
  学生: { bg: "bg-green-100", text: "text-green-700", border: "border-green-200", icon: "📚" },
  専門家: { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200", icon: "🔬" },
  企業: { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200", icon: "🏢" },
  一般: { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200", icon: "👤" },
  匿名: { bg: "bg-gray-50", text: "text-gray-500", border: "border-gray-100", icon: "🎭" },
};

/** 返信・投稿フォームのプレビュー用（auth の職業・役職 → author_role 相当） */
function forumRolePreviewFromProfile(
  organizationType: string | null | undefined,
  organizationTypeOther: string | null | undefined
): string {
  const t = organizationType?.trim();
  if (!t) return "一般";
  if (t === "other" && organizationTypeOther?.trim()) {
    return formatOrganizationTypeDisplay("other", organizationTypeOther);
  }
  return t;
}

/** プロフィールの職業・役職（スラッグ）に応じたバッジ表示 */
function OccupationBadge({ storedAuthorRole }: { storedAuthorRole: string }) {
  const visual = forumOccupationAvatarVisual(storedAuthorRole);
  const label = forumOccupationBadgeText(storedAuthorRole);
  const s = ROLE_STYLES[visual];
  return (
    <span className={`inline-flex max-w-[min(100%,18rem)] items-center gap-1 truncate rounded-full border px-2.5 py-0.5 text-xs font-semibold ${s.bg} ${s.text} ${s.border}`}>
      <span role="img" aria-hidden className="shrink-0 text-[10px]">{s.icon}</span>
      <span className="truncate" title={label}>{label}</span>
    </span>
  );
}

// ─── AI バッジ ────────────────────────────────────────────

function AiBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
      <Bot className="h-3 w-3" />
      AI
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

function Avatar({
  name,
  storedAuthorRole,
  isAi,
  size = "md",
}: {
  name: string;
  storedAuthorRole: string;
  isAi?: boolean;
  size?: "sm" | "md";
}) {
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
  const visual = forumOccupationAvatarVisual(storedAuthorRole);
  const s = ROLE_STYLES[visual];
  const initials = visual === "匿名" ? "?" : name.charAt(0);
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

function ReplyCard({
  reply,
  isAi,
  postAuthorId,
  postAuthorName,
  postPostedAt,
  roomAiDiscussion,
  replyIndex,
  onRequireLogin,
}: {
  reply: ForumReply & { isAi?: boolean };
  isAi?: boolean;
  postAuthorId?: string | null;
  postAuthorName?: string;
  postPostedAt?: string;
  roomAiDiscussion?: boolean;
  replyIndex?: number;
  onRequireLogin: () => void;
}) {
  const legacyAi =
    postAuthorName &&
    postPostedAt &&
    typeof replyIndex === "number" &&
    isForumAiFacilitatorReply(
      {
        author_id: reply.authorUserId ?? null,
        author_name: reply.authorName,
        created_at: new Date(reply.postedAt),
      },
      {
        post: {
          author_id: postAuthorId ?? null,
          author_name: postAuthorName,
          created_at: new Date(postPostedAt),
        },
        roomAiDiscussion: !!roomAiDiscussion,
        replyIndex,
      }
    );
  const isAiReply = isAi || reply.isAi || legacyAi || reply.authorName === FORUM_AI_FACILITATOR_NAME;
  const displayAuthorName = isAiReply ? FORUM_AI_FACILITATOR_NAME : reply.authorName;
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(reply.likeCount);

  const toggleLike = async () => {
    // 楽観的UI
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((n) => (newLiked ? n + 1 : n - 1));

    try {
      const res = await fetch("/api/forum/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          targetId: reply.id,
          targetType: "reply",
        }),
      });
      if (res.status === 401) {
        throw new Error("UNAUTHORIZED");
      }
      if (!res.ok) {
        throw new Error("LIKE_FAILED");
      }
    } catch {
      // ネットワークエラー時はロールバック
      setLiked(!newLiked);
      setLikeCount((n) => (newLiked ? n - 1 : n + 1));
      onRequireLogin();
    }
  };

  return (
    <div className="relative pl-7">
      {/* シナプス縦線 */}
      <span aria-hidden className={`absolute left-3 top-0 bottom-0 w-px ${isAiReply ? "bg-violet-200" : "bg-muted"}`} />
      {/* 接続ドット */}
      <span aria-hidden className={`absolute left-2.5 top-5 h-1.5 w-1.5 rounded-full ${isAiReply ? "bg-violet-400" : "bg-muted-foreground/40"}`} />

      <div className="flex gap-3">
        <Avatar name={displayAuthorName} storedAuthorRole={reply.authorRole} isAi={isAiReply} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`text-sm font-semibold ${isAiReply ? "text-violet-800" : ""}`}>{displayAuthorName}</span>
            {isAiReply ? <AiBadge /> : <OccupationBadge storedAuthorRole={reply.authorRole} />}
            {!isAiReply && reply.aiKenteiPassed && <AiKenteiBadge />}
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
  currentUserId,
  isLoggedIn,
  avatarUrl,
  organizationType,
  organizationTypeOther,
  aiKenteiPassed,
  onRequireLogin,
}: {
  post: ForumPost;
  streamText: string | null;
  roomId: string;
  roomName: string;
  weeklyTopic: string;
  aiDiscussion: boolean;
  onReplyAdded: (postId: string, reply: ForumReply) => void;
  userName: string;
  currentUserId?: string | null;
  isLoggedIn: boolean;
  avatarUrl?: string | null;
  organizationType?: string | null;
  organizationTypeOther?: string | null;
  aiKenteiPassed?: boolean;
  onRequireLogin: () => void;
}) {
  const replyPreviewRole = forumRolePreviewFromProfile(organizationType, organizationTypeOther);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isAnonReplyState, setIsAnonReplyState] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);

  const replies = post.replies ?? [];
  const isStreaming = streamText !== null;

  useEffect(() => {
    if (isStreaming) {
      setRepliesOpen(true);
    }
  }, [isStreaming]);

  useEffect(() => {
    if (replies.some((r, i) =>
      r.isAi ||
      r.authorName === FORUM_AI_FACILITATOR_NAME ||
      isForumAiFacilitatorReply(
        {
          author_id: r.authorUserId ?? null,
          author_name: r.authorName,
          created_at: new Date(r.postedAt),
        },
        {
          post: {
            author_id: post.authorUserId ?? null,
            author_name: post.authorName,
            created_at: new Date(post.postedAt),
          },
          roomAiDiscussion: aiDiscussion,
          replyIndex: i,
        }
      )
    )) {
      setRepliesOpen(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- AI返信追加時のみ展開
  }, [replies.length]);

  const autoOpenReplies = repliesOpen || isStreaming;
  const hasReplies = replies.length > 0;

  const toggleLike = async () => {
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((n) => (newLiked ? n + 1 : n - 1));

    try {
      const res = await fetch("/api/forum/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          targetId: post.id,
          targetType: "post",
        }),
      });
      if (res.status === 401) {
        throw new Error("UNAUTHORIZED");
      }
      if (!res.ok) {
        throw new Error("LIKE_FAILED");
      }
    } catch {
      setLiked(!newLiked);
      setLikeCount((n) => (newLiked ? n - 1 : n + 1));
      onRequireLogin();
    }
  };

  const isAnonReply = isAnonReplyState;
  /** API はログイン時サーバー側で職業・役職を上書き。匿名判定用に送る */
  const replyAuthorRoleForApi = isAnonReply ? "匿名" : "一般";
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
          authorRole: replyAuthorRoleForApi,
          replyBody: replyText.trim(),
        }),
      });

      if (res.status === 401) {
        onRequireLogin();
        return;
      }

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
          <Avatar name={post.authorName} storedAuthorRole={post.authorRole} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-sm font-semibold">{post.authorName}</span>
              <OccupationBadge storedAuthorRole={post.authorRole} />
              {post.aiKenteiPassed && <AiKenteiBadge />}
              {post.topicTitle && (
                <span className="inline-flex max-w-full items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-800 truncate" title={post.topicTitle}>
                  お題: {post.topicTitle}
                </span>
              )}
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
              {post.authorUserId && currentUserId && post.authorUserId !== currentUserId && (
                <ReportForumContentButton targetType="post" targetId={post.id} />
              )}
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
                  <OccupationBadge storedAuthorRole={replyPreviewRole} />
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
          {replies.map((reply, replyIndex) => (
            <ReplyCard
              key={reply.id}
              reply={reply}
              isAi={reply.isAi}
              postAuthorId={post.authorUserId}
              postAuthorName={post.authorName}
              postPostedAt={post.postedAt}
              roomAiDiscussion={aiDiscussion}
              replyIndex={replyIndex}
              onRequireLogin={onRequireLogin}
            />
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

// ─── 投稿フォーム（常設 Composer） ──────────────────────────────

type PostDraft = {
  body: string;
  authorRole: string;
  relatedArticleUrl: string;
  displayName: string;
  topicId?: string;
};

const MAX_BODY = 800;
const FORUM_DRAFT_STORAGE_KEY = "edumatch-forum-post-draft";

function consumeForumDraft(roomId: string): { body: string; source: "ai-chat" | "unknown" } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(FORUM_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      roomId?: string;
      body?: string;
      createdAt?: number;
      source?: string;
    };
    if (parsed.roomId !== roomId || typeof parsed.body !== "string") return null;
    if (typeof parsed.createdAt === "number" && Date.now() - parsed.createdAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(FORUM_DRAFT_STORAGE_KEY);
      return null;
    }
    localStorage.removeItem(FORUM_DRAFT_STORAGE_KEY);
    return {
      body: parsed.body.trim(),
      source: parsed.source === "ai-chat" ? "ai-chat" : "unknown",
    };
  } catch {
    return null;
  }
}

function NewPostComposer({
  onSubmit,
  roomId,
  userName,
  avatarUrl,
  isLoggedIn,
  weeklyTopic,
  submitting,
  organizationType,
  organizationTypeOther,
  aiKenteiPassed,
  topicOptions,
  defaultTopicId,
}: {
  onSubmit: (draft: PostDraft) => Promise<void>;
  roomId: string;
  userName: string;
  avatarUrl?: string | null;
  isLoggedIn: boolean;
  weeklyTopic: string;
  submitting: boolean;
  organizationType?: string | null;
  organizationTypeOther?: string | null;
  aiKenteiPassed?: boolean;
  topicOptions: { id: string; title: string }[];
  defaultTopicId?: string | null;
}) {
  const postPreviewRole = forumRolePreviewFromProfile(organizationType, organizationTypeOther);
  const [body, setBody] = useState("");
  const [isAnon, setIsAnon] = useState(false);
  const [relatedArticleUrl, setRelatedArticleUrl] = useState("");
  const [showUrl, setShowUrl] = useState(false);
  const [draftFromAiLoaded, setDraftFromAiLoaded] = useState(false);
  const [postTopicId, setPostTopicId] = useState(() => {
    const first = topicOptions[0]?.id ?? "";
    return defaultTopicId && topicOptions.some((t) => t.id === defaultTopicId)
      ? defaultTopicId
      : first;
  });
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const first = topicOptions[0]?.id ?? "";
    const def = defaultTopicId && topicOptions.some((t) => t.id === defaultTopicId) ? defaultTopicId : first;
    const timer = setTimeout(() => setPostTopicId(def), 0);
    return () => clearTimeout(timer);
  }, [defaultTopicId, topicOptions]);

  const displayName = isAnon ? "匿名ユーザー" : (userName || "ゲスト");
  const remaining = MAX_BODY - body.length;
  const canSubmit = body.trim().length > 0 && body.length <= MAX_BODY && !submitting;

  useEffect(() => {
    const fillDraftFromChat = () => {
      const draft = consumeForumDraft(roomId);
      if (!draft?.body) return;
      setBody(draft.body);
      setDraftFromAiLoaded(draft.source === "ai-chat");
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    fillDraftFromChat();
    window.addEventListener("edumatch:forum-draft-created", fillDraftFromChat);
    return () => window.removeEventListener("edumatch:forum-draft-created", fillDraftFromChat);
  }, [roomId]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onSubmit({
      body,
      authorRole: isAnon ? "匿名" : "一般",
      relatedArticleUrl,
      displayName,
      topicId: postTopicId || undefined,
    });
    setBody("");
    setRelatedArticleUrl("");
    setShowUrl(false);
  };

  if (!isLoggedIn) {
    return (
      <div className="rounded-2xl border border-dashed bg-muted/20 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">投稿するにはログインしてください</p>
            <p className="mt-1 text-xs text-muted-foreground">井戸端会議への投稿は会員限定です。ログイン後すぐに投稿できます。</p>
          </div>
          <Button asChild className="gap-1.5">
            <Link href="/auth/login">
              <LogIn className="h-4 w-4" />
              ログインする
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div id="new-post" ref={rootRef} className="rounded-2xl border bg-card shadow-xs overflow-hidden">
      <div className="border-b px-5 py-3">
        <p className="text-sm font-semibold">このテーマに投稿する</p>
        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{weeklyTopic}</p>
        {topicOptions.length > 0 && (
          <div className="mt-3 space-y-1">
            <label htmlFor="forum-post-topic" className="text-[11px] font-medium text-muted-foreground">
              この投稿が紐づくお題
            </label>
            <select
              id="forum-post-topic"
              value={postTopicId}
              onChange={(e) => setPostTopicId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
            >
              {topicOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {draftFromAiLoaded && (
        <div className="border-b bg-violet-50/80 px-5 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-violet-800">
              AIで整理した下書きを反映しました。内容を整えてそのまま投稿できます。
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-violet-700 hover:bg-violet-100"
                onClick={() => setDraftFromAiLoaded(false)}
              >
                閉じる
              </Button>
              <OpenAiChatButton
                variant="outline"
                className="h-7 border-violet-300 text-violet-700 hover:bg-violet-100"
                initialMessage={`以下の投稿下書きを、もう一段深く整理したいです。\n\n${body.trim()}`}
                preferredMode="discussion"
                launchContext="forum-compose"
                forumTopic={weeklyTopic}
              >
                <Bot className="mr-1 h-3.5 w-3.5" />
                さらにAIで深める
              </OpenAiChatButton>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2.5 border-b bg-muted/20 px-5 py-2.5">
        <UserAvatar name={displayName} avatarUrl={isAnon ? null : avatarUrl} size={28} isAnon={isAnon} />
        <span className="text-xs font-medium text-foreground">{displayName}</span>
        {!isAnon && (
          <>
            <span className="text-muted-foreground/40">·</span>
            <OccupationBadge storedAuthorRole={postPreviewRole} />
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

      <div className="border-b bg-violet-50/70 px-5 py-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-xs text-violet-800">
            <Bot className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>投稿前にAIと壁打ちして、意見を整えてから投稿できます。</span>
          </p>
          <OpenAiChatButton
            variant="outline"
            className="h-7 shrink-0 border-violet-300 text-violet-700 hover:bg-violet-100"
            initialMessage={
              body.trim()
                ? `以下の投稿下書きを、井戸端会議向けに深めたいです。論点整理から手伝ってください。\n\n${body.trim()}`
                : `今週のお題「${weeklyTopic}」について、井戸端会議への投稿文を作るために議論を始めたいです。`
            }
            preferredMode="discussion"
            launchContext="forum-compose"
            forumTopic={weeklyTopic}
          >
            <Bot className="mr-1 h-3.5 w-3.5" />
            投稿をAIと壁打ちする
          </OpenAiChatButton>
        </div>
      </div>

      <div className="px-5 pt-4 pb-3">
        <Textarea
          id="post-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="今週のお題について、あなたの経験や意見を書いてください…"
          rows={6}
          maxLength={MAX_BODY + 50}
          className="w-full resize-none border-0 bg-transparent px-0 text-sm leading-7 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/60"
        />

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

      <div className="border-t bg-muted/20 px-5 py-3">
        <div className="flex items-center justify-between gap-3">
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
              投稿する
            </Button>
          </div>
        </div>
      </div>
    </div>
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

export function ForumRoomClient({
  room,
  highlightFromNotify = false,
}: {
  room: ForumRoom;
  /** サイト内通知から遷移したときの案内バナー */
  highlightFromNotify?: boolean;
}) {
  const auth = useAuthUser();
  const [sort, setSort] = useState<SortKey>("newest");
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const { pending: aiPending, streamTexts, generate } = useAiComment();
  const [weeklyTopic, setWeeklyTopic] = useState(room.weeklyTopic);
  const [editingTopic, setEditingTopic] = useState(false);
  const [topicDraft, setTopicDraft] = useState(room.weeklyTopic);
  const [savingTopic, setSavingTopic] = useState(false);
  const [topicOptions, setTopicOptions] = useState<{ id: string; title: string }[]>([]);
  const isCreator = !!(auth.userId && room.createdBy && auth.userId === room.createdBy);
  const canEditTopic = isCreator || auth.role === "ADMIN";

  const requireLogin = useCallback(() => {
    setLoginDialogOpen(true);
  }, []);

  const handleSaveTopic = async () => {
    if (savingTopic) return;
    setSavingTopic(true);
    try {
      const res = await fetch(`/api/forum/rooms/${room.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ weeklyTopic: topicDraft.trim() }),
      });
      if (res.ok) {
        setWeeklyTopic(topicDraft.trim());
        setEditingTopic(false);
      }
    } finally {
      setSavingTopic(false);
    }
  };

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

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/forum/rooms/${room.id}/topics`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data.topics)) {
          setTopicOptions(data.topics.map((t: { id: string; title: string }) => ({ id: t.id, title: t.title })));
        }
      })
      .catch(console.error);
    return () => { cancelled = true; };
  }, [room.id]);

  const pinnedPosts = useMemo(() => posts.filter((p) => p.isPinned && !p.isHidden), [posts]);

  const regularPosts = useMemo<ForumPost[]>(() => {
    const unpinned = posts.filter((p) => !p.isPinned && !p.isHidden);
    if (sort === "popular") return [...unpinned].sort((a, b) => b.likeCount - a.likeCount);
    return [...unpinned].sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
  }, [posts, sort]);

  const handleNewPost = useCallback(async (draft: PostDraft) => {
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
          authorRole: isAnon ? "匿名" : "一般",
          postBody: draft.body.trim(),
          relatedArticleUrl: draft.relatedArticleUrl.trim() || undefined,
          topicId: draft.topicId || undefined,
        }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          alert("投稿するにはログインしてください。");
          return;
        }
        console.error("投稿に失敗しました", await res.text());
        return;
      }

      const data = await res.json();
      const newPost: ForumPost = data.post;
      setPosts((prev) => [newPost, ...prev]);

      if (!room.aiDiscussion) return;

      const recentContext = posts.slice(0, 5).map((p) => ({ authorName: p.authorName, body: p.body }));
      const aiText = await generate(newPost.id, newPost.body, room.name, weeklyTopic, recentContext);

      if (aiText) {
        let savedReply: ForumReply | null = null;
        try {
          const saveRes = await fetch(`/api/forum/posts/${newPost.id}/replies`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              authorName: FORUM_AI_FACILITATOR_NAME,
              authorRole: "専門家",
              replyBody: aiText,
            }),
          });
          if (saveRes.ok) {
            const saveData = await saveRes.json();
            savedReply = saveData.reply as ForumReply;
          }
        } catch {
          // 保存失敗しても表示上は反映済み
        }

        const aiReply: ForumReply = savedReply ?? {
          id: `ai-r-${Date.now()}`,
          authorName: FORUM_AI_FACILITATOR_NAME,
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
                  {room.aiWeeklyTopicEnabled && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
                      <Sparkles className="h-3 w-3" />AI週次お題
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
            {auth.role === "ADMIN" && (
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[220px] sm:items-end">
                {highlightFromNotify && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                    このルームの人間の発言がしきい値を超えました。記事化のタイミングを検討できます。
                  </div>
                )}
                <Button asChild size="sm" className="gap-2 shadow-sm">
                  <Link href={`/articles/create?forumRoom=${encodeURIComponent(room.id)}`}>
                    <FileText className="h-4 w-4" />
                    この話題を記事にする
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
        <div className="pointer-events-none absolute -top-20 -right-20 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
      </section>

      {/* ─── 今週のお題（大きな吹き出しボックス） ─── */}
      <div className="border-b bg-gradient-to-r from-primary/8 via-primary/4 to-background/80">
        <div className="container py-6">
          <div className="mx-auto max-w-3xl">
            <div className="relative rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 px-6 py-5 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-primary/70">
                  <Sparkles className="h-3.5 w-3.5" />
                  今週のお題
                </p>
                {canEditTopic && !editingTopic && (
                  <button
                    type="button"
                    onClick={() => { setTopicDraft(weeklyTopic); setEditingTopic(true); }}
                    className="flex items-center gap-1 text-[11px] text-primary/60 hover:text-primary transition-colors"
                  >
                    <PenSquare className="h-3 w-3" />
                    編集
                  </button>
                )}
              </div>
              {editingTopic ? (
                <div className="space-y-2">
                  <Textarea
                    rows={3}
                    value={topicDraft}
                    onChange={(e) => setTopicDraft(e.target.value)}
                    className="resize-none text-sm"
                    placeholder="今週のお題を入力してください"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setEditingTopic(false)}
                    >
                      キャンセル
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={savingTopic || !topicDraft.trim()}
                      onClick={handleSaveTopic}
                    >
                      {savingTopic ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                      保存する
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-base font-semibold leading-7 sm:text-lg">
                    {weeklyTopic || <span className="text-muted-foreground font-normal text-sm italic">お題が設定されていません</span>}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">このテーマについて、あなたの経験や考えを投稿しよう</p>
                </>
              )}
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
                      weeklyTopic={weeklyTopic}
                      aiDiscussion={aiEnabled}
                      onReplyAdded={handleReplyAdded}
                      userName={auth.name}
                      currentUserId={auth.userId}
                      isLoggedIn={auth.isLoggedIn}
                      avatarUrl={auth.avatarUrl}
                      organizationType={auth.organizationType}
                      organizationTypeOther={auth.organizationTypeOther}
                      aiKenteiPassed={auth.aiKenteiPassed}
                      onRequireLogin={requireLogin}
                    />
                  ))}
                </div>
              )}

              <NewPostComposer
                onSubmit={handleNewPost}
                roomId={room.id}
                userName={auth.name}
                avatarUrl={auth.avatarUrl}
                isLoggedIn={auth.isLoggedIn}
                weeklyTopic={weeklyTopic}
                submitting={submitting}
                organizationType={auth.organizationType}
                organizationTypeOther={auth.organizationTypeOther}
                aiKenteiPassed={auth.aiKenteiPassed}
                topicOptions={topicOptions}
                defaultTopicId={room.currentTopicId ?? null}
              />

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
                        weeklyTopic={weeklyTopic}
                        aiDiscussion={aiEnabled}
                        onReplyAdded={handleReplyAdded}
                        userName={auth.name}
                        currentUserId={auth.userId}
                        isLoggedIn={auth.isLoggedIn}
                        avatarUrl={auth.avatarUrl}
                        organizationType={auth.organizationType}
                        organizationTypeOther={auth.organizationTypeOther}
                        aiKenteiPassed={auth.aiKenteiPassed}
                        onRequireLogin={requireLogin}
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
              <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                表示文言はアカウント設定の「職業・役職」に連動します。色は大まかな分類（教員・学生・企業など）です。
              </p>
              <div className="flex flex-wrap gap-2">
                <OccupationBadge storedAuthorRole="elem-teacher" />
                <OccupationBadge storedAuthorRole="univ-faculty" />
                <OccupationBadge storedAuthorRole="student" />
                <OccupationBadge storedAuthorRole="company" />
                <OccupationBadge storedAuthorRole="一般" />
                {aiEnabled && <AiBadge />}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>ログインが必要です</DialogTitle>
            <DialogDescription>
              返信やいいねを利用するには、ログインまたは会員登録をお願いします。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setLoginDialogOpen(false)}>
              閉じる
            </Button>
            <Button asChild onClick={() => setLoginDialogOpen(false)}>
              <Link href="/auth/login">ログイン・会員登録</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
