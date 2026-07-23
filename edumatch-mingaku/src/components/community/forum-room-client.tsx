"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  ChevronDown,
  ChevronUp,
  FileText,
  Heart,
  Link2,
  Loader2,
  AlertTriangle,
  LogIn,
  MessageCircle,
  MessageSquare,
  PenSquare,
  Send,
  Pin,
  Plus,
  Save,
  Sparkles,
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  FORUM_ROOM_EMOJI_OPTIONS,
  ForumEmojiPicker,
} from "@/components/community/forum-emoji-picker";
import { useAuthUser } from "@/components/community/answer-section";
import { OpenAiChatButton } from "@/components/ui/open-ai-chat-button";
import { ForumRoomRelatedContent } from "@/components/community/forum-room-related-content";
import { ReportForumContentButton } from "@/components/community/report-forum-content-button";
import { FORUM_AI_FACILITATOR_NAME } from "@/lib/forum-constants";
import { isForumAiFacilitatorReply } from "@/lib/forum-ai-reply";
import { ForumCategoryContentPanel } from "@/components/community/forum-category-content-panel";
import type { CategoryContentItem } from "@/lib/forum-category-content";
import { InteropBackdrop } from "@/components/interop/interop-backdrop";

// ─── 特設ページ（interop-board）に合わせたダークテーマ共通スタイル ───
/** 投稿カード等の半透明ガラス面（特設ページと同一） */
const POST_SURFACE = {
  background: "linear-gradient(145deg, rgba(14,20,52,0.62) 0%, rgba(8,12,36,0.72) 100%)",
  backdropFilter: "blur(16px) saturate(1.15)",
  WebkitBackdropFilter: "blur(16px) saturate(1.15)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.12)",
} as const;
/** アクセントカラー（教育のひろば＝インディゴ系） */
const ACCENT = "#8da2e8";

/** カテゴリルーム（大カテゴリ×サブカテゴリ）で上部に表示するコンテキスト */
export type ForumCategoryContext = {
  categoryId: string;
  subCategoryId: string;
  categorySlug: string;
  subCategorySlug: string;
  categoryName: string;
  subCategoryName: string;
  contentKind: string;
  items: CategoryContentItem[];
};

// ─── コミュニティルーム管理セクション ─────────────────────

type CommunityRoomItem = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  postCount: number;
  participantCount: number;
};

function CommunityRoomsSection({
  categoryId,
  subCategoryId,
  categorySlug,
  subCategorySlug,
  mainRoomId,
  isLoggedIn,
}: {
  categoryId: string;
  subCategoryId: string;
  categorySlug: string;
  subCategorySlug: string;
  mainRoomId: string;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [rooms, setRooms] = useState<CommunityRoomItem[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [roomDesc, setRoomDesc] = useState("");
  const [roomEmoji, setRoomEmoji] = useState<string>(FORUM_ROOM_EMOJI_OPTIONS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams({
      categoryId,
      subCategoryId,
      categorySlug,
      subSlug: subCategorySlug,
    });
    fetch(`/api/forum/rooms?${q}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.rooms)) {
          setRooms(d.rooms.filter((r: CommunityRoomItem) => r.id !== mainRoomId));
        }
      })
      .catch(console.error);
  }, [categoryId, subCategoryId, categorySlug, subCategorySlug, mainRoomId]);

  const handleOpenCreate = () => {
    if (!isLoggedIn) {
      router.push("/auth/login");
      return;
    }
    setCreateOpen(true);
    setError(null);
  };

  const handleCreate = async () => {
    if (!roomName.trim() || saving) return;
    if (!isLoggedIn) { router.push("/auth/login"); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/forum/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: roomName.trim(),
          description: roomDesc.trim(),
          emoji: roomEmoji,
          weeklyTopic: "",
          aiDiscussion: true,
          aiWeeklyTopicEnabled: false,
          categoryId,
          subCategoryId,
          categorySlug,
          subCategorySlug,
        }),
      });
      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        const msg = (d as { error?: string }).error ?? "作成に失敗しました";
        if (res.status === 401) {
          router.push("/auth/login");
          return;
        }
        setError(msg);
        return;
      }
      const data = await res.json();
      router.push(`/forum/${data.room.id}`);
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-b border-white/10">
      <div className="container py-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <p className="text-sm font-semibold text-white/85">このコミュニティの部屋</p>

          {/* 部屋カード一覧 */}
          <div className="grid gap-3 sm:grid-cols-2">
            {rooms.map((r) => (
              <Link
                key={r.id}
                href={`/forum/${r.id}`}
                className="group flex items-start gap-3 rounded-xl border border-white/12 p-3 transition-all hover:border-white/25"
                style={POST_SURFACE}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                  <ForumRoomIcon roomId={r.id} emoji={r.emoji} size={36} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white/90">{r.name}</p>
                  {r.description ? (
                    <p className="mt-0.5 line-clamp-1 text-xs text-white/55">{r.description}</p>
                  ) : null}
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-white/50">
                    <span className="flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{r.postCount}</span>
                    <span className="flex items-center gap-0.5"><Users className="h-3 w-3" />{r.participantCount}</span>
                  </div>
                </div>
                <ArrowLeft className="mt-0.5 h-3.5 w-3.5 shrink-0 rotate-180 text-white/30 transition-transform group-hover:translate-x-0.5 group-hover:text-white/60" />
              </Link>
            ))}

            {/* 部屋作成カード（インライン展開） */}
            {!createOpen ? (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/20 bg-white/[0.03] p-4 text-sm font-medium text-white/55 transition-colors hover:border-white/35 hover:text-white"
              >
                <Plus className="h-4 w-4" />
                {isLoggedIn ? "新しい部屋を作る" : "ログインして部屋を作る"}
              </button>
            ) : (
              <div className="rounded-xl border-2 p-4 space-y-3" style={{ ...POST_SURFACE, borderColor: `${ACCENT}55` }}>
                <p className="text-sm font-semibold text-white/90">新しい部屋</p>
                <Input
                  value={roomName}
                  onChange={(e) => { setRoomName(e.target.value); setError(null); }}
                  placeholder="部屋名（例: 授業実践シェア）"
                  className="border-white/15 bg-white/[0.04] text-sm text-white placeholder:text-white/35"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
                <Textarea
                  rows={2}
                  value={roomDesc}
                  onChange={(e) => setRoomDesc(e.target.value)}
                  className="resize-none border-white/15 bg-white/[0.04] text-sm text-white placeholder:text-white/35"
                  placeholder="説明（省略可）"
                />
                <ForumEmojiPicker value={roomEmoji} onChange={setRoomEmoji} />
                {error && (
                  <p className="text-xs font-medium text-rose-400">{error}</p>
                )}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-white/60 hover:bg-white/10 hover:text-white"
                    onClick={() => {
                      setCreateOpen(false);
                      setRoomName("");
                      setRoomDesc("");
                      setRoomEmoji(FORUM_ROOM_EMOJI_OPTIONS[0]);
                      setError(null);
                    }}
                  >
                    キャンセル
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreate}
                    disabled={!roomName.trim() || saving}
                    className="border-0 text-white"
                    style={{ background: ACCENT }}
                  >
                    {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />}
                    作成して入室
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 定数 ────────────────────────────────────────────────

const ROLE_STYLES: Record<
  ForumOccupationVisual,
  { bg: string; text: string; border: string; icon: string }
> = {
  教員: { bg: "bg-sky-400/15", text: "text-sky-200", border: "border-sky-300/30", icon: "🎓" },
  学生: { bg: "bg-emerald-400/15", text: "text-emerald-200", border: "border-emerald-300/30", icon: "📚" },
  専門家: { bg: "bg-violet-400/15", text: "text-violet-200", border: "border-violet-300/30", icon: "🔬" },
  企業: { bg: "bg-amber-400/15", text: "text-amber-200", border: "border-amber-300/30", icon: "🏢" },
  一般: { bg: "bg-white/8", text: "text-white/70", border: "border-white/20", icon: "👤" },
  匿名: { bg: "bg-white/5", text: "text-white/50", border: "border-white/12", icon: "🎭" },
};

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

function AiBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-indigo-300/35 bg-indigo-400/15 px-2.5 py-0.5 text-xs font-semibold text-indigo-200">
      <Bot className="h-3 w-3" />
      AI
    </span>
  );
}

function AiKenteiBadge() {
  return (
    <span
      title="AI検定 合格者"
      className="inline-flex items-center gap-0.5 rounded-full border border-amber-300/40 bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold text-amber-200"
    >
      <Sparkles className="h-2.5 w-2.5" />
      AI検定合格
    </span>
  );
}

const TONE_BADGE_LABEL: Record<string, string> = {
  negative: "ネガティブ表現の可能性",
  non_constructive: "非建設的な否定の可能性",
  harsh: "キツい表現の可能性",
};

/** 掲載は可だが配慮が要るトーンの警告バッジ（モデレーションAIが付与） */
function ToneBadge({ flag, reason }: { flag?: string; reason?: string }) {
  if (!flag || !(flag in TONE_BADGE_LABEL)) return null;
  return (
    <span
      title={reason || TONE_BADGE_LABEL[flag]}
      className="inline-flex items-center gap-0.5 rounded-full border border-orange-300/40 bg-orange-400/15 px-2 py-0.5 text-[10px] font-bold text-orange-200"
    >
      <AlertTriangle className="h-2.5 w-2.5" />
      {TONE_BADGE_LABEL[flag]}
    </span>
  );
}

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
      <div className={`flex ${dim} shrink-0 items-center justify-center rounded-full border border-indigo-300/35 bg-indigo-400/20 text-indigo-200`}>
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
      <span aria-hidden className="absolute left-3 top-0 bottom-0 w-px bg-indigo-300/30" />
      <span aria-hidden className="absolute left-2.5 top-5 h-1.5 w-1.5 rounded-full bg-indigo-300/70" />
      <div className="flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-indigo-300/35 bg-indigo-400/20 text-indigo-200">
          <Bot className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-indigo-200">AIファシリテーター</span>
            <AiBadge />
            <span className="text-xs text-white/40">たった今</span>
          </div>
          <p className="text-sm leading-7 whitespace-pre-wrap text-white/85">
            {streamText}
            <span className="inline-block w-0.5 h-4 bg-indigo-300 ml-0.5 animate-pulse align-text-bottom" />
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
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((n) => (newLiked ? n + 1 : n - 1));
    try {
      const res = await fetch("/api/forum/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ targetId: reply.id, targetType: "reply" }),
      });
      if (res.status === 401) throw new Error("UNAUTHORIZED");
      if (!res.ok) throw new Error("LIKE_FAILED");
    } catch {
      setLiked(!newLiked);
      setLikeCount((n) => (newLiked ? n - 1 : n + 1));
      onRequireLogin();
    }
  };

  return (
    <div className="relative pl-7">
      <span aria-hidden className={`absolute left-3 top-0 bottom-0 w-px ${isAiReply ? "bg-indigo-300/30" : "bg-white/12"}`} />
      <span aria-hidden className={`absolute left-2.5 top-5 h-1.5 w-1.5 rounded-full ${isAiReply ? "bg-indigo-300/70" : "bg-white/30"}`} />
      <div className="flex gap-3">
        <Avatar name={displayAuthorName} storedAuthorRole={reply.authorRole} isAi={isAiReply} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`text-sm font-semibold ${isAiReply ? "text-indigo-200" : "text-white/85"}`}>{displayAuthorName}</span>
            {isAiReply ? <AiBadge /> : <OccupationBadge storedAuthorRole={reply.authorRole} />}
            {!isAiReply && reply.aiKenteiPassed && <AiKenteiBadge />}
            <span className="text-xs text-white/40"><RelativeTime iso={reply.postedAt} /></span>
          </div>
          <p className="text-sm leading-7 whitespace-pre-wrap text-white/80">{reply.body}</p>
          <button
            type="button"
            onClick={toggleLike}
            className={`mt-2 flex items-center gap-1 text-xs transition-colors ${liked ? "text-pink-400" : "text-white/45 hover:text-pink-400"}`}
          >
            <Heart className={`h-3.5 w-3.5 ${liked ? "fill-pink-400" : ""}`} />
            {likeCount}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 投稿カード（AI要約＋ストリーミング対応） ────────────

function PostCardWithStream({
  post,
  streamText,
  roomId,
  roomName,
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
  const [submittingReply, setSubmittingReply] = useState(false);
  const [aiSummaryExpanded, setAiSummaryExpanded] = useState(false);

  const replies = post.replies ?? [];
  const isStreaming = streamText !== null;

  // AI返信を取得（要約として表示）
  const aiReply = useMemo(() => {
    return replies.find(
      (r) =>
        r.isAi ||
        r.authorName === FORUM_AI_FACILITATOR_NAME ||
        isForumAiFacilitatorReply(
          { author_id: r.authorUserId ?? null, author_name: r.authorName, created_at: new Date(r.postedAt) },
          { post: { author_id: post.authorUserId ?? null, author_name: post.authorName, created_at: new Date(post.postedAt) }, roomAiDiscussion: aiDiscussion, replyIndex: 0 }
        )
    );
  }, [replies, post, aiDiscussion]);

  useEffect(() => {
    if (isStreaming) setRepliesOpen(true);
  }, [isStreaming]);

  useEffect(() => {
    if (replies.some((r, i) =>
      r.isAi ||
      r.authorName === FORUM_AI_FACILITATOR_NAME ||
      isForumAiFacilitatorReply(
        { author_id: r.authorUserId ?? null, author_name: r.authorName, created_at: new Date(r.postedAt) },
        { post: { author_id: post.authorUserId ?? null, author_name: post.authorName, created_at: new Date(post.postedAt) }, roomAiDiscussion: aiDiscussion, replyIndex: i }
      )
    )) {
      setRepliesOpen(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        body: JSON.stringify({ targetId: post.id, targetType: "post" }),
      });
      if (res.status === 401) throw new Error("UNAUTHORIZED");
      if (!res.ok) throw new Error("LIKE_FAILED");
    } catch {
      setLiked(!newLiked);
      setLikeCount((n) => (newLiked ? n - 1 : n + 1));
      onRequireLogin();
    }
  };

  // 返信も匿名投稿は廃止。常に実アカウント名で投稿する。
  const replyAuthorRoleForApi = "一般";
  const canSubmitReply = !!replyText.trim() && !submittingReply;

  const submitReply = async () => {
    if (!canSubmitReply) return;
    setSubmittingReply(true);
    const authorName = isLoggedIn && userName ? userName : "ゲスト";
    try {
      const res = await fetch(`/api/forum/posts/${post.id}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ authorName, authorRole: replyAuthorRoleForApi, replyBody: replyText.trim() }),
      });
      if (res.status === 401) { onRequireLogin(); return; }
      if (res.ok) {
        const data = await res.json();
        onReplyAdded(post.id, data.reply);
        setReplyText("");
        setShowReplyForm(false);
        setRepliesOpen(true);
      } else {
        const errData = await res.json().catch(() => ({} as { error?: string }));
        alert(errData?.error || "返信の投稿に失敗しました。");
      }
    } finally {
      setSubmittingReply(false);
    }
  };

  return (
    <div
      className="overflow-hidden rounded-2xl border transition-all"
      style={
        post.isPinned
          ? { ...POST_SURFACE, borderColor: `${ACCENT}55`, background: `linear-gradient(145deg, rgba(14,20,52,0.68) 0%, ${ACCENT}1e 100%)` }
          : { ...POST_SURFACE, borderColor: "rgba(255,255,255,0.16)" }
      }
    >
      {/* 注目バナー */}
      {post.isPinned && (
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-2" style={{ background: `${ACCENT}1f` }}>
          <Pin className="h-3.5 w-3.5" style={{ color: ACCENT, fill: ACCENT }} aria-hidden />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: ACCENT }}>注目</span>
          <span className="ml-1 text-xs text-white/55">運営ピックアップ</span>
        </div>
      )}

      {/* AI要約（AIファシリテーターの最初の返信を要約として上部に表示） */}
      {aiReply && (
        <div className="border-b border-indigo-400/20 bg-indigo-950/30 px-5 py-3">
          <div className="flex items-start gap-2">
            <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
              <Bot className="h-3.5 w-3.5 text-indigo-300" />
              <span className="text-[11px] font-bold text-indigo-200 uppercase tracking-wide">AI要約</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-xs leading-relaxed text-indigo-100/90 ${aiSummaryExpanded ? "" : "line-clamp-2"}`}>
                {aiReply.body}
              </p>
              {aiReply.body.length > 100 && (
                <button
                  type="button"
                  onClick={() => setAiSummaryExpanded((v) => !v)}
                  className="mt-1 text-[11px] text-indigo-300 hover:underline"
                >
                  {aiSummaryExpanded ? "閉じる" : "続きを読む"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="p-5">
        <div className="flex gap-3">
          <Avatar name={post.authorName} storedAuthorRole={post.authorRole} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-white/90">{post.authorName}</span>
              <OccupationBadge storedAuthorRole={post.authorRole} />
              {post.aiKenteiPassed && <AiKenteiBadge />}
              <ToneBadge flag={post.toneFlag} reason={post.toneReason} />
              <span className="text-xs text-white/40"><RelativeTime iso={post.postedAt} /></span>
            </div>
            <p className="text-sm leading-7 whitespace-pre-wrap text-white/85">{post.body}</p>
            {post.relatedArticleUrl && (
              <a href={post.relatedArticleUrl} target="_blank" rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs hover:underline" style={{ color: ACCENT }}>
                <Link2 className="h-3 w-3" />関連記事
              </a>
            )}
            <div className="mt-3 flex items-center gap-4">
              <button type="button" onClick={toggleLike}
                className={`flex items-center gap-1 text-xs transition-colors ${liked ? "text-pink-400" : "text-white/45 hover:text-pink-400"}`}>
                <Heart className={`h-3.5 w-3.5 ${liked ? "fill-pink-400" : ""}`} />
                {likeCount}
              </button>
              {hasReplies || isStreaming ? (
                <button type="button" onClick={() => setRepliesOpen((v) => !v)}
                  className="flex items-center gap-1 text-xs text-white/55 hover:text-white transition-colors">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {replies.length + (isStreaming ? 1 : 0)} 件の返信
                  {autoOpenReplies ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              ) : (
                <span className="flex items-center gap-1 text-xs text-white/35">
                  <MessageSquare className="h-3.5 w-3.5" />返信 0
                </span>
              )}
              <button type="button" onClick={() => setShowReplyForm((v) => !v)}
                className="text-xs hover:underline" style={{ color: ACCENT }}>返信する</button>
              {post.authorUserId && currentUserId && post.authorUserId !== currentUserId && (
                <ReportForumContentButton targetType="post" targetId={post.id} />
              )}
            </div>
          </div>
        </div>

        {showReplyForm && (
          <div className="mt-4 ml-12 overflow-hidden rounded-xl border border-white/12 bg-white/[0.03]">
            <div className="flex items-center gap-2.5 border-b border-white/10 bg-white/[0.04] px-4 py-2.5">
              <UserAvatar name={isLoggedIn ? userName : "ゲスト"} avatarUrl={avatarUrl} size={26} isAnon={false} />
              <span className="text-xs font-medium text-white/85">{isLoggedIn ? userName : "ゲスト"}</span>
              <span className="text-white/30">·</span>
              <OccupationBadge storedAuthorRole={replyPreviewRole} />
              {aiKenteiPassed && <AiKenteiBadge />}
            </div>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="返信を入力…"
              rows={3}
              className="w-full resize-none bg-transparent px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/35"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2 border-t border-white/10 bg-white/[0.04] px-4 py-2">
              <Button variant="ghost" size="sm" onClick={() => { setShowReplyForm(false); setReplyText(""); }} className="h-7 text-xs text-white/60 hover:bg-white/10 hover:text-white">キャンセル</Button>
              <Button size="sm" onClick={submitReply} disabled={!canSubmitReply} className="h-7 rounded-full px-4 text-xs gap-1.5 border-0 text-white" style={{ background: ACCENT }}>
                {submittingReply && <Loader2 className="h-3 w-3 animate-spin" />}
                返信する
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 返信 + AIストリーミング */}
      {(autoOpenReplies && (hasReplies || isStreaming)) && (
        <div className="border-t border-white/10 bg-black/15 px-5 py-4 space-y-4">
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
                <span aria-hidden className="absolute left-3 top-0 bottom-0 w-px bg-indigo-300/30" />
                <span aria-hidden className="absolute left-2.5 top-5 h-1.5 w-1.5 rounded-full bg-indigo-300/70" />
                <div className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-indigo-300/35 bg-indigo-400/20 text-indigo-200">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="flex items-center gap-2 py-2">
                    <span className="text-xs text-indigo-200 font-medium">AIファシリテーターが考えています</span>
                    <span className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <span key={i} className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-300 animate-bounce"
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

// ─── ユーザーアバター ─────────────────────────────────────

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
  if (isAnon) {
    return (
      <div style={{ width: size, height: size }} className="flex shrink-0 items-center justify-center rounded-full bg-white/10 text-white/60 text-sm">
        <span aria-hidden>🎭</span>
      </div>
    );
  }
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatarUrl} alt={name} style={{ width: size, height: size }} className="shrink-0 rounded-full object-cover ring-2 ring-white/15" />
    );
  }
  return (
    <div style={{ width: size, height: size, fontSize: size * 0.38, background: `${ACCENT}33`, color: "#dfe6ff" }} className="flex shrink-0 items-center justify-center rounded-full font-bold">
      {name.charAt(0) || "?"}
    </div>
  );
}


// ─── 投稿フォーム ────────────────────────────────────────

type PostDraft = {
  body: string;
  authorRole: string;
  relatedArticleUrl: string;
  displayName: string;
  customTitle?: string;
};

const MAX_BODY = 800;
const FORUM_DRAFT_STORAGE_KEY = "edumatch-forum-post-draft";

function consumeForumDraft(roomId: string): { body: string; source: "ai-chat" | "unknown" } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(FORUM_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { roomId?: string; body?: string; createdAt?: number; source?: string };
    if (parsed.roomId !== roomId || typeof parsed.body !== "string") return null;
    if (typeof parsed.createdAt === "number" && Date.now() - parsed.createdAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(FORUM_DRAFT_STORAGE_KEY);
      return null;
    }
    localStorage.removeItem(FORUM_DRAFT_STORAGE_KEY);
    return { body: parsed.body.trim(), source: parsed.source === "ai-chat" ? "ai-chat" : "unknown" };
  } catch {
    return null;
  }
}

function NewPostComposer({
  onSubmit,
  roomId,
  userName,
  legalName,
  avatarUrl,
  isLoggedIn,
  roomLabel,
  submitting,
  organizationType,
  organizationTypeOther,
  aiKenteiPassed,
}: {
  onSubmit: (draft: PostDraft) => Promise<void>;
  roomId: string;
  userName: string;
  /** アカウント登録の本名（GeneralProfile/CorporateProfile.legal_name）。本名表示を選んだときに使う */
  legalName?: string | null;
  avatarUrl?: string | null;
  isLoggedIn: boolean;
  roomLabel: string;
  submitting: boolean;
  organizationType?: string | null;
  organizationTypeOther?: string | null;
  aiKenteiPassed?: boolean;
}) {
  // 肩書・属性はアカウント登録の所属種別から自動で決定（ユーザーには入力させない）。
  const postPreviewRole = forumRolePreviewFromProfile(organizationType, organizationTypeOther);
  const [body, setBody] = useState("");
  // 投稿者名は「ニックネーム（既定）」か「本名」を選ぶ。匿名投稿は廃止。
  const [nameSource, setNameSource] = useState<"nickname" | "real">("nickname");
  const [draftFromAiLoaded, setDraftFromAiLoaded] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const hasRealName = !!legalName?.trim();
  const displayName =
    nameSource === "real" && hasRealName ? legalName!.trim() : (userName || "ゲスト");
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
    // 肩書きはアカウントの属性(postPreviewRole)を customTitle 経由で渡す（親が authorRole に反映）。
    await onSubmit({
      body,
      authorRole: "一般",
      relatedArticleUrl: "",
      displayName,
      customTitle: postPreviewRole === "一般" ? "" : postPreviewRole,
    });
    setBody("");
  };

  if (!isLoggedIn) {
    return (
      <div className="rounded-2xl border border-dashed border-white/20 bg-white/[0.04] p-5" style={POST_SURFACE}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-white/90">投稿するにはログインしてください</p>
            <p className="mt-1 text-xs text-white/55">教育のひろばへの投稿は会員限定です。</p>
          </div>
          <Button asChild className="gap-1.5 border-0 text-white" style={{ background: ACCENT }}>
            <Link href="/auth/login"><LogIn className="h-4 w-4" />ログインする</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div id="new-post" ref={rootRef} className="overflow-hidden rounded-2xl border" style={{ ...POST_SURFACE, borderColor: `${ACCENT}40` }}>
      {/* ヘッダー */}
      <div className="border-b border-white/10 bg-white/[0.04] px-4 py-3">
        <p className="text-sm font-semibold text-white/90">投稿する</p>
        {roomLabel ? (
          <p className="mt-0.5 text-xs text-white/55 line-clamp-1">{roomLabel}</p>
        ) : null}
      </div>

      {/* AIドラフト通知 */}
      {draftFromAiLoaded && (
        <div className="flex items-center justify-between border-b border-indigo-400/20 bg-indigo-950/40 px-4 py-2.5">
          <p className="text-xs text-indigo-100">AIで整理した下書きを反映しました。</p>
          <Button type="button" size="sm" variant="ghost" className="h-7 text-xs text-indigo-200 hover:bg-white/10" onClick={() => setDraftFromAiLoaded(false)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* 投稿者バー。肩書・属性はアカウント登録のものを自動表示。名前はニックネーム/本名を選択（既定=ニックネーム）。 */}
      <div className="border-b border-white/10 bg-white/[0.02] px-4 py-2 space-y-1.5">
        <div className="flex items-center gap-2">
          <UserAvatar name={displayName} avatarUrl={avatarUrl} size={26} isAnon={false} />
          <span className="text-xs font-medium text-white/85">{displayName}</span>
          <span className="text-white/30">·</span>
          <OccupationBadge storedAuthorRole={postPreviewRole} />
          {aiKenteiPassed && <AiKenteiBadge />}
        </div>
        {/* 表示名の選択：ニックネーム（既定）／本名 */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-white/40">表示名</span>
          <div className="inline-flex overflow-hidden rounded-full border border-white/12">
            <button
              type="button"
              onClick={() => setNameSource("nickname")}
              className={`px-2.5 py-0.5 text-[10px] font-medium transition-colors ${
                nameSource === "nickname" ? "bg-white/15 text-white" : "text-white/45 hover:bg-white/8"
              }`}
            >ニックネーム</button>
            <button
              type="button"
              onClick={() => hasRealName && setNameSource("real")}
              disabled={!hasRealName}
              title={hasRealName ? undefined : "アカウントに本名が登録されていません"}
              className={`px-2.5 py-0.5 text-[10px] font-medium transition-colors ${
                nameSource === "real" ? "bg-white/15 text-white" : "text-white/45 hover:bg-white/8"
              } ${!hasRealName ? "cursor-not-allowed opacity-40" : ""}`}
            >本名</button>
          </div>
        </div>
      </div>

      {/* テキストエリア */}
      <div className="px-4 pt-3 pb-0">
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="あなたの意見や経験を書いてください…"
          rows={6}
          maxLength={MAX_BODY + 50}
          className="w-full resize-none bg-transparent text-sm leading-7 text-white outline-none placeholder:text-white/40"
        />
      </div>

      {/* 送信フッター（書式ツールバー・リンク添付は廃止。プレーンテキスト投稿に統一） */}
      <div className="flex items-center justify-end gap-3 border-t border-white/10 bg-white/[0.02] px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className={`text-[11px] tabular-nums ${remaining < 0 ? "text-rose-400 font-semibold" : remaining < 50 ? "text-amber-300" : "text-white/40"}`}>
            {remaining}
          </span>
          <Button onClick={handleSubmit} disabled={!canSubmit} size="sm" className="gap-1.5 rounded-full px-5 border-0 text-white" style={{ background: ACCENT }}>
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PenSquare className="h-3.5 w-3.5" />}
            投稿する
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── AI壁打ちサイドバー ──────────────────────────────────

function AiHelperSidebar({
  roomTheme,
  body,
}: {
  roomTheme: string;
  body?: string;
}) {
  return (
    <div className="flex h-full flex-col gap-3 rounded-2xl border border-indigo-400/25 p-4" style={POST_SURFACE}>
      <div className="flex items-start gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-400/20">
          <Bot className="h-3.5 w-3.5 text-indigo-200" />
        </div>
        <p className="pt-0.5 text-sm font-semibold leading-snug text-white/90">
          投稿内容に<wbr />
          <span className="whitespace-nowrap">迷っていますか？</span>
        </p>
      </div>
      <p className="text-xs leading-relaxed text-white/60">
        AIと対話することで、あなたの考えを整理して投稿文を作れます。
      </p>
      <div className="flex-1" />
      <OpenAiChatButton
        variant="outline"
        className="h-auto w-full justify-center gap-1.5 whitespace-normal py-2.5 text-xs leading-snug border-indigo-300/40 bg-indigo-400/10 text-indigo-100 hover:bg-indigo-400/20"
        initialMessage={
          body?.trim()
            ? `以下の投稿下書きを、教育のひろば向けに深めたいです。\n\n${body.trim()}`
            : `「${roomTheme}」について、教育のひろばへの投稿文を作るために議論を始めたいです。`
        }
        preferredMode="discussion"
        launchContext="forum-compose"
        forumTopic={roomTheme}
      >
        <Bot className="h-3.5 w-3.5 shrink-0" />
        <span>AIで意見を整理する</span>
      </OpenAiChatButton>
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
    roomContext: string,
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
        body: JSON.stringify({ postBody, roomName, roomContext, recentPosts }),
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
            } catch { /* ignore */ }
          }
        }
      }
      setPending(null);
      setStreamTexts((prev) => { const next = { ...prev }; delete next[postId]; return next; });
      return full;
    } catch (err) {
      if ((err as Error).name !== "AbortError") console.error("[useAiComment]", err);
      setPending(null);
      setStreamTexts((prev) => { const next = { ...prev }; delete next[postId]; return next; });
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
  categoryContext,
}: {
  room: ForumRoom;
  highlightFromNotify?: boolean;
  categoryContext?: ForumCategoryContext;
}) {
  const auth = useAuthUser();
  const [sort, setSort] = useState<SortKey>("newest");
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const { pending: aiPending, streamTexts } = useAiComment();
  const [composerBody, setComposerBody] = useState("");

  const roomDiscussionContext = useMemo(() => {
    if (categoryContext) {
      return `${categoryContext.categoryName} / ${categoryContext.subCategoryName}`;
    }
    return room.description?.trim() || room.name;
  }, [categoryContext, room.description, room.name]);

  const requireLogin = useCallback(() => setLoginDialogOpen(true), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/forum/rooms/${room.id}/posts`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => { if (!cancelled && data.posts) setPosts(data.posts); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });
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
    const authorName = isAnon ? "匿名ユーザー" : (draft.displayName.trim() || (auth.isLoggedIn && auth.name ? auth.name : "ゲスト"));
    const authorRole = isAnon ? "匿名" : (draft.customTitle || "一般");
    try {
      const res = await fetch(`/api/forum/rooms/${room.id}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          authorName,
          authorRole,
          postBody: draft.body.trim(),
          relatedArticleUrl: draft.relatedArticleUrl.trim() || undefined,
        }),
      });
      if (!res.ok) {
        if (res.status === 401) { alert("投稿するにはログインしてください。"); return; }
        const errData = await res.json().catch(() => ({} as { error?: string }));
        alert(errData?.error || "投稿に失敗しました。");
        return;
      }
      const data = await res.json();
      const newPost: ForumPost = data.post;
      setPosts((prev) => [newPost, ...prev]);
      // AIファシリテーターの返信は即時生成しない。
      // 一定時間（投稿ごとに2〜5時間のランダム）返信が付かなかった投稿に対して、
      // サーバの定期ジョブ（/api/cron/forum-ai-delayed-replies）が後からAI返信を付与する。
      // これにより「まず人どうしの会話を促し、停滞したときだけAIが入る」挙動になる。
    } finally { setSubmitting(false); }
  }, [auth, room, submitting]);

  const handleReplyAdded = useCallback((postId: string, reply: ForumReply) => {
    setPosts((prev) => prev.map((p) => p.id !== postId ? p : { ...p, replies: [...(p.replies ?? []), reply] }));
  }, []);

  const aiEnabled = !!room.aiDiscussion;

  return (
    <div className="relative min-h-screen w-full bg-[#070a1c] text-white">
      {/* 時刻連動の星空背景（特設ページと共通） */}
      <InteropBackdrop themeMode="auto" />

      {/* ─── 部屋ヘッダー（中央1カラム・角丸カード） ─── */}
      <section className="relative z-10">
        <div className="mx-auto w-full max-w-2xl px-4 pt-4 sm:px-6">
          <Link
            href={
              categoryContext
                ? `/forum?cat=${encodeURIComponent(categoryContext.categorySlug)}`
                : "/forum"
            }
            className="inline-flex w-fit items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold text-white/85 backdrop-blur transition-colors hover:brightness-110"
            style={{ background: `${ACCENT}22`, borderColor: `${ACCENT}66` }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {categoryContext ? "サブカテゴリの選択に戻る" : "AIUEO 教育のひろば"}
          </Link>

          <header
            className="mt-4 rounded-3xl border px-5 py-6"
            style={{
              ...POST_SURFACE,
              borderColor: `${ACCENT}55`,
              boxShadow: `0 8px 32px rgba(0,0,0,0.28), 0 0 24px ${ACCENT}1a, inset 0 1px 0 rgba(255,255,255,0.14)`,
            }}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.05]">
                <ForumRoomIcon roomId={room.id} emoji={room.emoji} size={36} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold leading-tight">{room.name}</h1>
                  {aiEnabled && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-indigo-300/35 bg-indigo-400/15 px-2.5 py-0.5 text-xs font-semibold text-indigo-200">
                      <Zap className="h-3 w-3" />AIディスカッション
                    </span>
                  )}
                </div>
                {room.description && (
                  <p className="mt-2 text-sm leading-relaxed text-white/70">{room.description}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/50">
                  <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" />{posts.length} 投稿</span>
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{room.participantCount} 人参加</span>
                </div>
              </div>
            </div>
            {auth.role === "ADMIN" && (
              <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
                {highlightFromNotify ? (
                  <div className="rounded-lg border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                    このルームの人間の発言がしきい値を超えました。記事化のタイミングを検討できます。
                  </div>
                ) : <span className="text-xs text-white/40">運営メニュー</span>}
                <Button asChild size="sm" className="shrink-0 gap-2 border-0 text-white" style={{ background: ACCENT }}>
                  <Link href={`/articles/create?forumRoom=${encodeURIComponent(room.id)}`}>
                    <FileText className="h-4 w-4" />この話題を記事にする
                  </Link>
                </Button>
              </div>
            )}
          </header>
        </div>
      </section>

      {/* ─── カテゴリ別の関連コンテンツ（コンテンツ表示機能） ─── */}
      {categoryContext && categoryContext.contentKind !== "community" && (
        <div className="relative z-10 mt-4">
          <ForumCategoryContentPanel
            items={categoryContext.items}
            contentKind={categoryContext.contentKind}
            categorySlug={categoryContext.categorySlug}
            subCategorySlug={categoryContext.subCategorySlug}
          />
        </div>
      )}

      {/* ─── コミュニティ: 部屋一覧・作成（投稿欄は出さない） ─── */}
      {categoryContext?.contentKind === "community" && (
        <div className="relative z-10 mt-4">
          <CommunityRoomsSection
            categoryId={categoryContext.categoryId}
            subCategoryId={categoryContext.subCategoryId}
            categorySlug={categoryContext.categorySlug}
            subCategorySlug={categoryContext.subCategorySlug}
            mainRoomId={room.id}
            isLoggedIn={auth.isLoggedIn}
          />
        </div>
      )}

      {/* ─── メインコンテンツ（コミュニティページでは表示しない） ─── */}
      {categoryContext?.contentKind === "community" ? null : (
      <div className="relative z-10 mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
        <div className="space-y-6">

          {/* 関連コンテンツ（管理者が紐付けた記事・サービス。0件なら非表示） */}
          <ForumRoomRelatedContent roomId={room.id} />

          {/* 投稿フォーム（左）＋ AI投稿サポートブロック（右・縦長）。狭い画面では縦積み。 */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
            <div className="min-w-0 lg:flex-1">
              <NewPostComposer
                onSubmit={handleNewPost}
                roomId={room.id}
                userName={auth.name}
                legalName={auth.legalName}
                avatarUrl={auth.avatarUrl}
                isLoggedIn={auth.isLoggedIn}
                roomLabel={roomDiscussionContext}
                submitting={submitting}
                organizationType={auth.organizationType}
                organizationTypeOther={auth.organizationTypeOther}
                aiKenteiPassed={auth.aiKenteiPassed}
              />
            </div>
            <div className="lg:w-60 lg:shrink-0">
              <AiHelperSidebar roomTheme={roomDiscussionContext} body={composerBody} />
            </div>
          </div>

          {/* 投稿一覧 */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-white/50" />
            </div>
          ) : (
            <div className="space-y-6">
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

              {/* ソート＋通常投稿 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-white/80">みんなの投稿 <span className="ml-1 font-normal text-white/40">{regularPosts.length}件</span></p>
                  <Tabs value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                    <TabsList className="h-8 border border-white/12 bg-white/[0.05] text-white/60">
                      <TabsTrigger value="newest" className="h-6 px-3 text-xs data-[state=active]:bg-white/15 data-[state=active]:text-white">新着順</TabsTrigger>
                      <TabsTrigger value="popular" className="h-6 px-3 text-xs data-[state=active]:bg-white/15 data-[state=active]:text-white">人気順</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {regularPosts.length === 0 ? (
                  <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] py-16 text-center">
                    <MessageSquare className="h-12 w-12 text-white/20" />
                    <div>
                      <p className="text-base font-medium text-white/80">まだ投稿がありません</p>
                      <p className="mt-1 text-sm text-white/45">最初の投稿者になりましょう</p>
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
            </div>
          )}
        </div>
      </div>
      )}

      <Dialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen}>
        <DialogContent className="border-white/12 bg-[#0c1024] text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">ログインが必要です</DialogTitle>
            <DialogDescription className="text-white/60">返信やいいねを利用するには、ログインまたは会員登録をお願いします。</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" className="border-white/20 bg-transparent text-white/80 hover:bg-white/10 hover:text-white" onClick={() => setLoginDialogOpen(false)}>閉じる</Button>
            <Button asChild onClick={() => setLoginDialogOpen(false)} className="border-0 text-white" style={{ background: ACCENT }}>
              <Link href="/auth/login">ログイン・会員登録</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
