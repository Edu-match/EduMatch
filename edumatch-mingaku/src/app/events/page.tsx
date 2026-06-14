import { Suspense } from "react";
import { getLocale } from "next-intl/server";
import { getEvents, getUpcomingEventsForCalendar } from "@/app/_actions/events";
import { getCurrentUserRole } from "@/app/_actions/user";
import { translateBatch } from "@/lib/translate";
import type { Locale } from "@/i18n/config";
import type { SeminarEventData } from "@/app/_actions/events";
import EventsClient from "./events-client";

async function localizeEvents(
  events: SeminarEventData[],
  locale: Locale
): Promise<SeminarEventData[]> {
  if (locale !== "en" || events.length === 0) return events;
  const [titles, descriptions, venues, companies] = await Promise.all([
    translateBatch(events.map((e) => e.title), locale),
    translateBatch(events.map((e) => e.description ?? ""), locale),
    translateBatch(events.map((e) => e.venue ?? ""), locale),
    translateBatch(events.map((e) => e.company ?? ""), locale),
  ]);
  return events.map((e, i) => ({
    ...e,
    title: titles[i],
    description: e.description ? descriptions[i] : e.description,
    venue: e.venue ? venues[i] : e.venue,
    company: e.company ? companies[i] : e.company,
  }));
}

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const search = typeof sp.search === "string" ? sp.search : "";

  const [{ events: rawEvents, total, perPage }, { events: rawCalendarEvents, total: calendarTotal }] = await Promise.all([
    getEvents({ page, perPage: 20, search }),
    getUpcomingEventsForCalendar(search),
  ]);
  const totalPages = Math.ceil(total / perPage);
  const role = await getCurrentUserRole();
  const isAdmin = role === "ADMIN";
  const locale = (await getLocale()) as Locale;

  const [events, calendarEvents] = await Promise.all([
    localizeEvents(rawEvents, locale),
    localizeEvents(rawCalendarEvents, locale),
  ]);

  return (
    <Suspense>
      <EventsClient
        events={events}
        calendarEvents={calendarEvents}
        calendarTotal={calendarTotal}
        total={total}
        page={page}
        totalPages={totalPages}
        perPage={perPage}
        search={search}
        isAdmin={isAdmin}
      />
    </Suspense>
  );
}
