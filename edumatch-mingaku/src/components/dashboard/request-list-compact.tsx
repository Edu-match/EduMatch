"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useRequestList } from "@/components/request-list/request-list-context";
import { FileText, ArrowRight } from "lucide-react";
import { AddToRequestListButton } from "@/components/request-list/add-to-request-list-button";
import { Badge } from "@/components/ui/badge";

export function RequestListCompact() {
  const router = useRouter();
  const { items, count } = useRequestList();

  const handleBatchRequest = () => {
    const ids = items.map((i) => i.id).join(",");
    router.push(`/request-info?serviceIds=${encodeURIComponent(ids)}`);
  };

  if (count === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground py-4">
          サービス一覧や詳細ページから「後で資料請求に追加」でマークすると、ここに表示されます。まとめて資料請求できます。
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
      {items.slice(0, 5).map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
        >
          <Link
            href={`/services/${item.id}`}
            className="flex flex-1 gap-3 min-w-0"
          >
            <div className="relative w-16 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
              <Image
                src={item.thumbnail || "https://placehold.co/200x120/e0f2fe/0369a1?text=Service"}
                alt={item.title}
                fill
                className="object-cover"
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
      {count > 5 && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-2">
            他 {count - 5} 件のサービスがリストにあります
          </p>
        </div>
      )}
      <Button
        size="sm"
        onClick={handleBatchRequest}
        className="w-full mt-2"
      >
        <FileText className="h-4 w-4 mr-2" />
        まとめて資料請求する ({count}件)
      </Button>
    </div>
  );
}
