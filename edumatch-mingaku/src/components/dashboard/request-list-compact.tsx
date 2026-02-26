"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useRequestList } from "@/components/request-list/request-list-context";
import { FileText, ArrowRight } from "lucide-react";
import { AddToRequestListButton } from "@/components/request-list/add-to-request-list-button";
import { serviceThumbnailPlaceholder } from "@/lib/utils";

const DEFAULT_MAX_BATCH = 5;

type Props = {
  /** マイページから一斉に資料請求できる最大件数（未指定時は5件） */
  maxBatchRequest?: number;
};

export function RequestListCompact({ maxBatchRequest = DEFAULT_MAX_BATCH }: Props) {
  const router = useRouter();
  const { items, count } = useRequestList();
  const batchIds = items.slice(0, maxBatchRequest).map((i) => i.id);
  const batchCount = batchIds.length;

  const handleBatchRequest = () => {
    if (batchCount === 0) return;
    router.push(`/request-info?serviceIds=${encodeURIComponent(batchIds.join(","))}`);
  };

  if (count === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground py-4">
          サービス一覧や詳細ページから「お気に入りに追加」すると、ここに表示されます。最大{maxBatchRequest}件まで一斉に資料請求できます。
        </p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/services">
            サービス一覧を見る
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.slice(0, maxBatchRequest).map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
        >
          <Link
            href={`/services/${item.id}`}
            className="flex flex-1 gap-3 min-w-0"
          >
            <div className="relative w-16 flex-shrink-0 overflow-hidden rounded bg-muted aspect-video">
              <Image
                src={item.thumbnail || serviceThumbnailPlaceholder(item.title, 200, 120)}
                alt={item.title}
                fill
                className="object-contain"
                unoptimized
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground mb-0.5">
                {item.category}
              </p>
              <p className="font-medium text-sm line-clamp-1">{item.title}</p>
            </div>
          </Link>
          <AddToRequestListButton
            item={item}
            variant="icon"
            className="flex-shrink-0"
          />
        </div>
      ))}
      {count > maxBatchRequest && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-2">
            他 {count - maxBatchRequest} 件のお気に入りがあります（一斉資料請求は最大{maxBatchRequest}件まで）
          </p>
        </div>
      )}
      <Button
        size="sm"
        onClick={handleBatchRequest}
        className="w-full mt-2"
      >
        <FileText className="h-4 w-4 mr-2" />
        一斉に資料請求する（最大{batchCount}件）
      </Button>
    </div>
  );
}
