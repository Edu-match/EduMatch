import Link from "next/link";
import { Megaphone, Calendar, ChevronRight } from "lucide-react";
import { getPopularServicesByEngagement } from "@/app/_actions/popularity";
import { getUpcomingEvents } from "@/app/_actions/events";
import { RankingServiceImage } from "./ranking-service-image";
import { SponsorSidebarCard } from "./sponsor-sidebar-card";

/** トップページ右サイドバー：ランキング（上位5社）＋セミナー・イベント情報 */
export async function RightRankingSidebar() {
  const [services, events] = await Promise.all([
    getPopularServicesByEngagement(8),
    getUpcomingEvents(5),
  ]);

  return (
    <aside className="lg:sticky lg:top-20 flex flex-col gap-6 min-w-0 w-full">
      {/* スポンサーPR（登録があれば表示） */}
      <SponsorSidebarCard />

      {/* [PR]注目のサービス */}
      <div className="border rounded-xl bg-card shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b flex items-center gap-3 shrink-0">
          <Megaphone className="h-6 w-6 text-primary shrink-0" />
          <h3 className="text-lg font-bold truncate">[PR]注目のサービス</h3>
        </div>
        <div className="p-4">
          {services.length > 0 ? (
            <ul className="grid grid-cols-2 gap-3">
              {services.map((service) => (
                <li key={service.id} className="min-w-0">
                  <Link href={`/services/${service.id}`} className="block group">
                  <RankingServiceImage
                    src={service.thumbnail_url}
                    alt={service.title}
                  />
                  <p className="mt-1 text-xs font-medium line-clamp-2 group-hover:text-[#1d4ed8] transition-colors">
                    {service.title}
                  </p>
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
