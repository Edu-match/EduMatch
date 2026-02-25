import Link from "next/link";
import { Crown, Calendar, ChevronRight } from "lucide-react";
import { getPopularServicesByEngagement } from "@/app/_actions/popularity";
import { getUpcomingEvents } from "@/app/_actions/events";

const rankColors = [
  "bg-[#ef4444] text-white",
  "bg-[#f97316] text-white",
  "bg-[#f59e0b] text-white",
  "bg-muted text-foreground",
  "bg-muted text-foreground",
];

/** トップページ右サイドバー：ランキング（上位5社）＋セミナー・イベント情報 */
export async function RightRankingSidebar() {
  const [services, events] = await Promise.all([
    getPopularServicesByEngagement(5),
    getUpcomingEvents(5),
  ]);

  return (
    <aside className="lg:sticky lg:top-20 flex flex-col gap-6 min-w-0 w-full">
      {/* 人気サービスランキング */}
      <div className="border rounded-xl bg-card shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b flex items-center gap-3 shrink-0">
          <Crown className="h-6 w-6 text-[#f59e0b] shrink-0" />
          <h3 className="text-lg font-bold truncate">人気サービスランキング</h3>
        </div>
        <div className="p-4">
          {services.length > 0 ? (
            <ul className="space-y-4">
              {services.map((service, index) => (
                <li key={service.id} className="flex items-center gap-3 text-base">
                  <span
                    className={`flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-md text-sm font-bold ${rankColors[index] ?? rankColors[4]}`}
                  >
                    {index + 1}
                  </span>
                  <div className="relative w-20 flex-shrink-0 overflow-hidden rounded-md border bg-muted aspect-video">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={service.thumbnail_url || "https://placehold.co/120x68/e0f2fe/0369a1?text=No"}
                      alt={service.title}
                      className="w-full h-full object-contain"
                      width={80}
                      height={45}
                    />
                  </div>
                  <Link
                    href={`/services/${service.id}`}
                    className="flex-1 hover:text-[#1d4ed8] transition-colors line-clamp-2 min-w-0 text-sm font-medium"
                  >
                    {service.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-muted-foreground py-4 text-sm">サービスがありません</p>
          )}
        </div>
        <div className="border-t p-4">
          <Link
            href="/services"
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-primary/5 hover:bg-primary/10 text-primary font-semibold text-sm transition-colors"
          >
            もっと見る
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* セミナー・イベント情報 */}
      <div className="border rounded-xl bg-card shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b flex items-center gap-3 shrink-0">
          <Calendar className="h-6 w-6 text-primary shrink-0" />
          <h3 className="text-lg font-bold truncate">セミナー・イベント情報</h3>
        </div>
        <div className="p-4">
          {events.length > 0 ? (
            <ul className="space-y-3">
              {events.map((event) => (
                <li key={event.id}>
                  <Link
                    href={`/events/${event.id}`}
                    className="block hover:text-[#1d4ed8] transition-colors"
                  >
                    <p className="text-xs text-muted-foreground mb-0.5">{event.dateLabel}</p>
                    <p className="text-sm font-medium line-clamp-2">{event.title}</p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-muted-foreground py-4 text-sm">イベント情報がありません</p>
          )}
        </div>
        <div className="border-t p-4">
          <Link
            href="/events"
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-primary/5 hover:bg-primary/10 text-primary font-semibold text-sm transition-colors"
          >
            もっと見る
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
