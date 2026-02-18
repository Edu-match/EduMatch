import { unstable_noStore } from "next/cache";
import { getHomeSliderItems } from "@/app/_actions/home";
import { HeroSlider } from "@/components/home/hero-slider";
import { SiteUpdateSection } from "@/components/home/site-update-section";
import { VisualShowcaseSection } from "@/components/home/visual-showcase-section";
import { RightSidebar } from "@/components/home/right-sidebar";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  unstable_noStore();
  const sliderItems = await getHomeSliderItems(8);

  return (
    <div className="bg-muted/20">
      <div className="container py-8">
        {/* 1枚目: 記事・サービスの自動スライダー（全幅） */}
        <section className="mb-8">
          <HeroSlider items={sliderItems} />
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* メイン（中央） */}
          <main className="space-y-6 lg:col-span-8">
            {/* 運営からのお知らせ */}
            <section>
              <SiteUpdateSection />
            </section>

            {/* 画像中心の注目記事・サービス */}
            <section>
              <VisualShowcaseSection />
            </section>
          </main>

          {/* 右サイドバー */}
          <aside className="hidden lg:col-span-4 lg:block">
            <RightSidebar />
          </aside>
        </div>

        {/* タブレット・スマホ用: 右サイドバーのみ下に表示 */}
        <div className="lg:hidden mt-6">
          <RightSidebar />
        </div>
      </div>
    </div>
  );
}
