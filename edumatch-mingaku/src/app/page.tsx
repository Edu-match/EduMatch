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
      <div className="container py-8">
        {/* 左：スライダー＋トピックス / 右：ランキング（ヘッダー直下から固定） */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
          <main className="lg:col-span-8 order-1 space-y-8 min-w-0">
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
