"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createReview, type ReviewData } from "@/app/_actions/reviews";

// ─────────────────────────────────────────────
// 星レーティング表示ユーティリティ
// ─────────────────────────────────────────────
function StarDisplay({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "h-5 w-5" : "h-4 w-4";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${cls} ${
            i <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "fill-muted text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// 星レーティング選択コンポーネント
// ─────────────────────────────────────────────
function StarPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const display = hovered ?? value ?? 0;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(value === i ? null : i)}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
          className="focus:outline-none"
          aria-label={`${i}点`}
        >
          <Star
            className={`h-7 w-7 transition-colors ${
              i <= display
                ? "fill-yellow-400 text-yellow-400"
                : "fill-muted text-muted-foreground/30 hover:fill-yellow-200 hover:text-yellow-300"
            }`}
          />
        </button>
      ))}
      {value !== null && (
        <span className="ml-2 text-sm text-muted-foreground">
          {value} / 5
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// 口コミ投稿フォーム（ログインユーザー用）
// ─────────────────────────────────────────────
function ReviewForm({ serviceId }: { serviceId: string }) {
  const [isPending, startTransition] = useTransition();
  const [rating, setRating] = useState<number | null>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createReview(serviceId, { rating, body });
      if (result.success) {
        setSubmitted(true);
        setRating(null);
        setBody("");
      } else {
        setError(result.error ?? "エラーが発生しました");
      }
    });
  }

  if (submitted) {
    return (
      <div className="rounded-lg border bg-green-50 p-4 text-green-800 text-sm font-medium">
        口コミを投稿しました。ありがとうございます！
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label>評価（任意）</Label>
        <StarPicker value={rating} onChange={setRating} />
        <p className="text-xs text-muted-foreground">
          ★をクリックして評価を選択できます（再クリックで解除）
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="review_body">
          口コミ内容 <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="review_body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="このサービスの使用感・メリット・デメリットなどをご記入ください（10文字以上）"
          rows={5}
          maxLength={2000}
          required
        />
        <p className="text-xs text-muted-foreground text-right">
          {body.length} / 2000
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
        {isPending ? "投稿中..." : "口コミを投稿する"}
      </Button>
    </form>
  );
}

// ─────────────────────────────────────────────
// 口コミ1件カード
// ─────────────────────────────────────────────
function ReviewCard({ review }: { review: ReviewData }) {
  const date = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(review.created_at));

  return (
    <div className="border rounded-xl p-4 space-y-2 bg-card hover:bg-muted/30 transition-colors">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
            {review.author_name.charAt(0)}
          </div>
          <span className="font-semibold text-sm">{review.author_name}</span>
        </div>
        <div className="flex items-center gap-3">
          {review.rating !== null && (
            <StarDisplay rating={review.rating} />
          )}
          <time className="text-xs text-muted-foreground">{date}</time>
        </div>
      </div>
      <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90 pt-1">
        {review.body}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────
// メインの ReviewSection（サービス詳細ページに埋め込む）
// ─────────────────────────────────────────────
export function ReviewSection({
  serviceId,
  initialReviews,
  isLoggedIn,
}: {
  serviceId: string;
  initialReviews: ReviewData[];
  isLoggedIn: boolean;
}) {
  const avgRating =
    initialReviews.filter((r) => r.rating !== null).length > 0
      ? initialReviews
          .filter((r) => r.rating !== null)
          .reduce((sum, r) => sum + (r.rating ?? 0), 0) /
        initialReviews.filter((r) => r.rating !== null).length
      : null;

  const ratedCount = initialReviews.filter((r) => r.rating !== null).length;

  return (
    <div className="space-y-6">
      {/* 投稿フォーム（先頭） */}
      <Card className="border-2 border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500" />
            口コミを投稿する
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            このサービスを実際に使用した方のご意見をお待ちしています
          </p>
        </CardHeader>
        <CardContent className="bg-background/70 rounded-b-lg border-t border-primary/20 pt-5">
          {isLoggedIn ? (
            <ReviewForm serviceId={serviceId} />
          ) : (
            <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                口コミを投稿するにはログインが必要です。
              </p>
              <Button asChild>
                <Link href="/auth/login">ログインする</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* サマリー */}
      {initialReviews.length > 0 && (
        <div className="flex items-center gap-6 p-4 bg-muted/40 rounded-xl border">
          <div className="text-center">
            <div className="text-4xl font-bold text-foreground">
              {initialReviews.length}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">口コミ数</div>
          </div>
          {avgRating !== null && (
            <>
              <div className="w-px h-10 bg-border" />
              <div className="flex flex-col items-start gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-yellow-500">
                    {avgRating.toFixed(1)}
                  </span>
                  <StarDisplay rating={Math.round(avgRating)} size="lg" />
                </div>
                <div className="text-xs text-muted-foreground">
                  {ratedCount} 件の評価の平均
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* 口コミ一覧 */}
      {initialReviews.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          まだ口コミがありません。最初の口コミを投稿してみましょう！
        </p>
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">
            口コミ一覧 （{initialReviews.length} 件）
          </h3>
          {initialReviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </div>
  );
}
