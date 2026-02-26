import Link from "next/link";
import Image from "next/image";
import { Crown } from "lucide-react";
import { getPopularServicesByEngagement } from "@/app/_actions/popularity";
import { serviceThumbnailPlaceholder } from "@/lib/utils";

const rankColors = [
  "bg-[#ef4444] text-white",
  "bg-[#f97316] text-white",
  "bg-[#f59e0b] text-white",
  "bg-muted text-foreground",
  "bg-muted text-foreground",
  "bg-muted text-foreground",
  "bg-muted text-foreground",
  "bg-muted text-foreground",
  "bg-muted text-foreground",
  "bg-muted text-foreground",
];

/** トップページ左側：上から下までランキングを表示 */
export async function LeftRankingSidebar() {
  const services = await getPopularServicesByEngagement(10);

  return (
    <aside className="border rounded-lg bg-card shrink-0">
      <div className="p-3 border-b flex items-center gap-2">
        <Crown className="h-4 w-4 text-[#f59e0b]" />
        <h3 className="text-sm font-bold">人気サービスランキング</h3>
      </div>
      <div className="p-3">
        {services.length > 0 ? (
          <ul className="space-y-2.5">
            {services.map((service, index) => (
              <li key={service.id} className="flex items-center gap-2.5 text-sm">
                <span
                  className={`flex-shrink-0 h-6 w-6 flex items-center justify-center rounded text-xs font-bold ${rankColors[index] ?? rankColors[4]}`}
                >
                  {index + 1}
                </span>
                <div className="relative w-12 flex-shrink-0 overflow-hidden rounded border bg-muted aspect-video">
                  <Image
                    src={service.thumbnail_url || serviceThumbnailPlaceholder(service.title, 120, 68)}
                    alt={service.title}
                    fill
                    className="object-contain"
                    sizes="48px"
                    unoptimized
                  />
                </div>
                <Link
                  href={`/services/${service.id}`}
                  className="flex-1 hover:text-[#1d4ed8] transition-colors line-clamp-2 min-w-0"
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
      <div className="border-t p-3 text-center">
        <Link href="/services" className="text-sm text-[#1d4ed8] hover:underline font-medium">
          もっと見る
        </Link>
      </div>
    </aside>
  );
}
