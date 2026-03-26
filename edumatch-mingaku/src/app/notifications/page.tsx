import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, ArrowLeft } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import {
  getInAppNotificationsForCurrentUser,
  markInAppNotificationReadFromForm,
} from "@/app/_actions/in-app-notifications";
import { InAppNotificationLink } from "@/components/notifications/in-app-notification-link";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  await requireAuth();
  const items = await getInAppNotificationsForCurrentUser(100);

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
        <div className="flex items-center gap-2 mb-2">
          <Bell className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">通知一覧</h1>
        </div>
        <p className="text-muted-foreground">
          運営からのお知らせなどを確認できます（通知ターミナル）
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">通知</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">通知はまだありません。</p>
            </div>
          ) : (
            <ul className="space-y-3 list-none p-0 m-0">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={`flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border p-4 ${
                    n.read ? "bg-muted/20" : "bg-primary/5 border-primary/20"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <InAppNotificationLink
                      href={n.link ?? "#"}
                      className={`text-sm hover:underline ${n.read ? "text-foreground" : "font-medium text-foreground"}`}
                    >
                      {n.title}
                    </InAppNotificationLink>
                    <p className="text-xs text-muted-foreground mt-1">
                      {n.created_at.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
                    </p>
                  </div>
                  {!n.read && (
                    <form action={markInAppNotificationReadFromForm}>
                      <input type="hidden" name="id" value={n.id} />
                      <Button type="submit" variant="secondary" size="sm">
                        既読にする
                      </Button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
