import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Building2, ArrowLeft, ExternalLink } from "lucide-react";
import { getEventById } from "@/app/_actions/events";

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatEventDate(dateStr: string | null): string {
  if (!dateStr) return "日程未定";
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    });
  } catch {
    return dateStr;
  }
}

export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params;

  const event = await getEventById(id);
  if (!event) notFound();

  // 外部URLがある場合はリダイレクト（直接外部に飛ばす）
  if (event.external_url) {
    redirect(event.external_url);
  }

  const isUpcoming = event.event_date
    ? new Date(event.event_date) >= new Date()
    : false;

  return (
    <div className="container py-8 max-w-2xl">
      <Button variant="ghost" asChild className="mb-6 -ml-2">
        <Link href="/events" className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          セミナー・イベント一覧に戻る
        </Link>
      </Button>

      <Card>
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-wrap gap-2 mb-4">
            {isUpcoming ? (
              <Badge className="bg-green-500 hover:bg-green-600 text-white">開催予定</Badge>
            ) : event.event_date ? (
              <Badge variant="secondary">終了</Badge>
            ) : (
              <Badge variant="outline">日程未定</Badge>
            )}
          </div>

          <h1 className="text-2xl font-bold mb-6 leading-snug">{event.title}</h1>

          <div className="space-y-3 mb-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              {formatEventDate(event.event_date)}
            </div>
            {event.venue && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                {event.venue}
              </div>
            )}
            {event.company && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 flex-shrink-0" />
                {event.company}
              </div>
            )}
          </div>

          {event.description && (
            <p className="text-muted-foreground leading-relaxed mb-6 whitespace-pre-line">
              {event.description}
            </p>
          )}

          <div className="pt-4 border-t">
            <Button asChild>
              <Link href="/contact?subject=イベント問い合わせ" className="inline-flex items-center gap-2">
                お問い合わせで申し込む
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
