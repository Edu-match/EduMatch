"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Award,
  CheckCircle2,
  CornerDownRight,
  LogIn,
  Send,
  ThumbsUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { type ForumAnswer } from "@/lib/mock-community";
import { cn } from "@/lib/utils";

// ─── 認証フック ─────────────────────────────────────────────
export function useAuthUser() {
  const [auth, setAuth] = useState<{
    name: string;
    avatarUrl: string | null;
    organizationType: string | null;
    organizationTypeOther: string | null;
    aiKenteiPassed: boolean;
    isLoading: boolean;
    isLoggedIn: boolean;
  }>({
    name: "",
    avatarUrl: null,
    organizationType: null,
    organizationTypeOther: null,
    aiKenteiPassed: false,
    isLoading: true,
    isLoggedIn: false,
  });

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const name =
          data?.profile?.name ?? data?.user?.email?.split("@")[0] ?? null;
        const avatarUrl = data?.profile?.avatar_url ?? null;
        const organizationType = data?.profile?.organization_type ?? null;
        const organizationTypeOther = data?.profile?.organization_type_other ?? null;
        const aiKenteiPassed = data?.profile?.ai_kentei_passed ?? false;
        setAuth({
          name: name ?? "",
          avatarUrl,
          organizationType,
          organizationTypeOther,
          aiKenteiPassed,
          isLoading: false,
          isLoggedIn: !!name,
        });
      })
      .catch(() =>
        setAuth({
          name: "",
          avatarUrl: null,
          organizationType: null,
          organizationTypeOther: null,
          aiKenteiPassed: false,
          isLoading: false,
          isLoggedIn: false,
        })
      );
  }, []);

  return auth;
}

// ─── ユーティリティ ─────────────────────────────────────────
export function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(new Date(dateString));
}

function updateAnswerTree(
  answers: ForumAnswer[],
  targetId: string,
  updater: (a: ForumAnswer) => ForumAnswer
): ForumAnswer[] {
  return answers.map((a) => {
    if (a.id === targetId) return updater(a);
    if (!a.replies?.length) return a;
    return { ...a, replies: updateAnswerTree(a.replies, targetId, updater) };
  });
}

// ─── 投稿者アバター ─────────────────────────────────────────
function AuthorAvatar({ name }: { name: string }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
      {name.charAt(0) || "?"}
    </div>
  );
}

// ─── 回答1件 ───────────────────────────────────────────────
function AnswerCard({
  answer,
  depth = 0,
  isBest,
  canSelectBest,
  likedIds,
  onLike,
  onSelectBest,
  onReply,
  isReplyOpen,
}: {
  answer: ForumAnswer;
  depth?: number;
  isBest: boolean;
  canSelectBest: boolean;
  likedIds: Set<string>;
  onLike: (id: string) => void;
  onSelectBest: (id: string) => void;
  onReply: (id: string | null) => void;
  isReplyOpen?: boolean;
}) {
  const isLiked = likedIds.has(answer.id);

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-colors",
        isBest
          ? "border-amber-300 bg-amber-50/60 shadow-sm"
          : "border bg-card",
        depth > 0 && "ml-12 bg-muted/20"
      )}
    >
      {isBest && (
        <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-amber-700">
          <Award className="h-4 w-4 fill-amber-400 text-amber-500" />
          ベストアンサー
        </div>
      )}

      {/* 投稿者・日時 */}
      <div className="mb-3 flex items-start gap-3">
        <AuthorAvatar name={answer.authorName} />
        <div>
          <p className="text-sm font-semibold">{answer.authorName}</p>
          <p className="text-xs text-muted-foreground">{formatDate(answer.postedAt)}</p>
        </div>
      </div>

      {/* 本文 */}
      <p className="mb-4 whitespace-pre-wrap text-sm leading-7 text-foreground/90">
        {answer.body}
      </p>

      {/* アクション */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onLike(answer.id)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
            isLiked
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
          )}
        >
          <ThumbsUp className="h-3 w-3" />
          参考になった {answer.helpfulCount > 0 ? answer.helpfulCount : ""}
        </button>

        {depth === 0 && (
          <button
            type="button"
            onClick={() => onReply(isReplyOpen ? null : answer.id)}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <CornerDownRight className="h-3 w-3" />
            返信
          </button>
        )}

        {canSelectBest && depth === 0 && !isBest && (
          <button
            type="button"
            onClick={() => onSelectBest(answer.id)}
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100"
          >
            <Award className="h-3 w-3" />
            ベストアンサーに選ぶ
          </button>
        )}

        {canSelectBest && isBest && (
          <button
            type="button"
            onClick={() => onSelectBest(answer.id)}
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-50"
          >
            <Award className="h-3 w-3" />
            選択を解除
          </button>
        )}
      </div>

      {/* ネスト返信 */}
      {answer.replies?.map((reply) => (
        <div key={reply.id} className="mt-3">
          <AnswerCard
            answer={reply}
            depth={depth + 1}
            isBest={false}
            canSelectBest={false}
            likedIds={likedIds}
            onLike={onLike}
            onSelectBest={onSelectBest}
            onReply={onReply}
          />
        </div>
      ))}
    </div>
  );
}

// ─── 入力フォーム ───────────────────────────────────────────
function AnswerComposer({
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
    <div className="space-y-3">
      {!compact && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{userName}</span>
          {" "}として投稿します
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
export function AnswerSection({
  initialAnswers = [],
  questionAuthorName,
  initialBestAnswerId,
  onBestAnswerChange,
}: {
  initialAnswers?: ForumAnswer[];
  questionAuthorName: string;
  initialBestAnswerId?: string;
  onBestAnswerChange?: (id: string | undefined) => void;
}) {
  const { name, isLoading, isLoggedIn } = useAuthUser();
  const [answers, setAnswers] = useState<ForumAnswer[]>(initialAnswers);
  const [bestAnswerId, setBestAnswerId] = useState<string | undefined>(initialBestAnswerId);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const canSelectBest = isLoggedIn && name === questionAuthorName;

  const sorted = useMemo(() => {
    const best = answers.filter((a) => a.id === bestAnswerId);
    const rest = answers.filter((a) => a.id !== bestAnswerId);
    return [...best, ...rest];
  }, [answers, bestAnswerId]);

  const handleLike = (id: string) => {
    const liked = likedIds.has(id);
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (liked) { next.delete(id); } else { next.add(id); }
      return next;
    });
    setAnswers((prev) =>
      updateAnswerTree(prev, id, (a) => ({
        ...a,
        helpfulCount: Math.max(0, a.helpfulCount + (liked ? -1 : 1)),
      }))
    );
  };

  const handleSelectBest = (id: string) => {
    const next = bestAnswerId === id ? undefined : id;
    setBestAnswerId(next);
    onBestAnswerChange?.(next);
  };

  const handleAnswerSubmit = (body: string) => {
    const next: ForumAnswer = {
      id: `a-${Date.now()}`,
      authorName: name,
      postedAt: new Date().toISOString(),
      body,
      helpfulCount: 0,
      replies: [],
    };
    setAnswers((prev) => [...prev, next]);
  };

  const handleReplySubmit = (parentId: string, body: string) => {
    const reply: ForumAnswer = {
      id: `r-${Date.now()}`,
      authorName: name,
      postedAt: new Date().toISOString(),
      body,
      helpfulCount: 0,
    };
    setAnswers((prev) =>
      updateAnswerTree(prev, parentId, (a) => ({
        ...a,
        replies: [...(a.replies ?? []), reply],
      }))
    );
    setReplyingTo(null);
  };

  return (
    <div className="space-y-5">
      {/* 回答フォーム */}
      {isLoading ? (
        <div className="h-10 animate-pulse rounded-lg bg-muted" />
      ) : isLoggedIn ? (
        <Card className="border bg-background shadow-sm">
          <CardContent className="p-5">
            <p className="mb-3 text-sm font-semibold">回答する</p>
            <AnswerComposer
              userName={name}
              placeholder="あなたの知識や経験を共有してください"
              submitLabel="回答を投稿"
              onSubmit={handleAnswerSubmit}
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="border bg-muted/30">
          <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              回答するにはログインが必要です
            </p>
            <Button asChild size="sm">
              <Link href="/login">
                <LogIn className="h-4 w-4" />
                ログインする
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 回答一覧 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">
            回答 <span className="font-normal text-muted-foreground">{answers.length}件</span>
          </p>
          {bestAnswerId && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="h-3 w-3" />
              解決済み
            </span>
          )}
        </div>

        {canSelectBest && !bestAnswerId && answers.length > 0 && (
          <p className="text-xs text-muted-foreground">
            あなたの質問です。役立った回答に「ベストアンサーに選ぶ」を押してください。
          </p>
        )}

        {answers.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            まだ回答がありません。最初の回答を投稿してみましょう。
          </p>
        ) : (
          <div className="space-y-3">
            {sorted.map((answer) => (
              <div key={answer.id} className="space-y-3">
                <AnswerCard
                  answer={answer}
                  isBest={answer.id === bestAnswerId}
                  canSelectBest={canSelectBest}
                  likedIds={likedIds}
                  onLike={handleLike}
                  onSelectBest={handleSelectBest}
                  onReply={(id) => setReplyingTo(id)}
                  isReplyOpen={replyingTo === answer.id}
                />
                {replyingTo === answer.id && isLoggedIn && (
                  <>
                    <Separator className="ml-12" />
                    <div className="ml-12">
                      <AnswerComposer
                        userName={name}
                        placeholder="返信を入力してください"
                        submitLabel="返信を投稿"
                        onSubmit={(body) => handleReplySubmit(answer.id, body)}
                        compact
                      />
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
