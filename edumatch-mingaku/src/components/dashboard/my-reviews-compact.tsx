"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTransition } from "react";
import { Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteReview, type MyReviewData } from "@/app/_actions/reviews";

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "fill-muted text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

export function MyReviewsCompact({ reviews }: { reviews: MyReviewData[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete(reviewId: string) {
    if (!confirm("この口コミを削除してもよろしいですか？")) return;
    startTransition(async () => {
      const result = await deleteReview(reviewId);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error ?? "削除に失敗しました");
      }
    });
  }

  if (reviews.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        まだ口コミを投稿していません。サービス詳細ページから口コミを投稿できます。
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.slice(0, 10).map((review) => (
        <div
          key={review.id}
          className="flex flex-col gap-2 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-start justify-between gap-2">
            <Link
              href={`/services/${review.service.id}`}
              className="font-medium text-sm text-primary hover:underline truncate flex-1 min-w-0"
            >
              {review.service.title}
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => handleDelete(review.id)}
              disabled={isPending}
              aria-label="口コミを削除"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {review.rating !== null && <StarDisplay rating={review.rating} />}
            <time>
              {new Intl.DateTimeFormat("ja-JP", {
                year: "numeric",
                month: "short",
                day: "numeric",
              }).format(new Date(review.created_at))}
            </time>
          </div>
          <p className="text-sm text-foreground/90 line-clamp-2">{review.body}</p>
        </div>
      ))}
      {reviews.length > 10 && (
        <p className="text-xs text-muted-foreground">
          ほか {reviews.length - 10} 件の口コミがあります
        </p>
      )}
    </div>
  );
}
