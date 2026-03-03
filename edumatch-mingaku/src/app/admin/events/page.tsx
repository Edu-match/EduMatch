import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentUserRole } from "@/app/_actions/user";
import { getEventsForAdmin, deleteEventAction } from "@/app/_actions/events";
import { Plus, Pencil, ExternalLink, Trash2, Calendar, MapPin, Building2 } from "lucide-react";

export default async function AdminEventsPage() {
  const role = await getCurrentUserRole();
  if (role !== "ADMIN") {
    redirect("/dashboard");
  }

  const events = await getEventsForAdmin(200);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">セミナー・イベント管理</h1>
        <Button asChild>
          <Link href="/admin/events/new">
            <Plus className="h-4 w-4 mr-2" />
            新規追加
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">一覧（{events.length} 件）</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">イベントがまだありません。</p>
          ) : (
            <ul className="divide-y">
              {events.map((event) => {
                const isPast = event.event_date ? event.event_date < today : false;
                return (
                  <li key={event.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {event.event_date ? (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {event.event_date}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">日程未定</span>
                        )}
                        {isPast && (
                          <Badge variant="secondary" className="text-xs">終了</Badge>
                        )}
                        {event.venue && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {event.venue}
                          </span>
                        )}
                        {event.company && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            {event.company}
                          </span>
                        )}
                      </div>
                      <p className="font-medium truncate">{event.title}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {event.external_url && (
                        <a
                          href={event.external_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="外部リンク"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/events/${event.id}/edit`}>
                          <Pencil className="h-4 w-4 mr-1" />
                          編集
                        </Link>
                      </Button>
                      <form action={deleteEventAction} className="inline">
                        <input type="hidden" name="id" value={event.id} />
                        <Button
                          type="submit"
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          削除
                        </Button>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
