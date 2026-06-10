import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Building2, ArrowLeft, ExternalLink, Pencil } from "lucide-react";
import { getEventById } from "@/app/_actions/events";
import { getCurrentUserRole } from "@/app/_actions/user";
import { getTranslations, getLocale } from "next-intl/server";
import { translateText } from "@/lib/translate";
import type { Locale } from "@/i18n/config";

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatEventDate(dateStr: string | null, locale: string, tbd: string): string {
  if (!dateStr) return tbd;
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString(locale === "en" ? "en-US" : "ja-JP", {
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

  const [event, role] = await Promise.all([getEventById(id), getCurrentUserRole()]);
  if (!event) notFound();
  const isAdmin = role === "ADMIN";

  // 外部URLがある場合はリダイレクト（直接外部に飛ばす）
  if (event.external_url) {
    redirect(event.external_url);
  }

  const t = await getTranslations("events");
  const locale = (await getLocale()) as Locale;

  // DB 由来テキストを表示言語へ機械翻訳
  const [eventTitle, eventDescription, eventVenue, eventCompany] = await Promise.all([
    translateText(event.title, locale),
    translateText(event.description ?? "", locale),
    translateText(event.venue ?? "", locale),
    translateText(event.company ?? "", locale),
  ]);

  const isUpcoming = event.event_date
    ? new Date(event.event_date) >= new Date()
    : false;

  return (
    <div className="container py-8 max-w-2xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" asChild className="-ml-2">
          <Link href="/events" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t("backToList")}
          </Link>
        </Button>
        {isAdmin && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/events/${id}/edit`}>
              <Pencil className="h-4 w-4 mr-1" />
              {t("edit")}
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-wrap gap-2 mb-4">
            {isUpcoming ? (
              <Badge className="bg-green-500 hover:bg-green-600 text-white">{t("upcoming")}</Badge>
            ) : event.event_date ? (
              <Badge variant="secondary">{t("ended")}</Badge>
            ) : (
              <Badge variant="outline">{t("tbd")}</Badge>
            )}
          </div>

          <h1 className="text-2xl font-bold mb-6 leading-snug">{eventTitle}</h1>

          <div className="space-y-3 mb-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              {formatEventDate(event.event_date, locale, t("tbd"))}
            </div>
            {eventVenue && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                {eventVenue}
              </div>
            )}
            {eventCompany && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 flex-shrink-0" />
                {eventCompany}
              </div>
            )}
          </div>

          {eventDescription && (
            <p className="text-muted-foreground leading-relaxed mb-6 whitespace-pre-line">
              {eventDescription}
            </p>
          )}

          <div className="pt-4 border-t">
            <Button asChild>
              <Link href="/contact?subject=イベント問い合わせ" className="inline-flex items-center gap-2">
                {t("applyViaContact")}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
