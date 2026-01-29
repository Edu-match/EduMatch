import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bookmark, ArrowLeft } from "lucide-react";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function KeepListPage() {
  await requireAuth();

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

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Bookmark className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">キープリスト</h1>
        </div>
        <p className="text-muted-foreground">
          気になるサービスや記事を保存して管理
        </p>
      </div>

      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">
              キープした記事・サービスはまだありません。
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              記事やサービス詳細ページからキープすると、ここに一覧表示されます。（準備中）
            </p>
            <div className="flex gap-2 justify-center flex-wrap">
              <Button asChild>
                <Link href="/articles">記事を探す</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/services">サービスを探す</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
