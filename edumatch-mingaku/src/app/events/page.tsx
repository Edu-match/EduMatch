import { Suspense } from "react";
import { getEvents } from "@/app/_actions/events";
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

  const { events, total, perPage } = await getEvents({ page, perPage: 20, search });
  const totalPages = Math.ceil(total / perPage);

  return (
    <Suspense>
      <EventsClient
        events={events}
        total={total}
        page={page}
        totalPages={totalPages}
        perPage={perPage}
        search={search}
      />
    </Suspense>
  );
}
