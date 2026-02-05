import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { getPopularArticlesByEngagement } from "@/app/_actions/popularity";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export async function HeroNews() {
  // お気に入り数でソートされた人気記事を取得
  const posts = await getPopularArticlesByEngagement(4);

  if (posts.length === 0) {
    return (
      <div className="border rounded-lg bg-card p-8 text-center">
        <p className="text-muted-foreground">記事がまだありません</p>
      </div>
    );
  }

  const heroPost = posts[0];
  const relatedPosts = posts.slice(1);

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      {/* メインニュース */}
      <Link href={`/articles/${heroPost.id}`} className="block group">
        <div className="relative h-64 w-full bg-muted">
          <Image
            src={heroPost.thumbnail_url || "https://placehold.co/800x450/e0f2fe/0369a1?text=No+Image"}
            alt={heroPost.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 55vw"
            priority
            unoptimized
          />
          <Badge className="absolute top-3 left-3 bg-[#ef4444] hover:bg-[#dc2626] text-white">
            特集
          </Badge>
        </div>
        <div className="p-4 border-b">
          <h2 className="text-lg font-bold mb-2 group-hover:text-[#1d4ed8] transition-colors line-clamp-2">
            {heroPost.title}
          </h2>
          <p className="text-xs text-muted-foreground">{formatDate(heroPost.created_at)}</p>
        </div>
      </Link>

      {/* 関連ニュース */}
      {relatedPosts.length > 0 && (
        <div className="p-3">
          <ul className="space-y-2">
            {relatedPosts.map((post) => (
              <li key={post.id} className="flex items-start gap-2">
                <span className="text-muted-foreground mt-1 flex-shrink-0">•</span>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/articles/${post.id}`}
                    className="text-sm hover:text-[#1d4ed8] transition-colors line-clamp-2"
                  >
                    {post.title}
                  </Link>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(post.created_at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
