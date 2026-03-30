import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { getInAppNotificationsForCurrentUser } from "@/app/_actions/in-app-notifications";
import { InAppNotificationReadLink } from "@/components/notifications/in-app-notification-read-link";
import { formatInAppNotificationTitle } from "@/lib/in-app-notification-constants";

type Props = {
  /** カードに表示する最大件数 */
  limit?: number;
};

export async function InAppNotificationsCard({ limit = 8 }: Props) {
  const rows = await getInAppNotificationsForCurrentUser(limit);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="h-5 w-5" />
          通知
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/notifications">すべて</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">通知はまだありません。</p>
          ) : (
            rows.map((n) => {
              const href = n.link?.trim() || "/notifications";
              return (
                <InAppNotificationReadLink
                  key={n.id}
                  href={href}
                  notificationId={n.id}
                  read={n.read}
                  className={`block p-3 rounded-lg transition-colors hover:opacity-90 ${
                    n.read ? "bg-muted/30" : "bg-primary/5 border border-primary/20"
                  }`}
                >
                  <p className={`text-sm ${n.read ? "" : "font-medium"}`}>
                    {formatInAppNotificationTitle(n.title)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {n.created_at.toLocaleDateString("ja-JP")}
                  </p>
                </InAppNotificationReadLink>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
