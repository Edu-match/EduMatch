import Link from "next/link";
import { Ticket } from "lucide-react";
import { unstable_noStore } from "next/cache";
import { getHomeSliderItems } from "@/app/_actions/home";
import { getCurrentUserRole } from "@/app/_actions/user";
import { HeroSlider } from "@/components/home/hero-slider";
import { RightRankingSidebar } from "@/components/home/right-ranking-sidebar";
import { TopicsSection } from "@/components/home/topics-section";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  unstable_noStore();
  const [sliderItems, role] = await Promise.all([
    getHomeSliderItems(12),
    getCurrentUserRole(),
  ]);
  const isAdmin = role === "ADMIN";

  return (
    <div className="bg-muted/20">
      <div className="container py-4 sm:py-6 lg:py-8">
        {/* 左：スライダー＋マップ＋トピックス / 右：ランキング */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
          <main className="lg:col-span-8 order-1 space-y-4 sm:space-y-6 lg:space-y-8 min-w-0">
            {/* 議員会館チケット申込導線（特設帯・スライダー上部） */}
            <Link
              href="/forum/kaikan"
              className="group flex items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3.5 text-white shadow-md shadow-orange-500/25 transition hover:to-amber-400 hover:shadow-lg"
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/20">
                  <Ticket className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold">教育AIサミット@衆議院第一会館 チケット申込はこちら！</span>
                  <span className="block truncate text-[11px] text-white/85">コンテンツを選んで申込・電子チケット（QR）を受け取る</span>
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-orange-600 transition group-hover:bg-white/90">申込へ →</span>
            </Link>

            {/* スライダー：運営お知らせ → ADMIN選択記事 */}
            <HeroSlider items={sliderItems} isAdmin={isAdmin} />
            <TopicsSection />
          </main>
          <aside className="lg:col-span-4 order-2 w-full">
            <RightRankingSidebar />
          </aside>
        </div>
      </div>
    </div>
  );
}
