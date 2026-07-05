"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Sparkles, Bot, CornerDownRight, Send, MessageCircle, Loader2 } from "lucide-react";
import {
  createArticleReview,
  createArticleReviewReply,
  AI_REVIEW_ROLE,
  AI_PERSONA_REVIEW_ROLE,
  type ArticleReview,
} from "@/app/_actions/article-reviews";

function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" }).format(date);
}

/** 立場・AI種別のバッジ。AIペルソナは紫、AIは灰、一般の立場は淡色。 */
function RoleBadge({ role }: { role: string | null }) {
  if (!role) return null;
  if (role === AI_PERSONA_REVIEW_ROLE) {
    return (
      <Badge className="gap-1 bg-violet-100 text-violet-700 hover:bg-violet-100">
        <Sparkles className="h-3 w-3" /> {role}
      </Badge>
    );
  }
  if (role === AI_REVIEW_ROLE) {
    return (
      <Badge className="gap-1 bg-slate-200 text-slate-700 hover:bg-slate-200">
        <Bot className="h-3 w-3" /> {role}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="font-normal">
      {role}
    </Badge>
  );
}

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return null;
  return (
    <span className="inline-flex" aria-label={`評価 ${rating}／5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-4 w-4 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </span>
  );
}

export function ArticleReviews({
  postId,
  initialReviews,
  isLoggedIn,
}: {
  postId: string;
  initialReviews: ArticleReview[];
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [reviews, setReviews] = useState<ArticleReview[]>(initialReviews);
  useEffect(() => setReviews(initialReviews), [initialReviews]);

  const [body, setBody] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null);
  const [replyOpenId, setReplyOpenId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  function submitReview() {
    setError(null);
    startTransition(async () => {
      const res = await createArticleReview(postId, { rating, body });
      if (!res.success) {
        setError(res.error ?? "投稿に失敗しました");
        return;
      }
      setBody("");
      setRating(null);
      router.refresh();
    });
  }

  function submitReply(parentId: string) {
    setError(null);
    startTransition(async () => {
      const res = await createArticleReviewReply(parentId, replyText);
      if (!res.success) {
        setError(res.error ?? "返信に失敗しました");
        return;
      }
      setReplyText("");
      setReplyOpenId(null);
      router.refresh();
    });
  }

  async function triggerAiReply(reviewId: string) {
    setError(null);
    setAiLoadingId(reviewId);
    try {
      const res = await fetch(`/api/articles/${postId}/reviews/${reviewId}/ai-reply`, { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "AI返信の生成に失敗しました");
        return;
      }
      router.refresh();
    } catch {
      setError("AI返信の生成に失敗しました");
    } finally {
      setAiLoadingId(null);
    }
  }

  const hasAiReply = (r: ArticleReview) => r.replies.some((rp) => rp.is_ai);

  return (
    <section className="mt-10" aria-labelledby="reviews-heading">
      <h2 id="reviews-heading" className="mb-4 flex items-center gap-2 text-xl font-bold">
        <MessageCircle className="h-5 w-5 text-primary" />
        口コミ・対話
        <span className="text-sm font-normal text-muted-foreground">（{reviews.length}件）</span>
      </h2>

      {/* 投稿フォーム */}
      {isLoggedIn ? (
        <div className="mb-6 rounded-lg border bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">評価（任意）:</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(rating === n ? null : n)}
                aria-label={`${n}つ星`}
                className="transition-transform hover:scale-110"
              >
                <Star className={`h-5 w-5 ${rating && n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
              </button>
            ))}
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="この記事への感想・現場での気づき・質問など（10文字以上）"
            className="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
          <div className="mt-2 flex justify-end">
            <Button onClick={submitReview} disabled={pending || body.trim().length < 10} size="sm">
              {pending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
              口コミを投稿
            </Button>
          </div>
        </div>
      ) : (
        <div className="mb-6 rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
          口コミの投稿・返信にはログインが必要です。
        </div>
      )}

      {/* 一覧 */}
      {reviews.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          まだ口コミはありません。最初の一言をどうぞ。
        </p>
      ) : (
        <ul className="space-y-4">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{r.author_name}</span>
                <RoleBadge role={r.author_role} />
                <Stars rating={r.rating} />
                <span className="ml-auto text-xs text-muted-foreground">{formatDate(r.created_at)}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{r.body}</p>

              {/* 返信スレッド */}
              {r.replies.length > 0 && (
                <ul className="mt-3 space-y-3 border-l-2 border-muted pl-4">
                  {r.replies.map((rp) => (
                    <li key={rp.id} className={rp.is_ai ? "rounded-md bg-violet-50/60 p-2" : ""}>
                      <div className="flex flex-wrap items-center gap-2">
                        <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">{rp.author_name}</span>
                        <RoleBadge role={rp.author_role} />
                        <span className="ml-auto text-xs text-muted-foreground">{formatDate(rp.created_at)}</span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap pl-5 text-sm leading-relaxed">{rp.body}</p>
                    </li>
                  ))}
                </ul>
              )}

              {/* アクション */}
              {isLoggedIn && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReplyOpenId(replyOpenId === r.id ? null : r.id)}
                  >
                    <CornerDownRight className="mr-1 h-4 w-4" /> 返信
                  </Button>
                  {!hasAiReply(r) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => triggerAiReply(r.id)}
                      disabled={aiLoadingId === r.id}
                      className="text-violet-700"
                    >
                      {aiLoadingId === r.id ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="mr-1 h-4 w-4" />
                      )}
                      AIに返信してもらう
                    </Button>
                  )}
                </div>
              )}

              {/* 返信フォーム */}
              {replyOpenId === r.id && (
                <div className="mt-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={2}
                    maxLength={2000}
                    placeholder="返信を入力..."
                    className="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <div className="mt-1 flex justify-end">
                    <Button onClick={() => submitReply(r.id)} disabled={pending || replyText.trim().length < 1} size="sm">
                      {pending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
                      返信する
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
