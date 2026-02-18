import Link from "next/link";
import Image from "next/image";
import { getHotTopicsLastMonth } from "@/app/_actions/popularity";
import { Flame } from "lucide-react";

const rankStyles = [
  "bg-[#ef4444] text-white",
  "bg-[#f97316] text-white",
  "bg-[#f59e0b] text-white",
  "bg-muted text-foreground",
  "bg-muted text-foreground",
];

export async function HotTopicsSection() {
  const articles = await getHotTopicsLastMonth(10);

  if (articles.length === 0) {
    return (
      <section className="border rounded-lg bg-card p-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          ホットトピック（直近1ヶ月のいいねランキング）
        </h2>
        <p className="text-sm text-muted-foreground">直近1ヶ月の記事がまだありません</p>
      </section>
    );
  }

  return (
    <section className="border rounded-lg bg-card">
      <div className="p-3 border-b flex items-center gap-2">
        <Flame className="h-5 w-5 text-orange-500" />
        <h2 className="text-lg font-bold">ホットトピック（直近1ヶ月のいいねランキング）</h2>
      </div>
      <ul className="p-3 space-y-2.5">
        {articles.map((article, index) => (
          <li key={article.id} className="flex items-center gap-3">
            <span
              className={`flex-shrink-0 h-7 w-7 flex items-center justify-center rounded text-xs font-bold ${rankStyles[index] ?? rankStyles[4]}`}
            >
              {index + 1}
            </span>
            <div className="relative h-12 w-12 flex-shrink-0 rounded overflow-hidden border bg-muted">
              <Image
                src={article.thumbnail_url || "https://placehold.co/120x120/e0f2fe/0369a1?text=No"}
                alt={article.title}
                fill
                className="object-cover"
                sizes="48px"
                unoptimized
              />
            </div>
            <Link
              href={`/articles/${article.id}`}
              className="flex-1 text-sm hover:text-primary transition-colors line-clamp-2 min-w-0"
            >
              {article.title}
            </Link>
            {article.favorite_count > 0 && (
              <span className="text-xs text-muted-foreground flex-shrink-0">♥ {article.favorite_count}</span>
            )}
          </li>
        ))}
      </ul>
      <div className="p-3 border-t text-center">
        <Link href="/articles" className="text-sm text-primary hover:underline font-medium">
          記事一覧を見る
        </Link>
      </div>
    </section>
  );
}
