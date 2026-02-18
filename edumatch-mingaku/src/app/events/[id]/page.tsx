import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Video,
  Building,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import { getEventById } from "@/lib/events-data";
import { eventTypes, formats } from "@/lib/events-data";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params;
  const eventId = parseInt(id, 10);
  if (Number.isNaN(eventId)) notFound();

  const event = getEventById(eventId);
  if (!event) notFound();

  const typeLabel = eventTypes.find((t) => t.value === event.type)?.label ?? event.type;
  const formatLabel = formats.find((f) => f.value === event.format)?.label ?? event.format;
  const FormatIcon = event.format === "offline" ? Building : Video;

  const dateFormatted = new Date(event.date + "T12:00:00").toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <div className="container py-8 max-w-3xl">
      <Button variant="ghost" asChild className="mb-6 -ml-2">
        <Link href="/events" className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          セミナー・イベント一覧に戻る
        </Link>
      </Button>

      <Card className="overflow-hidden">
        <div className="relative h-48 sm:h-64">
          <Image
            src={event.image}
            alt={event.title}
            fill
            className="object-cover"
            priority
            unoptimized
          />
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            {event.featured && (
              <Badge className="bg-amber-500 hover:bg-amber-600">注目</Badge>
            )}
            <Badge>{typeLabel}</Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <FormatIcon className="h-3 w-3" />
              {formatLabel}
            </Badge>
          </div>
        </div>
        <CardContent className="p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-4">{event.title}</h1>

          <div className="grid gap-3 mb-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              {dateFormatted} {event.time}
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              {event.location}
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 flex-shrink-0" />
              {event.registered}/{event.capacity}名
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 flex-shrink-0" />
              登壇: {event.speaker}
            </div>
          </div>

          <p className="text-muted-foreground leading-relaxed mb-6 whitespace-pre-line">
            {event.description}
          </p>

          <div className="flex flex-wrap gap-1 mb-6">
            {event.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t">
            <span className="font-semibold text-primary text-lg">{event.price}</span>
            {event.externalUrl ? (
              <Button asChild>
                <a
                  href={event.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  詳細・申込はこちら
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/contact?subject=イベント申込" className="inline-flex items-center gap-2">
                  お問い合わせで申し込む
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
