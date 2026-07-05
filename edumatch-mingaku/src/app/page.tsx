import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Ticket, MessageSquare, Users, Award, Calendar, Newspaper, Sparkles } from "lucide-react";
import { unstable_noStore } from "next/cache";
import { getPopularServices } from "@/app/_actions/services";
import { getLatestPosts } from "@/app/_actions/posts";
import { getUpcomingEvents } from "@/app/_actions/events";

export const dynamic = "force-dynamic";

function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" }).format(date);
}

export default async function HomePage() {
  unstable_noStore();
  const [services, posts, events] = await Promise.all([
    getPopularServices(6).catch(() => []),
    getLatestPosts(4).catch(() => []),
    getUpcomingEvents(4).catch(() => []),
  ]);

  return (
    <div className="bg-white">
      {/* ヒーロー：Apple風の大型タイポグラフィ */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(1200px 600px at 50% -10%, oklch(0.96 0.02 258 / 0.9), transparent 70%)",
          }}
        />
        <div className="container relative flex flex-col items-center py-20 text-center sm:py-28 lg:py-32">
          {/* 議員会館チケットの告知ピル（控えめに） */}
          <Link
            href="/forum/kaikan"
            className="group mb-8 inline-flex items-center gap-2 rounded-full border border-border/70 bg-white/80 py-1.5 pl-2 pr-3.5 text-sm text-muted-foreground shadow-sm backdrop-blur transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              <Ticket className="h-3 w-3" /> NEW
            </span>
            教育AIサミット＠衆議院第一会館 チケット受付中
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>

          <h1 className="display-title max-w-3xl text-4xl text-foreground sm:text-6xl lg:text-7xl">
            <span className="whitespace-nowrap">教育の未来を、</span>
            <br className="sm:hidden" />
            <span className="whitespace-nowrap">見つける。</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            エデュマッチは、AI × 教育の総合プラットフォーム。
            <br className="hidden sm:block" />
            サービスとの出会いから、立場を越えた対話まで。
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/services"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30"
            >
              サービスを探す
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/forum"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-white px-8 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <MessageSquare className="h-4 w-4 text-primary" />
              教育のひろばへ
            </Link>
          </div>
        </div>
      </section>

      {/* 注目のサービス */}
      {services.length > 0 && (
        <section className="border-t border-border/60 bg-secondary/40">
          <div className="container py-16 sm:py-20">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <p className="mb-1.5 text-sm font-semibold text-primary">Services</p>
                <h2 className="section-title">注目のサービス</h2>
              </div>
              <Link
                href="/services"
                className="hidden items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
              >
                すべて見る <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((s) => (
                <Link
                  key={s.id}
                  href={`/services/${s.id}`}
                  className="card-lift group overflow-hidden rounded-2xl border border-border/60 bg-white"
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                    {s.thumbnail_url ? (
                      <Image
                        src={s.thumbnail_url}
                        alt={s.title}
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-muted-foreground/40">
                        <Sparkles className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <span className="inline-block rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
                      {s.category}
                    </span>
                    <h3 className="mt-2.5 line-clamp-1 font-semibold text-foreground">{s.title}</h3>
                    <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                      {s.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-8 text-center sm:hidden">
              <Link href="/services" className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                すべてのサービスを見る <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 教育のひろば：フィーチャーバンド */}
      <section className="border-t border-border/60">
        <div className="container py-16 sm:py-20">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-[oklch(0.45_0.17_275)] px-8 py-14 text-center text-white sm:px-14 sm:py-20">
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              aria-hidden
              style={{
                background:
                  "radial-gradient(600px 300px at 80% 10%, rgba(255,255,255,0.25), transparent 60%)",
              }}
            />
            <p className="relative mb-2 text-sm font-semibold text-white/70">教育のひろば</p>
            <h2 className="display-title relative mx-auto max-w-2xl text-3xl sm:text-5xl">
              立場を越えて、
              <br className="sm:hidden" />
              教育を語ろう。
            </h2>
            <p className="relative mx-auto mt-5 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
              先生、保護者、企業、行政。すべての教育関係者がフラットに対話できる場所。
              AIファシリテーターとAIペルソナが、対話を深めます。
            </p>
            <div className="relative mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/forum"
                className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-7 text-sm font-semibold text-primary shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                ひろばに参加する <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/matching"
                className="inline-flex h-11 items-center gap-2 rounded-full border border-white/30 px-7 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-white/10"
              >
                <Users className="h-4 w-4" /> 人材マッチング
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 最新の記事 ＋ イベント */}
      <section className="border-t border-border/60 bg-secondary/40">
        <div className="container grid grid-cols-1 gap-12 py-16 sm:py-20 lg:grid-cols-3 lg:gap-10">
          {/* 記事 */}
          <div className="lg:col-span-2">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <p className="mb-1.5 text-sm font-semibold text-primary">Articles</p>
                <h2 className="section-title">最新の記事</h2>
              </div>
              <Link
                href="/articles"
                className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                すべて見る <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {posts.map((p) => (
                <Link
                  key={p.id}
                  href={`/articles/${p.id}`}
                  className="card-lift group flex gap-4 rounded-2xl border border-border/60 bg-white p-4"
                >
                  <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-muted">
                    {p.thumbnail_url ? (
                      <Image
                        src={p.thumbnail_url}
                        alt={p.title}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-muted-foreground/40">
                        <Newspaper className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{formatDate(p.created_at)}</p>
                    <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                      {p.title}
                    </h3>
                  </div>
                </Link>
              ))}
              {posts.length === 0 && (
                <p className="text-sm text-muted-foreground">記事はまだありません。</p>
              )}
            </div>
          </div>

          {/* イベント */}
          <div>
            <div className="mb-8">
              <p className="mb-1.5 text-sm font-semibold text-primary">Events</p>
              <h2 className="section-title">イベント</h2>
            </div>
            <div className="space-y-3">
              {events.map((e) => (
                <Link
                  key={e.id}
                  href={`/events`}
                  className="card-lift flex items-center gap-3.5 rounded-2xl border border-border/60 bg-white p-4"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                    <Calendar className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{e.dateLabel}</p>
                    <p className="line-clamp-1 text-sm font-semibold text-foreground">{e.title}</p>
                  </div>
                </Link>
              ))}
              {events.length === 0 && (
                <p className="text-sm text-muted-foreground">開催予定のイベントはありません。</p>
              )}
              <Link
                href="/events"
                className="inline-flex items-center gap-1 pt-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                イベント一覧へ <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3つの入口：マッチング / AI検定 / 動画 */}
      <section className="border-t border-border/60">
        <div className="container py-16 sm:py-20">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Link
              href="/matching"
              className="card-lift group rounded-2xl border border-border/60 bg-white p-7"
            >
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-semibold text-foreground">人材マッチング</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                教育に関わる人と出会う名鑑。関心でつながる。
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                見てみる <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
            <Link
              href="/ai-kentei"
              className="card-lift group rounded-2xl border border-border/60 bg-white p-7"
            >
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Award className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-semibold text-foreground">AI検定</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                教育×AIリテラシーを証明。合格バッジをプロフィールに。
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                挑戦する <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
            <Link
              href="/videos"
              className="card-lift group rounded-2xl border border-border/60 bg-white p-7"
            >
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-semibold text-foreground">学びの動画</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                教育AIの実践を動画で。すきま時間にインプット。
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                視聴する <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
