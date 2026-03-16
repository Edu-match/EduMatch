import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, ArrowLeft } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { getNotifications } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  await requireAuth();
  const notifications = await getNotifications();

  return (
    <div className="container py-8 max-w-2xl">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            マイページに戻る
          </Link>
        </Button>
      </div>

      <header className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6" />
          通知
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          お知らせや承認申請などを確認できます
        </p>
      </header>

      <Card>
        <CardContent className="p-0">
          {notifications.length === 0 ? (
            <div className="text-center py-16">
              <Bell className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">通知はまだありません</p>
              <p className="text-sm text-muted-foreground mt-1">
                承認申請やお知らせがあるとここに表示されます
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {notifications.map((n: { id: string; category?: string; title: string; body?: string; href?: string }) => (
                <li key={n.id}>
                  <Link
                    href={n.href ?? "#"}
                    className="block px-4 py-4 hover:bg-muted/50 transition-colors"
                  >
                    {n.category && (
                      <p className="text-xs font-medium text-primary mb-0.5">【{n.category}】</p>
                    )}
                    <p className="font-medium">{n.title}</p>
                    {n.body && (
                      <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
