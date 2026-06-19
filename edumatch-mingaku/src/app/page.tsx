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
            {/* 議員会館チケット申込導線（スライダー上部） */}
            <Link
              href="/forum/kaikan"
              className="group flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 to-violet-500/10 px-4 py-3 transition-colors hover:border-primary/50 hover:from-primary/15 hover:to-violet-500/15"
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                  <Ticket className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold">議員会館イベント チケット申込</span>
                  <span className="block truncate text-[11px] text-muted-foreground">コンテンツを選んで申込・電子チケット（QR）を受け取る</span>
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground transition group-hover:opacity-90">申込へ →</span>
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
