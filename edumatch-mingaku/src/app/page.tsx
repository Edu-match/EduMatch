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
import { prisma } from "@/lib/prisma";
import { getPopularServices } from "@/app/_actions/services";
import { getLatestPosts, getPopularPosts } from "@/app/_actions/posts";
import { getUpcomingEvents } from "@/app/_actions/events";
import { Reveal } from "@/components/home/reveal";
import { NewsTicker } from "@/components/home/news-ticker";

export const dynamic = "force-dynamic";

function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("ja-JP", { month: "long", day: "numeric" }).format(date);
}

/** 教育のひろば：直近の来場者投稿（サイドバー「ひろばの声」用） */
async function getRecentForumVoices(limit: number) {
  try {
    return await prisma.interopPost.findMany({
      where: { is_hidden: false, is_ai_reply: false, parent_post_id: null },
      orderBy: { created_at: "desc" },
      take: limit,
      select: { id: true, body: true, author_name: true, author_role: true },
    });
  } catch {
    return [];
  }
}

export default async function HomePage() {
  unstable_noStore();
  const [posts, popularPosts, services, events, voices] = await Promise.all([
    getLatestPosts(13).catch(() => []),
    getPopularPosts(5).catch(() => []),
    getPopularServices(6).catch(() => []),
    getUpcomingEvents(4).catch(() => []),
    getRecentForumVoices(4),
  ]);

  const featured = posts[0];
  const secondary = posts.slice(1, 5);
  const latestGrid = posts.slice(5, 13);

  return (
    <div className="bg-white">
      {/* ヘッドラインティッカー */}
      <NewsTicker
        items={posts.slice(0, 8).map((p) => ({ id: p.id, title: p.title, href: `/articles/${p.id}` }))}
      />

      <div className="container py-8 sm:py-10">
        {/* ============ トップニュース＋サイドバー ============ */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
          {/* メイン（トップストーリー） */}
          <main className="min-w-0 lg:col-span-8">
            <div className="mb-5 flex items-center justify-between animate-fade-up">
              <h1 className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
                <span className="h-5 w-1 rounded-full bg-primary" aria-hidden />
                トップニュース
              </h1>
              <Link
                href="/articles"
                className="link-underline inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                記事一覧 <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {featured ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
                {/* 一面記事 */}
                <Link
                  href={`/articles/${featured.id}`}
                  className="group animate-fade-up animation-delay-100 md:col-span-3"
                >
                  <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-muted">
                    {featured.thumbnail_url ? (
                      <Image
                        src={featured.thumbnail_url}
                        alt={featured.title}
                        fill
                        priority
                        unoptimized
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-muted-foreground/40">
                        <Newspaper className="h-10 w-10" />
                      </div>
                    )}
                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-foreground backdrop-blur">
                      {featured.category}
                    </span>
                  </div>
                  <p className="mt-4 text-xs text-muted-foreground">{formatDate(featured.created_at)}</p>
                  <h2 className="mt-1.5 text-xl font-bold leading-snug tracking-tight sm:text-2xl">
                    <span className="link-underline">{featured.title}</span>
                  </h2>
                  {featured.summary && (
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                      {featured.summary}
                    </p>
                  )}
                </Link>

                {/* サブ記事リスト */}
                <div className="flex flex-col divide-y divide-border/60 md:col-span-2">
                  {secondary.map((p, i) => (
                    <Link
                      key={p.id}
                      href={`/articles/${p.id}`}
                      className={`group flex gap-3.5 py-3.5 first:pt-0 last:pb-0 animate-fade-up animation-delay-${Math.min(400, (i + 2) * 100)}`}
                    >
                      <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
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
                            <Newspaper className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] text-muted-foreground">
                          {p.category} ・ {formatDate(p.created_at)}
                        </p>
                        <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug">
                          <span className="link-underline">{p.title}</span>
                        </h3>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">記事はまだありません。</p>
            )}

            {/* 最新ニュースグリッド */}
            {latestGrid.length > 0 && (
              <section className="mt-12">
                <Reveal>
                  <h2 className="mb-5 flex items-center gap-2.5 text-lg font-bold tracking-tight">
                    <span className="h-5 w-1 rounded-full bg-primary" aria-hidden />
                    最新ニュース
                  </h2>
                </Reveal>
                <div className="grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-4">
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
              </section>
            )}
          </main>

          {/* ============ サイドバー ============ */}
          <aside className="min-w-0 space-y-8 lg:col-span-4">
            {/* 議員会館チケット（コンパクト告知） */}
            <Reveal>
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
              <Reveal delay={80}>
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

            {/* ひろばの声（ライブ感） */}
            <Reveal delay={140}>
              <section className="rounded-2xl border border-border/60 p-5">
                <h2 className="live-dot mb-4 flex items-center gap-2 text-base font-bold tracking-tight">
                  {" "}ひろばの声
                </h2>
                {voices.length > 0 ? (
                  <ul className="space-y-3">
                    {voices.map((v) => (
                      <li key={v.id} className="rounded-xl bg-secondary/70 px-3.5 py-3">
                        <p className="line-clamp-2 text-sm leading-relaxed">{v.body}</p>
                        <p className="mt-1.5 text-[11px] text-muted-foreground">
                          {v.author_name}
                          {v.author_role ? `（${v.author_role}）` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">最近の投稿はまだありません。</p>
                )}
                <Link
                  href="/forum"
                  className="group mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary"
                >
                  教育のひろばへ
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </section>
            </Reveal>

            {/* イベント */}
            <Reveal delay={200}>
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

      {/* ============ 教育のひろば バンド ============ */}
      <section className="border-t border-border/60">
        <div className="container py-14">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-[oklch(0.45_0.17_275)] px-8 py-12 text-white sm:px-12">
              <div
                className="pointer-events-none absolute inset-0 opacity-40"
                aria-hidden
                style={{
                  background:
                    "radial-gradient(600px 300px at 85% 0%, rgba(255,255,255,0.25), transparent 60%)",
                }}
              />
              <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
                <div className="max-w-xl">
                  <p className="mb-1.5 text-sm font-semibold text-white/70">教育のひろば</p>
                  <h2 className="display-title text-2xl sm:text-4xl">立場を越えて、教育を語ろう。</h2>
                  <p className="mt-3 text-sm leading-relaxed text-white/80 sm:text-base">
                    先生、保護者、企業、行政。すべての教育関係者がフラットに対話できる場所。
                    AIファシリテーターとAIペルソナが、対話を深めます。
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
                  <Link
                    href="/forum"
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-7 text-sm font-semibold text-primary shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <MessageSquare className="h-4 w-4" />
                    ひろばに参加する
                  </Link>
                  <Link
                    href="/matching"
                    className="inline-flex h-11 items-center gap-2 rounded-full border border-white/30 px-7 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-white/10"
                  >
                    <Users className="h-4 w-4" />
                    人材マッチング
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ 3つの入口 ============ */}
      <section className="border-t border-border/60 bg-secondary/40">
        <div className="container py-14">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {[
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
              {
                href: "/videos",
                icon: Sparkles,
                title: "学びの動画",
                desc: "教育AIの実践を動画で。すきま時間にインプット。",
                cta: "視聴する",
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
