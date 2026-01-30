"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRequestList } from "@/components/request-list/request-list-context";
import { FileText, Trash2, ArrowRight } from "lucide-react";
import { AddToRequestListButton } from "@/components/request-list/add-to-request-list-button";

export function RequestListClient() {
  const router = useRouter();
  const { items, remove, count } = useRequestList();

  const handleBatchRequest = () => {
    const ids = items.map((i) => i.id).join(",");
    router.push(`/request-info?serviceIds=${encodeURIComponent(ids)}`);
  };

  if (count === 0) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-2">資料請求リストは空です</h2>
            <p className="text-muted-foreground mb-6">
              サービス一覧や詳細ページから「後で資料請求に追加」でマークすると、ここに表示されます。まとめて資料請求できます。
            </p>
            <Button asChild>
              <Link href="/services">サービスを探す</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6 sm:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-2 sm:px-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary" />
            資料請求リスト
          </h1>
          <p className="text-muted-foreground mt-1">
            {count}件のサービスをまとめて資料請求できます
          </p>
        </div>
        <Button size="lg" onClick={handleBatchRequest} className="shadow-lg">
          <FileText className="h-5 w-5 mr-2" />
          まとめて資料請求する
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      <div className="grid gap-4 px-2 sm:px-0">
        {items.map((item) => (
          <Card key={item.id} className="overflow-hidden max-w-full">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4">
              <Link
                href={`/services/${item.id}`}
                className="flex flex-1 gap-4 min-w-0"
              >
                <div className="relative w-24 h-16 sm:w-28 sm:h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
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
                  <h3 className="font-semibold line-clamp-2">{item.title}</h3>
                </div>
              </Link>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/request-info?serviceId=${item.id}`}>
                    今すぐ請求
                  </Link>
                </Button>
                <AddToRequestListButton
                  item={item}
                  variant="button"
                  size="sm"
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-6">
          <p className="text-sm text-muted-foreground mb-4">
            ログインすると、同じ送付先でまとめて資料請求できます。各サービス提供者に通知が届きます。
          </p>
          <Button size="lg" onClick={handleBatchRequest}>
            <FileText className="h-5 w-5 mr-2" />
            まとめて資料請求する（{count}件）
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
