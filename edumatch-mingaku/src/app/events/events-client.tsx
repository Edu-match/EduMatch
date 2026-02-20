"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import {
  Search,
  Calendar,
  MapPin,
  Building2,
  ExternalLink,
  CalendarDays,
} from "lucide-react";
import type { SeminarEventData } from "@/app/_actions/events";

type Props = {
  events: SeminarEventData[];
  total: number;
  page: number;
  totalPages: number;
  perPage: number;
  search: string;
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

/** 今日から何日後かを返す（当日=0） */
function daysFromToday(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00");
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function DaysLabel({ dateStr }: { dateStr: string | null }) {
  const days = daysFromToday(dateStr);
  if (days === null) return null;
  if (days === 0) return <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">本日</span>;
  if (days === 1) return <span className="text-xs font-semibold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded">明日</span>;
  if (days <= 7) return <span className="text-xs font-semibold text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded">あと{days}日</span>;
  if (days <= 30) return <span className="text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">あと{days}日</span>;
  return null;
}

export default function EventsClient({ events, total, page, totalPages, perPage, search }: Props) {
  const router = useRouter();
  const [inputValue, setInputValue] = useState(search);
  const [isPending, startTransition] = useTransition();

  function handleSearch(value: string) {
    setInputValue(value);
    startTransition(() => {
      const params = new URLSearchParams();
      if (value) params.set("search", value);
      params.set("page", "1");
      router.push(`/events?${params.toString()}`);
    });
  }

  function handlePageChange(p: number) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("page", String(p));
    router.push(`/events?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b">
        <div className="container py-10">
          <div className="flex items-center gap-3 mb-3">
            <CalendarDays className="h-8 w-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold">セミナー・イベント情報</h1>
          </div>
          <p className="text-muted-foreground mb-1">
            教育関連のセミナー・イベント情報をお届けします。
          </p>
          <p className="text-sm text-muted-foreground">
            掲載されていないイベント情報は
            <Link href="/contact" className="text-primary hover:underline font-medium mx-1">
              お問い合わせフォーム
            </Link>
            からご連絡ください。
          </p>
        </div>
      </div>

      <div className="container py-8">
        {/* 検索バー */}
        <Card className="mb-6 shadow-sm border-2">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="イベント名・主催者・会場で検索..."
                  value={inputValue}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
              <p className="text-sm text-muted-foreground whitespace-nowrap shrink-0">
                <span className="font-semibold text-foreground">{total}</span> 件表示中
              </p>
            </div>
          </CardContent>
        </Card>

        {/* イベント一覧 */}
        {events.length > 0 ? (
          <div className="space-y-3">
            {events.map((event) => (
              <Card
                key={event.id}
                className="overflow-hidden hover:shadow-md transition-shadow border"
              >
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row">
                    {/* 左帯：開催日 */}
                    <div className="sm:w-40 lg:w-48 shrink-0 bg-primary/5 border-b sm:border-b-0 sm:border-r flex flex-col items-center justify-center px-4 py-4 gap-1 text-center">
                      <Calendar className="h-5 w-5 text-primary/70 mb-1" />
                      <p className="text-sm font-semibold text-foreground leading-snug">
                        {formatEventDate(event.event_date)}
                      </p>
                      <DaysLabel dateStr={event.event_date} />
                    </div>

                    {/* 右：コンテンツ */}
                    <div className="flex-1 min-w-0 p-4 sm:p-5 flex flex-col gap-3">
                      {/* タイトル */}
                      <div className="flex flex-wrap items-start gap-2">
                        <Badge className="bg-green-500 hover:bg-green-600 text-white text-xs shrink-0">
                          開催予定
                        </Badge>
                        <h3 className="text-base font-bold leading-snug min-w-0 break-words">
                          {event.title}
                        </h3>
                      </div>

                      {/* 概要 */}
                      {event.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                          {event.description}
                        </p>
                      )}

                      {/* 場所・主催者 */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {event.venue && (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/60" />
                            <span className="truncate max-w-[220px]">{event.venue}</span>
                          </div>
                        )}
                        {event.company && (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Building2 className="h-3.5 w-3.5 shrink-0 text-primary/60" />
                            <span className="truncate max-w-[220px]">{event.company}</span>
                          </div>
                        )}
                      </div>

                      {/* 申し込みボタン */}
                      <div className="flex justify-end pt-1">
                        {event.external_url ? (
                          <Button asChild size="sm" className="shrink-0">
                            <a
                              href={event.external_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5"
                            >
                              詳細を見る・申し込み
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        ) : (
                          <Button asChild size="sm" variant="outline" className="shrink-0">
                            <Link href="/contact?subject=イベント問い合わせ">
                              お問い合わせ
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <CalendarDays className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">
              {search ? "条件に一致するイベントが見つかりませんでした" : "現在、開催予定のイベントはありません"}
            </p>
          </div>
        )}

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          totalItems={total}
          pageSize={perPage}
        />
      </div>
    </div>
  );
}
