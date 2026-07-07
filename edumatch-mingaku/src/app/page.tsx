import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Ticket,
  MessageSquare,
  Users,
  Award,
  Calendar,
  Newspaper,
  Sparkles,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import { unstable_noStore } from "next/cache";
import { getPopularServices } from "@/app/_actions/services";
import { getLatestPosts, getPopularPosts } from "@/app/_actions/posts";
import { getUpcomingEvents } from "@/app/_actions/events";
import { Reveal } from "@/components/home/reveal";
import { NewsTicker } from "@/components/home/news-ticker";
import { FeaturedSlider, type FeaturedItem } from "@/components/home/featured-slider";
import { ForumMapMode } from "@/components/interop/forum-map-mode";
import { getInteropSettings } from "@/lib/interop-settings.server";
import { fetchInteropInitialActivity } from "@/lib/interop-explorer.server";

export const dynamic = "force-dynamic";

function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("ja-JP", { month: "long", day: "numeric" }).format(date);
}

export default async function HomePage() {
  unstable_noStore();
  const [posts, popularPosts, services, events, settings, initialActivity] = await Promise.all([
    getLatestPosts(9).catch(() => []),
    getPopularPosts(5).catch(() => []),
    getPopularServices(6).catch(() => []),
    getUpcomingEvents(4).catch(() => []),
    getInteropSettings(),
    fetchInteropInitialActivity(),
  ]);

  const sliderItems: FeaturedItem[] = posts.slice(0, 5).map((p) => ({
    id: p.id,
    href: `/articles/${p.id}`,
    title: p.title,
    category: p.category,
    summary: p.summary ?? null,
    dateLabel: formatDate(p.created_at),
    thumbnailUrl: p.thumbnail_url ?? null,
  }));
  const latestGrid = posts.slice(5, 9);

  return (
    <div className="bg-white">
      {/* ヘッドラインティッカー */}
      <NewsTicker
        items={posts.slice(0, 8).map((p) => ({ id: p.id, title: p.title, href: `/articles/${p.id}` }))}
      />

      {/* ============ ひろば（フォーラムマップ埋め込み） ============ */}
      <section className="relative h-[min(70vh,600px)] w-full overflow-hidden bg-[#e3f2fd] text-foreground dark:bg-[#0c1a3a] dark:text-white">
        <Suspense fallback={<div className="absolute inset-0 bg-[#e3f2fd] dark:bg-[#0c1a3a]" />}>
          <ForumMapMode
            themeMode={settings.themeMode}
            guideText="中央のハブをタップして話題へ · 周囲の◎トピックをタップしてひろばへ"
            initialInteropActivity={initialActivity.interop}
            initialForumActivity={initialActivity.forum}
            showChat={false}
            initialScale={1.35}
            centerLabel={settings.centerLabel}
            centerHubItems={settings.centerHubItems}
            showLatestNews={settings.showLatestNews}
            showSpeakerQa={settings.showSpeakerQa}
            showOpinionBox={settings.showOpinionBox}
          />
        </Suspense>
      </section>

      <div className="container py-8 sm:py-10">
        {/* ============ ニュース＋サイドバー ============ */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
          {/* メイン（ニュース） */}
          <main className="min-w-0 lg:col-span-8">
            <Reveal>
              <div className="mb-5 flex items-center justify-between">
                <h2 className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
                  <span className="h-5 w-1 rounded-full bg-primary" aria-hidden />
                  ニュース
                </h2>
                <Link
                  href="/articles"
                  className="link-underline inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  記事一覧 <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Reveal>

            {sliderItems.length > 0 && (
              <Reveal variant="scale-up" delay={80}>
                <FeaturedSlider items={sliderItems} />
              </Reveal>
            )}

            {/* 最新ニュースグリッド */}
            {latestGrid.length > 0 && (
              <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-4">
                {latestGrid.map((p, i) => (
                  <Reveal key={p.id} delay={i * 60}>
                    <Link href={`/articles/${p.id}`} className="group block">
                      <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-muted">
                        {p.thumbnail_url ? (
                          <Image
                            src={p.thumbnail_url}
                            alt={p.title}
                            fill
                            unoptimized
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-muted-foreground/40">
                            <Newspaper className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      <p className="mt-2.5 text-[11px] text-muted-foreground">
                        {p.category} ・ {formatDate(p.created_at)}
                      </p>
                      <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug">
                        <span className="link-underline">{p.title}</span>
                      </h3>
                    </Link>
                  </Reveal>
                ))}
              </div>
            )}
          </main>

          {/* ============ サイドバー ============ */}
          <aside className="min-w-0 space-y-8 lg:col-span-4">
            {/* 議員会館チケット */}
            <Reveal variant="fade-in">
              <Link
                href="/forum/kaikan"
                className="card-lift group flex items-center gap-3.5 rounded-2xl border border-primary/25 bg-accent/60 p-4"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <Ticket className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold">教育AIサミット＠衆議院第一会館</span>
                  <span className="block text-xs text-muted-foreground">チケット受付中 → 電子チケット(QR)</span>
                </span>
                <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-1" />
              </Link>
            </Reveal>

            {/* 人気記事ランキング */}
            {popularPosts.length > 0 && (
              <Reveal variant="fade-in" delay={80}>
                <section className="rounded-2xl border border-border/60 p-5">
                  <h2 className="mb-4 flex items-center gap-2 text-base font-bold tracking-tight">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    人気の記事
                  </h2>
                  <ol className="space-y-3.5">
                    {popularPosts.map((p, i) => (
                      <li key={p.id}>
                        <Link href={`/articles/${p.id}`} className="group flex items-start gap-3">
                          <span
                            className={`mt-0.5 w-5 shrink-0 text-center font-mono text-sm font-bold tabular-nums ${
                              i < 3 ? "text-primary" : "text-muted-foreground/60"
                            }`}
                          >
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

            {/* イベント */}
            <Reveal variant="fade-in" delay={140}>
              <section className="rounded-2xl border border-border/60 p-5">
                <h2 className="mb-4 flex items-center gap-2 text-base font-bold tracking-tight">
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
          </aside>
        </div>
      </div>

      {/* ============ 注目のサービス ============ */}
      {services.length > 0 && (
        <section className="border-t border-border/60 bg-secondary/40">
          <div className="container py-14">
            <Reveal>
              <div className="mb-6 flex items-end justify-between">
                <h2 className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
                  <span className="h-5 w-1 rounded-full bg-primary" aria-hidden />
                  注目のサービス
                </h2>
                <Link
                  href="/services"
                  className="link-underline inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  すべて見る <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Reveal>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {services.map((s, i) => (
                <Reveal key={s.id} delay={i * 50}>
                  <Link
                    href={`/services/${s.id}`}
                    className="card-lift group block overflow-hidden rounded-xl border border-border/60 bg-white"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                      {s.thumbnail_url ? (
                        <Image
                          src={s.thumbnail_url}
                          alt={s.title}
                          fill
                          unoptimized
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-muted-foreground/40">
                          <Sparkles className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-[10px] font-medium text-primary">{s.category}</p>
                      <h3 className="mt-0.5 line-clamp-2 text-xs font-semibold leading-snug">{s.title}</h3>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ 3つの入口 ============ */}
      <section className="border-t border-border/60 bg-secondary/40">
        <div className="container py-14">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {[
              {
                href: "/forum",
                icon: MessageSquare,
                title: "教育のひろば",
                desc: "先生、保護者、企業、行政。すべての教育関係者がフラットに対話できる場所。",
                cta: "参加する",
              },
              {
                href: "/matching",
                icon: Users,
                title: "人材マッチング",
                desc: "教育に関わる人と出会う名鑑。関心でつながる。",
                cta: "見てみる",
              },
              {
                href: "/ai-kentei",
                icon: Award,
                title: "AI検定",
                desc: "教育×AIリテラシーを証明。合格バッジをプロフィールに。",
                cta: "挑戦する",
              },
            ].map((f, i) => (
              <Reveal key={f.href} delay={i * 90}>
                <Link href={f.href} className="card-lift group block rounded-2xl border border-border/60 bg-white p-7">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
                    <f.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    {f.cta}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
