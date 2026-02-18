import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPopularArticlesByEngagement, getPopularServicesByEngagement } from "@/app/_actions/popularity";
import { ArrowRight, BookOpen, Sparkles } from "lucide-react";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export async function VisualShowcaseSection() {
  const [articles, services] = await Promise.all([
    getPopularArticlesByEngagement(5),
    getPopularServicesByEngagement(4),
  ]);

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border bg-gradient-to-r from-primary/10 via-primary/5 to-background p-6 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              今すぐチェック
            </div>
            <h2 className="text-2xl font-bold md:text-3xl">注目の記事・サービス</h2>
            <p className="mt-2 text-sm text-muted-foreground md:text-base">
              画像付きで見やすく、気になる情報にすぐアクセスできます。
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/articles">記事一覧</Link>
            </Button>
            <Button asChild>
              <Link href="/services">サービス一覧</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-8">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <BookOpen className="h-5 w-5 text-primary" />
              注目記事
            </h3>
            <Link href="/articles" className="text-sm font-medium text-primary hover:underline">
              もっと見る
            </Link>
          </div>

          {articles.length > 0 ? (
            <>
              <Link
                href={`/articles/${articles[0].id}`}
                className="group block overflow-hidden rounded-xl border bg-card"
              >
                <div className="relative h-60 w-full md:h-72">
                  <Image
                    src={articles[0].thumbnail_url || "https://placehold.co/1200x675/e0f2fe/0369a1?text=Article"}
                    alt={articles[0].title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 1280px) 100vw, 66vw"
                    priority
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <Badge className="absolute left-4 top-4 bg-primary text-primary-foreground">FEATURED</Badge>
                  <div className="absolute bottom-0 p-5 text-white">
                    <p className="mb-2 text-xs text-white/85">{formatDate(articles[0].created_at)}</p>
                    <h4 className="line-clamp-2 text-xl font-bold md:text-2xl">{articles[0].title}</h4>
                  </div>
                </div>
              </Link>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {articles.slice(1).map((article) => (
                  <Link
                    key={article.id}
                    href={`/articles/${article.id}`}
                    className="group overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md"
                  >
                    <div className="relative h-44 w-full">
                      <Image
                        src={article.thumbnail_url || "https://placehold.co/800x450/e0f2fe/0369a1?text=Article"}
                        alt={article.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 50vw"
                        unoptimized
                      />
                    </div>
                    <div className="p-4">
                      <p className="mb-2 text-xs text-muted-foreground">{formatDate(article.created_at)}</p>
                      <h4 className="line-clamp-2 text-base font-semibold group-hover:text-primary">{article.title}</h4>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
              記事データがまだありません
            </div>
          )}
        </div>

        <div className="space-y-4 xl:col-span-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">人気サービス</h3>
            <Link href="/services" className="text-sm font-medium text-primary hover:underline">
              一覧へ
            </Link>
          </div>

          {services.length > 0 ? (
            <div className="space-y-4">
              {services.map((service, index) => (
                <Link
                  key={service.id}
                  href={`/services/${service.id}`}
                  className="group block overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md"
                >
                  <div className="relative h-36 w-full">
                    <Image
                      src={service.thumbnail_url || "https://placehold.co/800x450/e0f2fe/0369a1?text=Service"}
                      alt={service.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 1280px) 100vw, 33vw"
                      unoptimized
                    />
                    <div className="absolute left-3 top-3 rounded-md bg-black/70 px-2 py-1 text-xs font-bold text-white">
                      #{index + 1}
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="mb-1 text-xs text-muted-foreground">{service.category}</p>
                    <h4 className="line-clamp-2 text-sm font-semibold group-hover:text-primary">{service.title}</h4>
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="line-clamp-1">{service.price_info || "お問い合わせ"}</span>
                      <span className="inline-flex items-center gap-1 text-primary">
                        詳細
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
              サービスデータがまだありません
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
