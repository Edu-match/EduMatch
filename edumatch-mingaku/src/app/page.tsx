import { Suspense } from "react";
import Link from "next/link";
import { unstable_noStore } from "next/cache";
import { ArrowRight } from "lucide-react";
import { getHomeSliderItems } from "@/app/_actions/home";
import { getCurrentUserRole } from "@/app/_actions/user";
import { HeroSlider } from "@/components/home/hero-slider";
import { RightRankingSidebar } from "@/components/home/right-ranking-sidebar";
import { TopicsSection } from "@/components/home/topics-section";
import { InteropExplorer } from "@/components/interop/interop-explorer";
import { getInteropSettings } from "@/lib/interop-settings.server";
import { fetchInteropInitialActivity } from "@/lib/interop-explorer.server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  unstable_noStore();
  const [sliderItems, role, settings, initialActivity] = await Promise.all([
    getHomeSliderItems(12),
    getCurrentUserRole(),
    getInteropSettings(),
    fetchInteropInitialActivity(),
  ]);
  const isAdmin = role === "ADMIN";

  return (
    <div className="bg-muted/20">
      <div className="container py-4 sm:py-6 lg:py-8">
        {/* 左：スライダー＋マップ＋トピックス / 右：ランキング */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
          <main className="lg:col-span-8 order-1 space-y-4 sm:space-y-6 lg:space-y-8 min-w-0">
            {/* スライダー：運営お知らせ → ADMIN選択記事 */}
            <HeroSlider items={sliderItems} isAdmin={isAdmin} />
            {/* 井戸端会議マップ（特設マップを埋め込み・AIチャット非表示） */}
            <div className="relative">
              <div className="relative h-[480px] w-full overflow-hidden rounded-2xl bg-[#070a1c]">
                <Suspense fallback={<div className="absolute inset-0 bg-[#070a1c]" />}>
                  <InteropExplorer
                    themeMode={settings.themeMode}
                    guideText="タップして話題の井戸端へ"
                    initialInteropActivity={initialActivity.interop}
                    initialForumActivity={initialActivity.forum}
                    showChat={false}
                  />
                </Suspense>
              </div>
              {/* 全画面の井戸端会議へ */}
              <Link
                href="/forum"
                className="absolute right-3 top-3 z-20 inline-flex items-center gap-1 rounded-full border border-white/25 bg-black/45 px-3 py-1.5 text-xs font-bold text-white/90 backdrop-blur transition-colors hover:bg-black/65 hover:text-white"
              >
                井戸端会議をひらく <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
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
