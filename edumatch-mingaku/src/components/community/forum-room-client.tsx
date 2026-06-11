"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Bold,
  Bot,
  ChevronDown,
  ChevronUp,
  FileText,
  Heart,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  LogIn,
  MessageSquare,
  PenSquare,
  Pin,
  Plus,
  Quote,
  Save,
  Sparkles,
  Strikethrough,
  Underline,
  Users,
  X,
  Zap,
} from "lucide-react";
import { InteropBackdrop } from "@/components/interop/interop-backdrop";
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
import { ReportForumContentButton } from "@/components/community/report-forum-content-button";
import { FORUM_AI_FACILITATOR_NAME } from "@/lib/forum-constants";
import { isForumAiFacilitatorReply } from "@/lib/forum-ai-reply";
import { ForumCategoryContentPanel } from "@/components/community/forum-category-content-panel";
import type { CategoryContentItem } from "@/lib/forum-category-content";

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
    <div className="border-b bg-muted/20">
      <div className="container py-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <p className="text-sm font-semibold text-foreground">このコミュニティの部屋</p>

          {/* 部屋カード一覧 */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((r) => (
              <Link
                key={r.id}
                href={`/forum/${r.id}`}
                className="group flex items-start gap-3 rounded-xl border bg-background p-3 transition-all hover:border-primary/30 hover:shadow-sm"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted/30">
                  <ForumRoomIcon roomId={r.id} emoji={r.emoji} size={36} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold group-hover:text-primary">{r.name}</p>
                  {r.description ? (
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{r.description}</p>
                  ) : null}
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{r.postCount}</span>
                    <span className="flex items-center gap-0.5"><Users className="h-3 w-3" />{r.participantCount}</span>
                  </div>
                </div>
                <ArrowLeft className="mt-0.5 h-3.5 w-3.5 shrink-0 rotate-180 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary/60" />
              </Link>
            ))}

            {/* 部屋作成カード（インライン展開） */}
            {!createOpen ? (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-background/60 p-4 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                <Plus className="h-4 w-4" />
                {isLoggedIn ? "新しい部屋を作る" : "ログインして部屋を作る"}
              </button>
            ) : (
              <div className="rounded-xl border-2 border-primary/30 bg-background p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground">新しい部屋</p>
                <Input
                  value={roomName}
                  onChange={(e) => { setRoomName(e.target.value); setError(null); }}
                  placeholder="部屋名（例: 授業実践シェア）"
                  className="text-sm"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
                <Textarea
                  rows={2}
                  value={roomDesc}
                  onChange={(e) => setRoomDesc(e.target.value)}
                  className="resize-none text-sm"
                  placeholder="説明（省略可）"
                />
                <ForumEmojiPicker value={roomEmoji} onChange={setRoomEmoji} />
                {error && (
                  <p className="text-xs font-medium text-destructive">{error}</p>
                )}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
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

// ─── 感情色（fromInterop モード用） ──────────────────────

function detectSentimentColor(body: string): string {
  const pos = (body.match(/良い|素晴らしい|嬉しい|楽しい|好き|賛成|最高|希望|感謝|できる|改善|前向き|ありがとう|期待|ぜひ|面白い|充実|成功|明るい/g) || []).length;
  const neg = (body.match(/悪い|困る|問題|心配|不安|反対|辛い|難しい|厳しい|懸念|課題|不足|無理|危険|リスク|批判|矛盾|格差/g) || []).length;
  const q   = (body.match(/[？?]|なぜ|どうして|どうやって|だろうか|でしょうか|かな[。、 ]|のか[。、 ]/g) || []).length;
  const exc = (body.match(/[！!]{2,}|絶対|必ず|革命|変革|どんどん|もっと/g) || []).length;
  const threshold = 2;
  if (pos >= threshold && pos > neg && pos > q) return "#9fe8c4";   // mint – ポジティブ
  if (neg >= threshold && neg > pos && neg > q) return "#ffc0c0";   // rose – 懸念・課題
  if (q >= threshold && q > pos)                return "#ffe4a0";   // amber – 疑問・問いかけ
  if (exc >= threshold)                          return "#d8b8ff";   // violet – 熱量・強調
  return "rgba(255,255,255,0.92)";
}

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
    <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
      <Bot className="h-3 w-3" />
      AI
    </span>
  );
}

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
      <span aria-hidden className="absolute left-3 top-0 bottom-0 w-px bg-violet-200" />
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
  fromInterop = false,
}: {
  reply: ForumReply & { isAi?: boolean };
  isAi?: boolean;
  postAuthorId?: string | null;
  postAuthorName?: string;
  postPostedAt?: string;
  roomAiDiscussion?: boolean;
  replyIndex?: number;
  onRequireLogin: () => void;
  fromInterop?: boolean;
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
      <span
        aria-hidden
        className={`absolute left-3 top-0 bottom-0 w-px ${isAiReply ? "bg-violet-200" : fromInterop ? "bg-white/15" : "bg-muted"}`}
      />
      <span
        aria-hidden
        className={`absolute left-2.5 top-5 h-1.5 w-1.5 rounded-full ${isAiReply ? "bg-violet-400" : fromInterop ? "bg-white/35" : "bg-muted-foreground/40"}`}
      />
      <div className="flex gap-3">
        <Avatar name={displayAuthorName} storedAuthorRole={reply.authorRole} isAi={isAiReply} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span
              className={`text-sm font-semibold ${isAiReply ? (fromInterop ? "text-violet-200" : "text-violet-800") : fromInterop ? "text-white" : ""}`}
            >
              {displayAuthorName}
            </span>
            {isAiReply ? <AiBadge /> : <OccupationBadge storedAuthorRole={reply.authorRole} />}
            {!isAiReply && reply.aiKenteiPassed && <AiKenteiBadge />}
            <span className={`text-xs ${fromInterop ? "text-white/50" : "text-muted-foreground"}`}>
              <RelativeTime iso={reply.postedAt} />
            </span>
          </div>
          <p className={`text-sm leading-7 whitespace-pre-wrap ${fromInterop ? "text-white/85" : "text-foreground"}`}>
            {reply.body}
          </p>
          <button
            type="button"
            onClick={toggleLike}
            className={`mt-2 flex items-center gap-1 text-xs transition-colors ${liked ? "text-pink-500" : fromInterop ? "text-white/50 hover:text-pink-400" : "text-muted-foreground hover:text-pink-500"}`}
          >
            <Heart className={`h-3.5 w-3.5 ${liked ? "fill-pink-500" : ""}`} />
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
  fromInterop = false,
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
  fromInterop?: boolean;
}) {
  const replyPreviewRole = forumRolePreviewFromProfile(organizationType, organizationTypeOther);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyNickname, setReplyNickname] = useState("");
  const [replyTitle, setReplyTitle] = useState("");
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

  const replyDisplayName = replyNickname.trim() || (isLoggedIn && userName ? userName : "");
  const canSubmitReply =
    !!replyText.trim() && !!replyDisplayName && !!replyTitle.trim() && !submittingReply;

  const submitReply = async () => {
    if (!canSubmitReply) return;
    setSubmittingReply(true);
    try {
      const res = await fetch(`/api/forum/posts/${post.id}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          authorName: replyDisplayName,
          authorRole: replyTitle.trim(),
          replyBody: replyText.trim(),
        }),
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
      className={[
        "overflow-hidden rounded-xl border shadow-xs transition-shadow hover:shadow-sm",
        fromInterop
          ? post.isPinned
            ? "border-amber-400/40 bg-[#12182e]/92 backdrop-blur-md"
            : "border-transparent bg-transparent shadow-none"
          : post.isPinned
            ? "border-amber-300 bg-amber-50/60 shadow-amber-100/60"
            : "bg-card text-card-foreground",
      ].join(" ")}
    >
      {/* 注目バナー */}
      {post.isPinned && (
        <div
          className={`flex items-center gap-2 border-b px-5 py-2 ${
            fromInterop
              ? "border-amber-400/30 bg-amber-500/15"
              : "border-amber-200 bg-amber-100/70"
          }`}
        >
          <Pin className="h-3.5 w-3.5 fill-amber-500 text-amber-500" aria-hidden />
          <span className={`text-xs font-bold uppercase tracking-wider ${fromInterop ? "text-amber-200" : "text-amber-700"}`}>
            注目
          </span>
          <span className={`ml-1 text-xs ${fromInterop ? "text-amber-200/80" : "text-amber-600/80"}`}>
            運営ピックアップ
          </span>
        </div>
      )}

      {/* AI要約（AIファシリテーターの最初の返信を要約として上部に表示） */}
      {aiReply && (
        <div className="border-b bg-violet-50/70 px-5 py-3">
          <div className="flex items-start gap-2">
            <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
              <Bot className="h-3.5 w-3.5 text-violet-600" />
              <span className="text-[11px] font-bold text-violet-700 uppercase tracking-wide">AI要約</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-xs leading-relaxed text-violet-800 ${aiSummaryExpanded ? "" : "line-clamp-2"}`}>
                {aiReply.body}
              </p>
              {aiReply.body.length > 100 && (
                <button
                  type="button"
                  onClick={() => setAiSummaryExpanded((v) => !v)}
                  className="mt-1 text-[11px] text-violet-600 hover:underline"
                >
                  {aiSummaryExpanded ? "閉じる" : "続きを読む"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={fromInterop ? "px-1.5 py-2" : "p-5"}>
        <div className="flex gap-2.5">
          <Avatar name={post.authorName} storedAuthorRole={post.authorRole} />
          <div className="flex-1 min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className={`text-sm font-semibold ${fromInterop ? "text-white/90" : ""}`}>{post.authorName}</span>
              <OccupationBadge storedAuthorRole={post.authorRole} />
              {post.aiKenteiPassed && <AiKenteiBadge />}
              <span className={`text-xs ${fromInterop ? "text-white/50" : "text-muted-foreground"}`}>
                <RelativeTime iso={post.postedAt} />
              </span>
            </div>
            {fromInterop ? (
              <div
                className="inline-block max-w-full rounded-2xl rounded-tl-sm px-3.5 py-2.5"
                style={{ background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.10)" }}
              >
                <p className="text-sm leading-7 whitespace-pre-wrap" style={{ color: detectSentimentColor(post.body) }}>{post.body}</p>
                {post.relatedArticleUrl && (
                  <a href={post.relatedArticleUrl} target="_blank" rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-indigo-300 hover:underline">
                    <Link2 className="h-3 w-3" />関連記事
                  </a>
                )}
              </div>
            ) : (
              <>
                <p className="text-sm leading-7 whitespace-pre-wrap text-foreground">
                  {post.body}
                </p>
                {post.relatedArticleUrl && (
                  <a href={post.relatedArticleUrl} target="_blank" rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    <Link2 className="h-3 w-3" />関連記事
                  </a>
                )}
              </>
            )}
            <div className="mt-3 flex items-center gap-4">
              <button
                type="button"
                onClick={toggleLike}
                className={`flex items-center gap-1 text-xs transition-colors ${liked ? "text-pink-500" : fromInterop ? "text-white/50 hover:text-pink-400" : "text-muted-foreground hover:text-pink-500"}`}
              >
                <Heart className={`h-3.5 w-3.5 ${liked ? "fill-pink-500" : ""}`} />
                {likeCount}
              </button>
              {hasReplies || isStreaming ? (
                <button
                  type="button"
                  onClick={() => setRepliesOpen((v) => !v)}
                  className={`flex items-center gap-1 text-xs transition-colors ${fromInterop ? "text-white/50 hover:text-white/85" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  {replies.length + (isStreaming ? 1 : 0)} 件の返信
                  {autoOpenReplies ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              ) : (
                <span className={`flex items-center gap-1 text-xs ${fromInterop ? "text-white/40" : "text-muted-foreground/60"}`}>
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
          <div
            className={`mt-4 ml-12 overflow-hidden rounded-xl border ${fromInterop ? "border-white/15 bg-[#0d1225]/88 backdrop-blur-md" : "bg-card text-card-foreground"}`}
          >
            <div className={`border-b px-4 py-2.5 space-y-1.5 ${fromInterop ? "border-white/12 bg-white/5" : "bg-muted/20"}`}>
              <div className="flex items-center gap-2.5">
                <UserAvatar name={replyDisplayName || "ゲスト"} avatarUrl={avatarUrl} size={26} />
                <span className={`text-xs font-medium ${fromInterop ? "text-white/85" : "text-foreground"}`}>
                  {replyDisplayName || "ニックネームを入力"}
                </span>
                {replyTitle.trim() ? (
                  <>
                    <span className={fromInterop ? "text-white/30" : "text-muted-foreground/40"}>·</span>
                    <span className={`text-[11px] ${fromInterop ? "text-white/55" : "text-muted-foreground"}`}>{replyTitle.trim()}</span>
                  </>
                ) : !fromInterop && isLoggedIn ? (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <OccupationBadge storedAuthorRole={replyPreviewRole} />
                    {aiKenteiPassed && <AiKenteiBadge />}
                  </>
                ) : null}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyNickname}
                  onChange={(e) => setReplyNickname(e.target.value)}
                  placeholder={userName || "ニックネーム（必須）"}
                  maxLength={30}
                  className={`h-6 flex-1 rounded border px-2 text-[11px] focus:outline-none focus:ring-1 ${fromInterop ? "border-white/20 bg-white/[0.08] text-white placeholder:text-white/35 focus:ring-white/30" : "border-border/60 bg-background/60 text-foreground placeholder:text-muted-foreground/50 focus:ring-primary/30"}`}
                />
                <input
                  type="text"
                  value={replyTitle}
                  onChange={(e) => setReplyTitle(e.target.value)}
                  placeholder="肩書・属性（必須）"
                  maxLength={40}
                  className={`h-6 flex-1 rounded border px-2 text-[11px] focus:outline-none focus:ring-1 ${fromInterop ? "border-white/20 bg-white/[0.08] text-white placeholder:text-white/35 focus:ring-white/30" : "border-border/60 bg-background/60 text-foreground placeholder:text-muted-foreground/50 focus:ring-primary/30"}`}
                />
              </div>
            </div>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="返信を入力…"
              rows={3}
              className={`w-full resize-none bg-transparent px-4 py-3 text-sm leading-6 outline-none ${fromInterop ? "text-white placeholder:text-white/35" : "placeholder:text-muted-foreground/50"}`}
              autoFocus
            />
            <div className={`flex items-center justify-end gap-2 border-t px-4 py-2 ${fromInterop ? "border-white/12 bg-white/[0.03]" : "bg-muted/20"}`}>
              <Button variant="ghost" size="sm" onClick={() => { setShowReplyForm(false); setReplyText(""); }} className="h-7 text-xs">キャンセル</Button>
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
        <div className={`border-t px-5 py-4 space-y-4 ${fromInterop ? "border-white/12 bg-white/[0.03]" : "bg-muted/10"}`}>
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
              fromInterop={fromInterop}
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
      <div style={{ width: size, height: size }} className="flex shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm">
        <span aria-hidden>🎭</span>
      </div>
    );
  }
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatarUrl} alt={name} style={{ width: size, height: size }} className="shrink-0 rounded-full object-cover ring-2 ring-primary/10" />
    );
  }
  return (
    <div style={{ width: size, height: size, fontSize: size * 0.38 }} className="flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
      {name.charAt(0) || "?"}
    </div>
  );
}

// ─── フォーマットツールバー ─────────────────────────────

function FormatToolbar({
  textareaRef,
  body,
  setBody,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  body: string;
  setBody: (v: string) => void;
}) {
  const applyInline = (prefix: string, suffix: string = prefix) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = body.slice(start, end);
    const newText = body.slice(0, start) + prefix + selected + suffix + body.slice(end);
    setBody(newText);
    requestAnimationFrame(() => {
      el.setSelectionRange(start + prefix.length, end + prefix.length);
      el.focus();
    });
  };

  const applyLinePrefix = (prefix: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const lineStart = body.lastIndexOf("\n", start - 1) + 1;
    const newText = body.slice(0, lineStart) + prefix + body.slice(lineStart);
    setBody(newText);
    requestAnimationFrame(() => {
      el.setSelectionRange(start + prefix.length, start + prefix.length);
      el.focus();
    });
  };

  const tools: { icon: React.ReactNode; label: string; action: () => void }[] = [
    { icon: <Bold className="h-3.5 w-3.5" />, label: "太字", action: () => applyInline("**") },
    { icon: <Italic className="h-3.5 w-3.5" />, label: "斜体", action: () => applyInline("*") },
    { icon: <Underline className="h-3.5 w-3.5" />, label: "下線", action: () => applyInline("__") },
    { icon: <Strikethrough className="h-3.5 w-3.5" />, label: "取消線", action: () => applyInline("~~") },
    { icon: <Link2 className="h-3.5 w-3.5" />, label: "リンク", action: () => applyInline("[", "](url)") },
    { icon: <ListOrdered className="h-3.5 w-3.5" />, label: "番号リスト", action: () => applyLinePrefix("1. ") },
    { icon: <List className="h-3.5 w-3.5" />, label: "箇条書き", action: () => applyLinePrefix("- ") },
    { icon: <Quote className="h-3.5 w-3.5" />, label: "引用", action: () => applyLinePrefix("> ") },
    { icon: <ImageIcon className="h-3.5 w-3.5" />, label: "画像", action: () => applyInline("![画像](", ")") },
  ];

  return (
    <div className="flex items-center gap-0.5 border-t bg-muted/20 px-3 py-1.5">
      {tools.map((tool, i) => (
        <>
          {(i === 4 || i === 5 || i === 7) && (
            <span key={`sep-${i}`} className="mx-1 h-4 w-px bg-border" />
          )}
          <button
            key={tool.label}
            type="button"
            title={tool.label}
            onClick={tool.action}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {tool.icon}
          </button>
        </>
      ))}
    </div>
  );
}

// ─── 投稿フォーム ────────────────────────────────────────

type PostDraft = {
  body: string;
  authorRole: string;
  relatedArticleUrl: string;
  displayName: string;
  customTitle: string;
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

const AVATAR_COLORS = [
  { bg: "linear-gradient(135deg, #90c8ff 0%, #1a60e8 100%)", label: "青" },
  { bg: "linear-gradient(135deg, #90e890 0%, #188018 100%)", label: "緑" },
  { bg: "linear-gradient(135deg, #ff9080 0%, #c01010 100%)", label: "赤" },
  { bg: "linear-gradient(135deg, #ffe880 0%, #c07000 100%)", label: "黄" },
] as const;

function NewPostComposer({
  onSubmit,
  roomId,
  userName,
  avatarUrl,
  isLoggedIn,
  roomLabel,
  submitting,
  organizationType,
  organizationTypeOther,
  aiKenteiPassed,
  fromInterop = false,
}: {
  onSubmit: (draft: PostDraft) => Promise<void>;
  roomId: string;
  userName: string;
  avatarUrl?: string | null;
  isLoggedIn: boolean;
  roomLabel: string;
  submitting: boolean;
  organizationType?: string | null;
  organizationTypeOther?: string | null;
  aiKenteiPassed?: boolean;
  fromInterop?: boolean;
}) {
  const postPreviewRole = forumRolePreviewFromProfile(organizationType, organizationTypeOther);
  const [body, setBody] = useState("");
  const [avatarColorIdx, setAvatarColorIdx] = useState(0);
  const [customTitle, setCustomTitle] = useState("");
  const [customNickname, setCustomNickname] = useState("");
  const [relatedArticleUrl, setRelatedArticleUrl] = useState("");
  const [showUrl, setShowUrl] = useState(false);
  const [draftFromAiLoaded, setDraftFromAiLoaded] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const displayName = customNickname.trim() || (isLoggedIn && userName ? userName : "");
  const remaining = MAX_BODY - body.length;
  const canSubmit =
    body.trim().length > 0 &&
    body.length <= MAX_BODY &&
    !submitting &&
    displayName.length > 0 &&
    customTitle.trim().length > 0;

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
      authorRole: customTitle.trim(),
      relatedArticleUrl,
      displayName,
      customTitle: customTitle.trim(),
    });
    setBody("");
    setRelatedArticleUrl("");
    setShowUrl(false);
  };

  // 特設(fromInterop)はログイン不要で投稿可。通常の井戸端は従来どおり会員限定。
  if (!isLoggedIn && !fromInterop) {
    return (
      <div className="rounded-2xl border border-dashed bg-muted/20 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">投稿するにはログインしてください</p>
            <p className="mt-1 text-xs text-muted-foreground">井戸端会議への投稿は会員限定です。</p>
          </div>
          <Button asChild className="gap-1.5">
            <Link href="/auth/login"><LogIn className="h-4 w-4" />ログインする</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      id="new-post"
      ref={rootRef}
      className={`relative overflow-hidden rounded-2xl ${fromInterop ? "" : "border shadow-xs bg-card"}`}
      style={fromInterop ? {
        background: "rgba(10,16,42,0.52)",
        border: "1.5px solid rgba(255,255,255,0.22)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.48), inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(255,255,255,0.04)",
        backdropFilter: "blur(32px) saturate(1.5)",
        WebkitBackdropFilter: "blur(32px) saturate(1.5)",
      } : undefined}
    >
      {/* リキッドグラス上端ハイライト */}
      {fromInterop && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-2xl"
          style={{ background: "linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.55) 30%, rgba(255,255,255,0.70) 50%, rgba(255,255,255,0.55) 70%, transparent 95%)" }}
        />
      )}
      {/* ヘッダー */}
      <div className={`border-b px-4 py-3 ${fromInterop ? "border-white/12 bg-white/5" : "bg-muted/20"}`}>
        <p className={`text-sm font-semibold ${fromInterop ? "text-white" : ""}`}>投稿する</p>
        {roomLabel ? (
          <p className={`mt-0.5 text-xs line-clamp-1 ${fromInterop ? "text-white/55" : "text-muted-foreground"}`}>{roomLabel}</p>
        ) : null}
      </div>

      {/* AIドラフト通知 */}
      {draftFromAiLoaded && (
        <div className="flex items-center justify-between border-b bg-violet-50/80 px-4 py-2.5">
          <p className="text-xs text-violet-800">AIで整理した下書きを反映しました。</p>
          <Button type="button" size="sm" variant="ghost" className="h-7 text-xs text-violet-700 hover:bg-violet-100" onClick={() => setDraftFromAiLoaded(false)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* 投稿者バー */}
      <div className={`border-b px-4 py-2 space-y-1.5 ${fromInterop ? "border-white/12 bg-white/[0.03]" : "bg-muted/10"}`}>
        <div className="flex items-center gap-2">
          {fromInterop ? (
            <span className="flex items-center gap-1">
              {AVATAR_COLORS.map((c, ci) => (
                <button
                  key={ci}
                  type="button"
                  onClick={() => setAvatarColorIdx(ci)}
                  className="rounded-full transition-transform hover:scale-110 focus:outline-none"
                  style={{
                    width: 22, height: 22,
                    background: c.bg,
                    boxShadow: avatarColorIdx === ci
                      ? `0 0 0 2px #fff, 0 0 0 4px ${c.bg}88`
                      : "0 1px 3px rgba(0,0,0,0.3)",
                  }}
                  aria-label={c.label}
                />
              ))}
            </span>
          ) : (
            <UserAvatar name={displayName || "ゲスト"} avatarUrl={avatarUrl} size={26} />
          )}
          <span className={`text-xs font-medium ${fromInterop ? "text-white/80" : ""}`}>
            {displayName || "ニックネームを入力"}
          </span>
          {customTitle.trim() ? (
            <>
              <span className={fromInterop ? "text-white/30" : "text-muted-foreground/40"}>·</span>
              <span className={`text-[11px] ${fromInterop ? "text-white/55" : "text-muted-foreground"}`}>{customTitle.trim()}</span>
            </>
          ) : !fromInterop && isLoggedIn ? (
            <>
              <span className="text-muted-foreground/40">·</span>
              <OccupationBadge storedAuthorRole={postPreviewRole} />
              {aiKenteiPassed && <AiKenteiBadge />}
            </>
          ) : null}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={customNickname}
            onChange={(e) => setCustomNickname(e.target.value)}
            placeholder={userName || "ニックネーム（必須）"}
            maxLength={30}
            className={`h-6 flex-1 rounded border px-2 text-[11px] focus:outline-none focus:ring-1 ${fromInterop ? "border-white/20 bg-white/[0.08] text-white placeholder:text-white/35 focus:ring-white/30" : "border-border/60 bg-background/60 text-foreground placeholder:text-muted-foreground/50 focus:ring-primary/30"}`}
          />
          <input
            type="text"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder="肩書・属性（必須）"
            maxLength={40}
            className={`h-6 flex-1 rounded border px-2 text-[11px] focus:outline-none focus:ring-1 ${fromInterop ? "border-white/20 bg-white/[0.08] text-white placeholder:text-white/35 focus:ring-white/30" : "border-border/60 bg-background/60 text-foreground placeholder:text-muted-foreground/50 focus:ring-primary/30"}`}
          />
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
          className={`w-full resize-none bg-transparent text-sm leading-7 outline-none ${fromInterop ? "text-white placeholder:text-white/40" : "text-foreground placeholder:text-muted-foreground/60"}`}
        />
        {!fromInterop && showUrl && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
            <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <Input
              type="url"
              value={relatedArticleUrl}
              onChange={(e) => setRelatedArticleUrl(e.target.value)}
              placeholder="https://... （関連記事URL）"
              className="h-7 border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
            />
          </div>
        )}
      </div>

      {/* フォーマットツールバー */}
      {!fromInterop && <FormatToolbar textareaRef={textareaRef} body={body} setBody={setBody} />}

      {/* 送信フッター */}
      <div className={`flex items-center justify-between gap-3 border-t px-4 py-2.5 ${fromInterop ? "border-white/12 bg-white/[0.03]" : "bg-muted/10"}`}>
        {!fromInterop && (
          <button
            type="button"
            title="関連記事URLを追加"
            onClick={() => setShowUrl((v) => !v)}
            className={["rounded-full border p-1.5 transition-colors",
              showUrl ? "border-primary/40 bg-primary/5 text-primary" : "border-transparent text-muted-foreground hover:bg-muted",
            ].join(" ")}
          >
            <Link2 className="h-3 w-3" />
          </button>
        )}
        <div className="flex items-center gap-3 ml-auto">
          <span className={`text-[11px] tabular-nums ${remaining < 0 ? "text-destructive font-semibold" : remaining < 50 ? "text-amber-500" : fromInterop ? "text-white/40" : "text-muted-foreground/60"}`}>
            {remaining}
          </span>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            size="sm"
            className={`gap-1.5 rounded-full px-5 ${fromInterop ? "bg-white/15 text-white border border-white/25 hover:bg-white/25" : ""}`}
            variant={fromInterop ? "ghost" : "default"}
          >
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
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100">
          <Bot className="h-3.5 w-3.5 text-violet-600" />
        </div>
        <p className="text-sm font-semibold leading-snug">投稿内容に迷っていますか？</p>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        AIと対話することで、あなたの考えを整理して投稿文を作れます。
      </p>
      <div className="flex-1" />
      <OpenAiChatButton
        variant="outline"
        className="w-full border-violet-200 text-violet-700 hover:bg-violet-50"
        initialMessage={
          body?.trim()
            ? `以下の投稿下書きを、井戸端会議向けに深めたいです。\n\n${body.trim()}`
            : `「${roomTheme}」について、井戸端会議への投稿文を作るために議論を始めたいです。`
        }
        preferredMode="discussion"
        launchContext="forum-compose"
        forumTopic={roomTheme}
      >
        <Bot className="mr-1.5 h-3.5 w-3.5" />
        AIであなたの意見を整理する
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
  const searchParams = useSearchParams();
  const fromInterop = searchParams.get("from") === "interop";
  const activeTopicId = searchParams.get("topic")?.trim() || null;
  const [activeTopicTitle, setActiveTopicTitle] = useState<string | null>(null);
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
    if (!activeTopicId) {
      setActiveTopicTitle(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/forum/rooms/${room.id}/topics`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !Array.isArray(data.topics)) return;
        const match = data.topics.find((t: { id: string; title: string }) => t.id === activeTopicId);
        setActiveTopicTitle(match?.title ?? null);
      })
      .catch(console.error);
    return () => { cancelled = true; };
  }, [room.id, activeTopicId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const postsUrl = activeTopicId
      ? `/api/forum/rooms/${room.id}/posts?topicId=${encodeURIComponent(activeTopicId)}`
      : `/api/forum/rooms/${room.id}/posts`;
    fetch(postsUrl, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => { if (!cancelled && data.posts) setPosts(data.posts); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [room.id, activeTopicId]);

  const pinnedPosts = useMemo(() => posts.filter((p) => p.isPinned && !p.isHidden), [posts]);
  const regularPosts = useMemo<ForumPost[]>(() => {
    const unpinned = posts.filter((p) => !p.isPinned && !p.isHidden);
    if (sort === "popular") return [...unpinned].sort((a, b) => b.likeCount - a.likeCount);
    return [...unpinned].sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
  }, [posts, sort]);

  const handleNewPost = useCallback(async (draft: PostDraft) => {
    if (submitting) return;
    setSubmitting(true);
    const authorName = draft.displayName.trim();
    const authorRole = draft.customTitle.trim();
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
          topicId: activeTopicId ?? room.currentTopicId ?? undefined,
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
  }, [activeTopicId, room, submitting]);

  const handleReplyAdded = useCallback((postId: string, reply: ForumReply) => {
    setPosts((prev) => prev.map((p) => p.id !== postId ? p : { ...p, replies: [...(p.replies ?? []), reply] }));
  }, []);

  const aiEnabled = !!room.aiDiscussion;

  return (
    <div className={fromInterop ? "relative min-h-screen text-white" : "min-h-screen bg-gradient-to-b from-background to-muted/20"}>
      {fromInterop && <InteropBackdrop />}
      {/* ─── 部屋ヘッダー ─── */}
      <section className={`relative overflow-hidden border-b ${fromInterop ? "border-white/10 bg-transparent" : "bg-gradient-to-br from-primary/8 via-primary/4 to-background"}`}>
        <div className="container py-8 md:py-10">
          <Link
            href={
              fromInterop
                ? // 来た場所に応じて復元：論点経由→論点ビュー / 井戸端経由→ハブ
                  activeTopicId
                  ? `/interop?topic=${encodeURIComponent(room.id)}`
                  : "/interop?hub=1"
                : categoryContext
                  ? `/forum?cat=${encodeURIComponent(categoryContext.categorySlug)}`
                  : "/forum"
            }
            className={`mb-5 inline-flex items-center gap-1.5 text-sm transition-colors ${fromInterop ? "text-white/60 hover:text-white" : "text-muted-foreground hover:text-foreground"}`}
          >
            <ArrowLeft className="h-4 w-4" />
            {fromInterop
              ? "インタロップに戻る"
              : categoryContext
                ? "サブカテゴリの選択に戻る"
                : "AIUEO 井戸端会議"}
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className={`shrink-0 rounded-2xl border p-3 ${ROOM_BG_COLORS[room.id] ?? "bg-muted border-border"}`}>
                <ForumRoomIcon roomId={room.id} emoji={room.emoji} size={36} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold md:text-3xl">{room.name}</h1>
                  {aiEnabled && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
                      <Zap className="h-3 w-3" />AIディスカッション
                    </span>
                  )}
                </div>
                {activeTopicTitle ? (
                  <p className={`mt-1 text-sm font-medium ${fromInterop ? "text-amber-200/90" : "text-primary"}`}>
                    論点: {activeTopicTitle}
                  </p>
                ) : null}
                <p className={`mt-1 text-sm ${fromInterop ? "text-white/65" : "text-muted-foreground"}`}>
                  {room.description}
                </p>
                <div className={`mt-2 flex flex-wrap items-center gap-3 text-xs ${fromInterop ? "text-white/50" : "text-muted-foreground"}`}>
                  <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" />{posts.length} 投稿</span>
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{room.participantCount} 人参加</span>
                </div>
              </div>
            </div>
            {auth.role === "ADMIN" && !fromInterop && (
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[220px] sm:items-end">
                {highlightFromNotify && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                    このルームの人間の発言がしきい値を超えました。記事化のタイミングを検討できます。
                  </div>
                )}
                <Button asChild size="sm" className="gap-2 shadow-sm">
                  <Link href={`/articles/create?forumRoom=${encodeURIComponent(room.id)}`}>
                    <FileText className="h-4 w-4" />この話題を記事にする
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
        <div className="pointer-events-none absolute -top-20 -right-20 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
      </section>

      {/* ─── カテゴリ別の関連コンテンツ ─── */}
      {categoryContext && categoryContext.contentKind !== "community" && (
        <ForumCategoryContentPanel
          items={categoryContext.items}
          contentKind={categoryContext.contentKind}
          categorySlug={categoryContext.categorySlug}
          subCategorySlug={categoryContext.subCategorySlug}
        />
      )}

      {/* ─── コミュニティ: 部屋一覧・作成（投稿欄は出さない） ─── */}
      {categoryContext?.contentKind === "community" && (
        <CommunityRoomsSection
          categoryId={categoryContext.categoryId}
          subCategoryId={categoryContext.subCategoryId}
          categorySlug={categoryContext.categorySlug}
          subCategorySlug={categoryContext.subCategorySlug}
          mainRoomId={room.id}
          isLoggedIn={auth.isLoggedIn}
        />
      )}

      {/* ─── メインコンテンツ（コミュニティページでは表示しない） ─── */}
      {categoryContext?.contentKind === "community" ? null : (
      <div className={`container py-8 ${fromInterop ? "relative z-10" : ""}`}>
        <div className={`mx-auto max-w-5xl ${fromInterop ? "flex flex-col gap-5" : "space-y-8"}`}>

          {/* 投稿フォーム ＋ AI壁打ちサイドバー（特設はチャット風に下へ固定） */}
          <div
            className={`grid grid-cols-1 gap-4 ${
              fromInterop
                ? "order-2 sticky bottom-3 z-30 rounded-2xl"
                : "lg:grid-cols-[1fr_260px]"
            }`}
          >
            <NewPostComposer
              onSubmit={handleNewPost}
              roomId={room.id}
              userName={auth.name}
              avatarUrl={auth.avatarUrl}
              isLoggedIn={auth.isLoggedIn}
              roomLabel={roomDiscussionContext}
              submitting={submitting}
              organizationType={auth.organizationType}
              organizationTypeOther={auth.organizationTypeOther}
              aiKenteiPassed={auth.aiKenteiPassed}
              fromInterop={fromInterop}
            />
            {!fromInterop && <AiHelperSidebar roomTheme={roomDiscussionContext} body={composerBody} />}
          </div>

          {/* 投稿一覧（特設は上に配置） */}
          <div className={fromInterop ? "order-1" : "contents"}>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className={`h-8 w-8 animate-spin ${fromInterop ? "text-white/50" : "text-muted-foreground"}`} />
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
                      fromInterop={fromInterop}
                    />
                  ))}
                </div>
              )}

              {/* ソート＋通常投稿 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className={`text-sm ${fromInterop ? "text-white/60" : "text-muted-foreground"}`}>
                    {regularPosts.length} 件の投稿
                  </p>
                  <Tabs value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                    <TabsList className="h-8">
                      <TabsTrigger value="newest" className="h-6 px-3 text-xs">新着順</TabsTrigger>
                      <TabsTrigger value="popular" className="h-6 px-3 text-xs">人気順</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {regularPosts.length === 0 ? (
                  <div
                    className={`flex flex-col items-center gap-4 rounded-xl border border-dashed py-16 text-center ${
                      fromInterop ? "border-white/20 bg-white/[0.04]" : "bg-muted/20"
                    }`}
                  >
                    <MessageSquare className={`h-12 w-12 ${fromInterop ? "text-white/25" : "text-muted-foreground/30"}`} />
                    <div>
                      <p className={`text-base font-medium ${fromInterop ? "text-white/85" : ""}`}>まだ投稿がありません</p>
                      <p className={`mt-1 text-sm ${fromInterop ? "text-white/55" : "text-muted-foreground"}`}>
                        最初の投稿者になりましょう
                      </p>
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
                        fromInterop={fromInterop}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
      )}

      <Dialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>ログインが必要です</DialogTitle>
            <DialogDescription>返信やいいねを利用するには、ログインまたは会員登録をお願いします。</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setLoginDialogOpen(false)}>閉じる</Button>
            <Button asChild onClick={() => setLoginDialogOpen(false)}>
              <Link href="/auth/login">ログイン・会員登録</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
