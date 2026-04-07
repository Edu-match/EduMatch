"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CornerDownRight, LogIn, Send, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { type CommunityComment } from "@/lib/mock-community";
import { cn } from "@/lib/utils";

// ─── 認証フック ─────────────────────────────────────────────
function useAuthUser() {
  const [authUser, setAuthUser] = useState<{
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
        setAuthUser({ name: name ?? "", isLoading: false, isLoggedIn: !!name });
      })
      .catch(() =>
        setAuthUser({ name: "", isLoading: false, isLoggedIn: false })
      );
  }, []);

  return authUser;
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

function updateCommentTree(
  comments: CommunityComment[],
  targetId: string,
  updater: (c: CommunityComment) => CommunityComment
): CommunityComment[] {
  return comments.map((c) => {
    if (c.id === targetId) return updater(c);
    if (!c.replies?.length) return c;
    return { ...c, replies: updateCommentTree(c.replies, targetId, updater) };
  });
}

// ─── 投稿者アバター ────────────────────────────────────────
function AuthorAvatar({ name }: { name: string }) {
  const initial = name.charAt(0) || "?";
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
      {initial}
    </div>
  );
}

// ─── コメント1件 ───────────────────────────────────────────
function CommentCard({
  comment,
  depth = 0,
  likedIds,
  onLike,
  onReply,
  isReplyOpen,
}: {
  comment: CommunityComment;
  depth?: number;
  likedIds: Set<string>;
  onLike: (id: string) => void;
  onReply: (id: string | null) => void;
  isReplyOpen?: boolean;
}) {
  const isLiked = likedIds.has(comment.id);

  return (
    <div className={cn("flex gap-3", depth > 0 && "ml-11")}>
      <AuthorAvatar name={comment.authorName} />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{comment.authorName}</span>
          <span className="text-xs text-muted-foreground">
            {formatDate(comment.postedAt)}
          </span>
        </div>

        <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/90">
          {comment.body}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onLike(comment.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              isLiked
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
            )}
          >
            <ThumbsUp className="h-3 w-3" />
            参考になった {comment.helpfulCount > 0 ? comment.helpfulCount : ""}
          </button>

          {depth === 0 && (
            <button
              type="button"
              onClick={() => onReply(isReplyOpen ? null : comment.id)}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <CornerDownRight className="h-3 w-3" />
              返信
            </button>
          )}
        </div>

        {comment.replies?.map((reply) => (
          <CommentCard
            key={reply.id}
            comment={reply}
            depth={depth + 1}
            likedIds={likedIds}
            onLike={onLike}
            onReply={onReply}
          />
        ))}
      </div>
    </div>
  );
}

// ─── 入力フォーム ──────────────────────────────────────────
function ComposerBox({
  userName,
  placeholder,
  submitLabel,
  onSubmit,
  compact = false,
}: {
  userName: string;
  placeholder: string;
  submitLabel: string;
  onSubmit: (body: string) => void;
  compact?: boolean;
}) {
  const [body, setBody] = useState("");

  const handleSubmit = () => {
    if (!body.trim()) return;
    onSubmit(body.trim());
    setBody("");
  };

  return (
    <div className={cn("space-y-3", compact && "pl-11")}>
      {!compact && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{userName}</span>
          {" "}としてコメントします
        </p>
      )}
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={compact ? 2 : 4}
        className="resize-none"
      />
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          onClick={handleSubmit}
          disabled={!body.trim()}
        >
          <Send className="h-3.5 w-3.5" />
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

// ─── メインコンポーネント ───────────────────────────────────
export function CommentSection({
  initialComments = [],
  placeholder = "コミュニティに共有したい意見や体験を書いてください",
  submitLabel = "コメントを投稿",
  emptyMessage = "まだコメントはありません。最初の投稿をしてみましょう。",
}: {
  initialComments?: CommunityComment[];
  placeholder?: string;
  submitLabel?: string;
  emptyMessage?: string;
}) {
  const { name, isLoading, isLoggedIn } = useAuthUser();
  const [comments, setComments] = useState<CommunityComment[]>(initialComments);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const total = useMemo(
    () => comments.reduce((n, c) => n + 1 + (c.replies?.length ?? 0), 0),
    [comments]
  );

  const handleLike = (id: string) => {
    const liked = likedIds.has(id);
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (liked) { next.delete(id); } else { next.add(id); }
      return next;
    });
    setComments((prev) =>
      updateCommentTree(prev, id, (c) => ({
        ...c,
        helpfulCount: Math.max(0, c.helpfulCount + (liked ? -1 : 1)),
      }))
    );
  };

  const handleComment = (body: string) => {
    const next: CommunityComment = {
      id: `c-${Date.now()}`,
      authorName: name,
      postedAt: new Date().toISOString(),
      body,
      helpfulCount: 0,
      replies: [],
    };
    setComments((prev) => [...prev, next]);
  };

  const handleReply = (parentId: string, body: string) => {
    const reply: CommunityComment = {
      id: `r-${Date.now()}`,
      authorName: name,
      postedAt: new Date().toISOString(),
      body,
      helpfulCount: 0,
    };
    setComments((prev) =>
      updateCommentTree(prev, parentId, (c) => ({
        ...c,
        replies: [...(c.replies ?? []), reply],
      }))
    );
    setReplyingTo(null);
  };

  return (
    <div className="space-y-5">
      {/* 投稿エリア */}
      {isLoading ? (
        <div className="h-10 animate-pulse rounded-lg bg-muted" />
      ) : isLoggedIn ? (
        <Card className="border bg-background shadow-sm">
          <CardContent className="p-4">
            <ComposerBox
              userName={name}
              placeholder={placeholder}
              submitLabel={submitLabel}
              onSubmit={handleComment}
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="border bg-muted/30">
          <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              コメントするにはログインが必要です
            </p>
            <Button asChild size="sm" variant="default">
              <Link href="/login">
                <LogIn className="h-4 w-4" />
                ログインする
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* コメント一覧ヘッダー */}
      {total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">
            コメント <span className="text-muted-foreground font-normal">{total}件</span>
          </p>
        </div>
      )}

      {/* コメント一覧 */}
      {comments.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="space-y-5">
          {comments.map((comment) => (
            <div key={comment.id} className="space-y-3">
              <CommentCard
                comment={comment}
                likedIds={likedIds}
                onLike={handleLike}
                onReply={(id) => {
                  setReplyingTo(id);
                }}
                isReplyOpen={replyingTo === comment.id}
              />
              {replyingTo === comment.id && isLoggedIn && (
                <>
                  <Separator className="ml-11" />
                  <ComposerBox
                    userName={name}
                    placeholder="返信を入力してください"
                    submitLabel="返信を投稿"
                    onSubmit={(body) => handleReply(comment.id, body)}
                    compact
                  />
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
