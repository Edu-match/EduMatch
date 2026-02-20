import Link from "next/link";
import Image from "next/image";
import { Crown } from "lucide-react";
import { getPopularServicesByEngagement } from "@/app/_actions/popularity";

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

/** トップページ右サイドバー：上から下までランキングを表示 */
export async function RightRankingSidebar() {
  const services = await getPopularServicesByEngagement(10);

  return (
    <aside className="sticky top-16 flex flex-col border rounded-xl bg-card shadow-sm overflow-hidden"
      style={{ height: "calc(100vh - 4rem)" }}>
      <div className="p-4 border-b flex items-center gap-3 shrink-0">
        <Crown className="h-6 w-6 text-[#f59e0b]" />
        <h3 className="text-lg font-bold">人気サービスランキング</h3>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
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
                  <Image
                    src={service.thumbnail_url || "https://placehold.co/120x68/e0f2fe/0369a1?text=No"}
                    alt={service.title}
                    fill
                    className="object-contain"
                    sizes="80px"
                    unoptimized
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
          <p className="text-center text-muted-foreground py-8 text-base">サービスがありません</p>
        )}
      </div>
      <div className="border-t p-4 text-center">
        <Link href="/services" className="text-base text-[#1d4ed8] hover:underline font-semibold">
          もっと見る
        </Link>
      </div>
    </aside>
  );
}
