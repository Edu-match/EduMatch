import { Suspense } from "react";
import { getEvents, getUpcomingEventsForCalendar } from "@/app/_actions/events";
import { getCurrentUserRole } from "@/app/_actions/user";
import EventsClient from "./events-client";

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

  const [{ events, total, perPage }, { events: calendarEvents, total: calendarTotal }] = await Promise.all([
    getEvents({ page, perPage: 20, search }),
    getUpcomingEventsForCalendar(search),
  ]);
  const totalPages = Math.ceil(total / perPage);
  const role = await getCurrentUserRole();
  const isAdmin = role === "ADMIN";

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
