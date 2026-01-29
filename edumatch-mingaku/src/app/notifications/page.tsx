import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, ArrowLeft } from "lucide-react";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
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
          <Bell className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">通知一覧</h1>
        </div>
        <p className="text-muted-foreground">
          お知らせや更新情報を確認できます
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">通知</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">通知はまだありません。</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
