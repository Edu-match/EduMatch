import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Eye } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { getRecentViewHistory } from "@/app/_actions";

export const dynamic = "force-dynamic";

function formatViewedAt(viewedAt: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - viewedAt.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  if (diffSec < 60) return "ついさっき";
  if (diffMin < 60) return `${diffMin}分前`;
  if (diffHour < 24) return `${diffHour}時間前`;
  return viewedAt.toLocaleDateString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function HistoryPage() {
  const user = await requireAuth();
  const items = await getRecentViewHistory(user.id, 100);

  return (
    <div className="container py-8">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            ダッシュボードに戻る
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            閲覧履歴
          </CardTitle>
          <span className="text-sm text-muted-foreground">{items.length}件</span>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              まだ閲覧履歴はありません。記事やサービスを見るとここに表示されます。
            </p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={item.type === "service" ? `/services/${item.id}` : `/articles/${item.id}`}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="relative h-12 w-20 flex-shrink-0 bg-muted rounded overflow-hidden">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                        {item.type === "service" ? "S" : "A"}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {item.type === "service" ? "サービス" : "記事"}
                      </Badge>
                    </div>
                    <p className="font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatViewedAt(item.viewedAt)}
                    </p>
                  </div>
                  <Eye className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
