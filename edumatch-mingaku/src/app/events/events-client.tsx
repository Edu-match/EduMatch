"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Calendar,
  MapPin,
  Building2,
  ExternalLink,
  CalendarDays,
  List,
  CalendarRange,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { SeminarEventData } from "@/app/_actions/events";
import { cn } from "@/lib/utils";

type ViewMode = "list" | "week" | "month";

type Props = {
  events: SeminarEventData[];
  calendarEvents: SeminarEventData[];
  calendarTotal: number;
  total: number;
  page: number;
  totalPages: number;
  perPage: number;
  search: string;
  isAdmin: boolean;
};

const WEEKDAY_HEADERS = ["日", "月", "火", "水", "木", "金", "土"] as const;

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

function formatShortDay(date: Date): string {
  return date.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", weekday: "short" });
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfSundayWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
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
  if (days === 0)
    return (
      <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">本日</span>
    );
  if (days === 1)
    return (
      <span className="text-xs font-semibold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded">明日</span>
    );
  if (days <= 7)
    return (
      <span className="text-xs font-semibold text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded">
        あと{days}日
      </span>
    );
  if (days <= 30)
    return (
      <span className="text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
        あと{days}日
      </span>
    );
  return null;
}

function groupEventsByDate(events: SeminarEventData[]): Map<string, SeminarEventData[]> {
  const m = new Map<string, SeminarEventData[]>();
  for (const e of events) {
    if (!e.event_date) continue;
    const list = m.get(e.event_date) ?? [];
    list.push(e);
    m.set(e.event_date, list);
  }
  return m;
}

function EventCalendarCellLink({ event }: { event: SeminarEventData }) {
  const inner = (
    <span className="block truncate text-xs font-medium text-primary hover:underline">{event.title}</span>
  );
  if (event.external_url) {
    return (
      <a
        href={event.external_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block min-w-0 rounded px-1 py-0.5 hover:bg-primary/5 -mx-1"
      >
        {inner}
      </a>
    );
  }
  return (
    <Link href={`/events/${event.id}`} className="block min-w-0 rounded px-1 py-0.5 hover:bg-primary/5 -mx-1">
      {inner}
    </Link>
  );
}

export default function EventsClient({
  events,
  calendarEvents,
  calendarTotal,
  total,
  page,
  totalPages,
  perPage,
  search,
  isAdmin,
}: Props) {
  const router = useRouter();
  const [inputValue, setInputValue] = useState(search);
  const [, startTransition] = useTransition();
  const [view, setView] = useState<ViewMode>("list");
  const [weekAnchor, setWeekAnchor] = useState(() => startOfSundayWeek(new Date()));
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));

  const eventsByDate = useMemo(() => groupEventsByDate(calendarEvents), [calendarEvents]);

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

  const weekEnd = addDays(weekAnchor, 6);
  const weekLabel = `${weekAnchor.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })} 〜 ${weekEnd.toLocaleDateString("ja-JP", { month: "long", day: "numeric" })}`;

  const monthYearLabel = monthCursor.toLocaleDateString("ja-JP", { year: "numeric", month: "long" });

  const monthGridDays: ({ date: Date; inMonth: boolean } | null)[] = useMemo(() => {
    const first = startOfMonth(monthCursor);
    const last = endOfMonth(monthCursor);
    const startPad = first.getDay();
    const daysInMonth = last.getDate();
    const cells: ({ date: Date; inMonth: boolean } | null)[] = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: new Date(monthCursor.getFullYear(), monthCursor.getMonth(), d), inMonth: true });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [monthCursor]);

  const calendarCapped = calendarEvents.length >= 500 && calendarTotal > 500;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b">
        <div className="container py-10">
          <div className="flex items-center gap-3 mb-3">
            <CalendarDays className="h-8 w-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold">セミナー・イベント情報</h1>
          </div>
          <p className="text-muted-foreground mb-1">教育関連のセミナー・イベント情報をお届けします。</p>
          <p className="text-sm text-muted-foreground">
            掲載されていないイベント情報は
            <Link href="/contact" className="text-primary hover:underline font-medium mx-1">
              お問い合わせフォーム
            </Link>
            からご連絡ください。
          </p>
          {isAdmin && (
            <div className="mt-4">
              <Button asChild size="sm" variant="outline">
                <Link href="/admin/events">セミナー・イベントを管理</Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="container py-8">
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

        <Tabs
          value={view}
          onValueChange={(v) => setView(v as ViewMode)}
          className="gap-4"
        >
          <TabsList className="grid w-full grid-cols-3 sm:w-fit sm:inline-flex h-auto sm:h-9 p-1">
            <TabsTrigger value="list" className="gap-1.5 py-2 sm:py-1">
              <List className="h-4 w-4" />
              一覧
            </TabsTrigger>
            <TabsTrigger value="week" className="gap-1.5 py-2 sm:py-1">
              <CalendarRange className="h-4 w-4" />
              週
            </TabsTrigger>
            <TabsTrigger value="month" className="gap-1.5 py-2 sm:py-1">
              <LayoutGrid className="h-4 w-4" />
              月
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-4 space-y-6">
            {events.length > 0 ? (
              <div className="space-y-3">
                {events.map((event) => (
                  <Card key={event.id} className="overflow-hidden hover:shadow-md transition-shadow border">
                    <CardContent className="p-0">
                      <div className="flex flex-col sm:flex-row">
                        <div className="sm:w-40 lg:w-48 shrink-0 bg-primary/5 border-b sm:border-b-0 sm:border-r flex flex-col items-center justify-center px-4 py-4 gap-1 text-center">
                          <Calendar className="h-5 w-5 text-primary/70 mb-1" />
                          <p className="text-sm font-semibold text-foreground leading-snug">
                            {formatEventDate(event.event_date)}
                          </p>
                          <DaysLabel dateStr={event.event_date} />
                        </div>
                        <div className="flex-1 min-w-0 p-4 sm:p-5 flex flex-col gap-3">
                          <div className="flex flex-wrap items-start gap-2">
                            <Badge className="bg-green-500 hover:bg-green-600 text-white text-xs shrink-0">
                              開催予定
                            </Badge>
                            <h3 className="text-base font-bold leading-snug min-w-0 break-words">{event.title}</h3>
                          </div>
                          {event.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                              {event.description}
                            </p>
                          )}
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
                                <Link href="/contact?subject=イベント問い合わせ">お問い合わせ</Link>
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
          </TabsContent>

          <TabsContent value="week" className="mt-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">{weekLabel}</p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="前の週"
                  onClick={() => setWeekAnchor((w) => addDays(w, -7))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => setWeekAnchor(startOfSundayWeek(new Date()))}>
                  今週
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="次の週"
                  onClick={() => setWeekAnchor((w) => addDays(w, 7))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {calendarEvents.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">該当するイベントはありません</div>
            ) : (
              <>
                <div className="hidden md:grid md:grid-cols-7 gap-2">
                  {WEEKDAY_HEADERS.map((label) => (
                    <div key={label} className="text-center text-xs font-semibold text-muted-foreground py-1">
                      {label}
                    </div>
                  ))}
                  {Array.from({ length: 7 }, (_, i) => {
                    const day = addDays(weekAnchor, i);
                    const ymd = toYmd(day);
                    const dayEvents = eventsByDate.get(ymd) ?? [];
                    const isToday = ymd === toYmd(new Date());
                    return (
                      <Card
                        key={ymd}
                        className={cn(
                          "min-h-[140px] border shadow-sm",
                          isToday && "ring-2 ring-primary/40 border-primary/30",
                        )}
                      >
                        <CardContent className="p-2 space-y-1.5">
                          <p className={cn("text-xs font-semibold", isToday ? "text-primary" : "text-foreground")}>
                            {formatShortDay(day)}
                          </p>
                          <div className="space-y-1">
                            {dayEvents.length === 0 ? (
                              <p className="text-[11px] text-muted-foreground">—</p>
                            ) : (
                              dayEvents.map((ev) => <EventCalendarCellLink key={ev.id} event={ev} />)
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                <div className="md:hidden space-y-3">
                  {Array.from({ length: 7 }, (_, i) => {
                    const day = addDays(weekAnchor, i);
                    const ymd = toYmd(day);
                    const dayEvents = eventsByDate.get(ymd) ?? [];
                    const isToday = ymd === toYmd(new Date());
                    return (
                      <Card
                        key={ymd}
                        className={cn("border", isToday && "ring-2 ring-primary/40 border-primary/30")}
                      >
                        <CardContent className="p-3 space-y-2">
                          <p className={cn("text-sm font-semibold", isToday ? "text-primary" : "text-foreground")}>
                            {formatShortDay(day)}
                          </p>
                          {dayEvents.length === 0 ? (
                            <p className="text-xs text-muted-foreground">予定なし</p>
                          ) : (
                            <ul className="space-y-1">
                              {dayEvents.map((ev) => (
                                <li key={ev.id}>
                                  <EventCalendarCellLink event={ev} />
                                </li>
                              ))}
                            </ul>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
            {calendarCapped && (
              <p className="text-xs text-muted-foreground">※ カレンダーは直近の開催予定 {calendarEvents.length} 件まで表示しています。</p>
            )}
          </TabsContent>

          <TabsContent value="month" className="mt-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-base font-semibold">{monthYearLabel}</p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="前の月"
                  onClick={() =>
                    setMonthCursor((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
                  }
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setMonthCursor(startOfMonth(new Date()))}
                >
                  今月
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="次の月"
                  onClick={() =>
                    setMonthCursor((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
                  }
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {calendarEvents.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">該当するイベントはありません</div>
            ) : (
              <div className="border rounded-lg overflow-hidden bg-card">
                <div className="grid grid-cols-7 border-b bg-muted/50">
                  {WEEKDAY_HEADERS.map((label) => (
                    <div
                      key={label}
                      className="text-center text-[11px] sm:text-xs font-semibold text-muted-foreground py-2 border-r last:border-r-0"
                    >
                      {label}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {monthGridDays.map((cell, idx) => {
                    if (!cell) {
                      return <div key={`empty-${idx}`} className="min-h-[72px] sm:min-h-[100px] border-b border-r bg-muted/20" />;
                    }
                    const ymd = toYmd(cell.date);
                    const dayEvents = eventsByDate.get(ymd) ?? [];
                    const isToday = ymd === toYmd(new Date());
                    return (
                      <div
                        key={ymd}
                        className={cn(
                          "min-h-[72px] sm:min-h-[100px] border-b border-r p-1 sm:p-1.5 flex flex-col gap-0.5",
                          isToday && "bg-primary/5",
                        )}
                      >
                        <span
                          className={cn(
                            "text-[11px] sm:text-xs font-semibold w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full",
                            isToday && "bg-primary text-primary-foreground",
                            !isToday && "text-foreground",
                          )}
                        >
                          {cell.date.getDate()}
                        </span>
                        <div className="flex-1 min-h-0 space-y-0.5 overflow-hidden">
                          {dayEvents.slice(0, 2).map((ev) => (
                            <EventCalendarCellLink key={ev.id} event={ev} />
                          ))}
                          {dayEvents.length > 2 && (
                            <p className="text-[10px] text-muted-foreground pl-0.5">+{dayEvents.length - 2}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {calendarCapped && (
              <p className="text-xs text-muted-foreground">※ カレンダーは直近の開催予定 {calendarEvents.length} 件まで表示しています。</p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
