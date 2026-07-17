import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Ticket,
  MessageSquare,
  Users,
  Award,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { unstable_noStore } from "next/cache";
import { getLatestPosts, getPopularPosts } from "@/app/_actions/posts";
import { getUpcomingEvents } from "@/app/_actions/events";
import { Reveal } from "@/components/home/reveal";
import { NewsTicker } from "@/components/home/news-ticker";
import { TopicsSection } from "@/components/home/topics-section";
import { SponsorSidebarCard } from "@/components/home/sponsor-sidebar-card";
import { ForumMapMode } from "@/components/interop/forum-map-mode";
import { getInteropSettings } from "@/lib/interop-settings.server";
import { fetchInteropInitialActivity } from "@/lib/interop-explorer.server";

export const dynamic = "force-dynamic";

function TopicsSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-4 h-6 w-32 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-[16/10] animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}

export default async function HomePage() {
  unstable_noStore();
  const [posts, popularPosts, events, settings, initialActivity] = await Promise.all([
    getLatestPosts(8).catch(() => []),
    getPopularPosts(5).catch(() => []),
    getUpcomingEvents(4).catch(() => []),
    getInteropSettings(),
    fetchInteropInitialActivity(),
  ]);

  return (
    <div className="bg-background">
      {/* ヘッドラインティッカー */}
      <NewsTicker
        items={posts.slice(0, 8).map((p) => ({ id: p.id, title: p.title, href: `/articles/${p.id}` }))}
      />

      {/* ============ 2カラム: メイン（ひろば→トピックス→ニュース） + 右サイドバー ============ */}
      <div className="container py-6 sm:py-8">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-7">

          {/* ── メインカラム ── */}
          <div className="min-w-0 space-y-6 lg:col-span-8 xl:col-span-9">

            {/* ひろば（コンパクトマップ）: ヒーロー */}
            <Reveal>
              <div className="overflow-hidden rounded-2xl border border-violet-200/60 bg-card shadow-sm shadow-violet-200/30">
                {/* ヘッダー */}
                <div className="flex items-center justify-between bg-gradient-to-r from-violet-500/25 via-purple-500/15 to-primary/15 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-white">
                      <MessageSquare className="h-4 w-4" />
                    </span>
                    <div>
                      <h2 className="text-sm font-bold">教育のひろば</h2>
                      <p className="text-[11px] text-muted-foreground">立場を越えて、教育を語ろう。</p>
                    </div>
                  </div>
                  <Link
                    href="/forum"
                    className="inline-flex items-center gap-1 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    全画面で開く <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                {/* マップ */}
                <div className="relative h-[340px] bg-[#e9e7fb] dark:bg-[#141032]">
                  <Suspense fallback={<div className="absolute inset-0 bg-[#e9e7fb] dark:bg-[#141032]" />}>
                    <ForumMapMode
                      themeMode={settings.themeMode}
                      guideText="ハブをタップして話題へ · トピックをタップしてひろばへ"
                      initialInteropActivity={initialActivity.interop}
                      initialForumActivity={initialActivity.forum}
                      showChat={false}
                      initialScale={1.2}
                      centerLabel={settings.centerLabel}
                      centerHubItems={settings.centerHubItems}
                      showLatestNews={settings.showLatestNews}
                      showSpeakerQa={settings.showSpeakerQa}
                      showOpinionBox={settings.showOpinionBox}
                    />
                  </Suspense>
                </div>
              </div>
            </Reveal>

            {/* トピックス: ひろば直下・タブ付きグリッド（記事 / ニュース / サービス / 動画） */}
            <Reveal variant="fade-in" delay={80}>
              <Suspense fallback={<TopicsSkeleton />}>
                <TopicsSection />
              </Suspense>
            </Reveal>

          </div>

          {/* ── 右サイドバー: スポンサー（スティッキー）+ ウィジェット ── */}
          <aside className="min-w-0 lg:col-span-4 xl:col-span-3">
            {/* デスクトップではヘッダー(4rem)+セクションナビ(2.75rem)の下に固定表示。モバイルは通常フロー */}
            <div className="flex flex-col gap-5">

              {/* スポンサー（広告） */}
              <Suspense fallback={null}>
                <SponsorSidebarCard />
              </Suspense>

              {/* 議員会館チケット */}
              <Reveal variant="fade-in" delay={120}>
                <Link
                  href="/forum/kaikan"
                  className="card-lift group flex items-center gap-3.5 rounded-2xl border border-violet-200/60 bg-gradient-to-r from-card to-violet-50/40 p-4"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                    <Ticket className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">教育AIサミット2026＠衆議院第一議員会館</span>
                    <span className="block text-xs text-muted-foreground">チケット受付中 → 電子チケット(QR)</span>
                  </span>
                  <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-1" />
                </Link>
              </Reveal>

              {/* 人気記事 */}
              {popularPosts.length > 0 && (
                <Reveal variant="fade-in" delay={160}>
                  <section className="rounded-2xl border border-violet-200/60 bg-gradient-to-br from-card to-violet-50/30 p-4">
                    <h2 className="mb-3 flex items-center gap-2 text-sm font-bold tracking-tight">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      人気の記事
                    </h2>
                    <ol className="space-y-2.5">
                      {popularPosts.slice(0, 4).map((p, i) => (
                        <li key={p.id}>
                          <Link href={`/articles/${p.id}`} className="group flex items-start gap-2.5">
                            <span className={`mt-0.5 w-5 shrink-0 text-center font-mono text-sm font-bold tabular-nums ${i < 3 ? "text-primary" : "text-muted-foreground/60"}`}>
                              {i + 1}
                            </span>
                            <span className="line-clamp-2 text-sm font-medium leading-snug">
                              <span className="link-underline">{p.title}</span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ol>
                  </section>
                </Reveal>
              )}

              {/* 近日のイベント */}
              <Reveal variant="fade-in" delay={200}>
                <section className="rounded-2xl border border-violet-200/60 bg-gradient-to-br from-card to-violet-50/30 p-4">
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-bold tracking-tight">
                    <Calendar className="h-4 w-4 text-primary" />
                    近日のイベント
                  </h2>
                  {events.length > 0 ? (
                    <ul className="divide-y divide-border/60">
                      {events.map((e) => (
                        <li key={e.id}>
                          <Link href="/events" className="group flex items-center gap-3 py-2.5">
                            <span className="shrink-0 rounded-lg bg-accent px-2 py-1 text-[11px] font-semibold text-accent-foreground">
                              {e.dateLabel}
                            </span>
                            <span className="line-clamp-1 text-sm font-medium">
                              <span className="link-underline">{e.title}</span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">開催予定のイベントはありません。</p>
                  )}
                </section>
              </Reveal>
            </div>
          </aside>
        </div>
      </div>

      {/* ============ サービスナビ（コンパクトストリップ） ============ */}
      <nav className="container pb-8" aria-label="サービスメニュー">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {[
            {
              href: "/forum",
              icon: MessageSquare,
              title: "教育のひろば",
              sub: "対話に参加する",
            },
            {
              href: "/matching",
              icon: Users,
              title: "人材マッチング",
              sub: "教育の名鑑を見る",
            },
            {
              href: "/ai-kentei",
              icon: Award,
              title: "AI検定",
              sub: "力試しに挑戦する",
            },
          ].map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="group flex items-center gap-3 rounded-xl border border-violet-200/50 bg-gradient-to-r from-card to-violet-50/30 px-4 py-3 transition-all hover:border-violet-300/60 hover:bg-violet-50/50 hover:shadow-sm hover:shadow-violet-200/30"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-500/15 to-primary/15 text-primary transition-transform duration-200 group-hover:scale-110">
                <f.icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{f.title}</span>
                <span className="block text-xs text-muted-foreground">{f.sub}</span>
              </span>
              <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
