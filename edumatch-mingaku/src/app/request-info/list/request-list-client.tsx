"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRequestList } from "@/components/request-list/request-list-context";
import { FileText, ArrowRight } from "lucide-react";
import { AddToRequestListButton } from "@/components/request-list/add-to-request-list-button";

export function RequestListClient() {
  const router = useRouter();
  const { items, count, isAuthenticated } = useRequestList();

  const handleBatchRequest = () => {
    const ids = items.map((i) => i.id).join(",");
    router.push(`/request-info?serviceIds=${encodeURIComponent(ids)}`);
  };

  if (count === 0) {
    return (
      <div className="container px-4 sm:px-6 py-8 sm:py-10 max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-12 sm:py-16 text-center px-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-5 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold mb-2">資料請求リストは空です</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto leading-relaxed">
              {isAuthenticated === false
                ? "ログインすると、サービスをリストに追加してまとめて資料請求できます。"
                : "サービス一覧や詳細ページから「後で資料請求に追加」でマークすると、ここに表示されます。"}
            </p>
            <Button asChild size="lg" className="min-h-11">
              <Link href="/services">サービスを探す</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container px-4 sm:px-6 py-5 sm:py-8 space-y-5 sm:space-y-6 max-w-3xl mx-auto pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 sm:h-7 sm:w-7 text-primary flex-shrink-0" />
            資料請求リスト
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            {count}件のサービスをまとめて資料請求できます
          </p>
        </div>
        <Button
          size="lg"
          onClick={handleBatchRequest}
          className="shadow-lg w-full sm:w-auto min-h-12 sm:min-h-10 text-base"
        >
          <FileText className="h-5 w-5 mr-2 flex-shrink-0" />
          まとめて資料請求する
          <ArrowRight className="h-4 w-4 ml-2 flex-shrink-0" />
        </Button>
      </div>

      <div className="grid gap-3 sm:gap-4">
        {items.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4">
              <Link
                href={`/services/${item.id}`}
                className="flex gap-3 min-w-0 flex-1 sm:flex-[1_1_0]"
              >
                <div className="relative w-20 h-14 sm:w-28 sm:h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  <Image
                    src={item.thumbnail || "https://placehold.co/200x120/e0f2fe/0369a1?text=Service"}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 80px, 112px"
                    unoptimized
                  />
                </div>
                <div className="min-w-0 flex-1 py-0.5">
                  {item.category && (
                    <p className="text-xs text-muted-foreground mb-0.5 truncate">
                      {item.category}
                    </p>
                  )}
                  <h3 className="font-semibold text-sm sm:text-base line-clamp-2 leading-snug">{item.title}</h3>
                </div>
              </Link>
              <div className="flex items-stretch gap-2 flex-shrink-0 sm:flex-row">
                <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-initial min-h-10">
                  <Link href={`/request-info?serviceId=${item.id}`}>
                    今すぐ請求
                  </Link>
                </Button>
                <AddToRequestListButton
                  item={item}
                  variant="button"
                  size="sm"
                  className="min-h-10 flex-1 sm:flex-initial"
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="bg-primary/5 border-primary/20 overflow-hidden">
        <CardContent className="py-4 sm:py-6 px-4 sm:px-6">
          <p className="text-sm text-muted-foreground mb-4">
            {isAuthenticated === true
              ? "同じ送付先でまとめて送信できます。各サービス提供者に通知が届きます。"
              : "ログインすると、同じ送付先でまとめて資料請求できます。"}
          </p>
          <Button
            size="lg"
            onClick={handleBatchRequest}
            className="w-full sm:w-auto min-h-12 sm:min-h-10 text-base"
          >
            <FileText className="h-5 w-5 mr-2" />
            まとめて資料請求する（{count}件）
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
