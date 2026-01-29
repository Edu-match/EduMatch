import { unstable_noStore } from "next/cache";
import { HeroNews } from "@/components/home/hero-news";
import { TopicsSection } from "@/components/home/topics-section";
import { RightSidebar } from "@/components/home/right-sidebar";

export const dynamic = "force-dynamic";

export default function HomePage() {
  unstable_noStore();
  return (
    <div className="bg-muted/30">
      <div className="container py-6">
        {/* レイアウトの左メニューは共通表示（layout.tsx） */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* メイン（中央） */}
          <main className="lg:col-span-8 space-y-4">
            {/* トップニュース */}
            <section>
              <HeroNews />
            </section>

            {/* トピックス */}
            <section>
              <TopicsSection />
            </section>
          </main>

          {/* 右サイドバー */}
          <aside className="lg:col-span-4 hidden lg:block">
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
