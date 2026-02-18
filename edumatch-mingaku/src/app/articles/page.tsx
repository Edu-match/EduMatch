import { unstable_noStore } from "next/cache";
import { getLatestPosts, getArticleCategoryCounts } from "@/app/_actions";
import { ArticlesClient } from "./articles-client";
import { ARTICLE_CATEGORIES } from "@/lib/categories";

export const dynamic = "force-dynamic";

export type ArticleForList = {
  id: string;
  title: string;
  excerpt: string;
  image: string;
  category: string;
  tags: string[];
  date: string;
  isNew: boolean;
};

export default async function ArticlesPage() {
  unstable_noStore();
  const [posts, categoryCounts] = await Promise.all([
    getLatestPosts(20),
    getArticleCategoryCounts(),
  ]);

  const now = new Date();
  const oneDayAgo = now.getTime() - 24 * 60 * 60 * 1000;

  const articles: ArticleForList[] = posts.map((post) => ({
    id: post.id,
    title: post.title,
    excerpt: post.content.substring(0, 150) + "...",
    image: post.thumbnail_url || "https://placehold.co/400x250/e0f2fe/0369a1?text=Article",
    category: post.category || "未分類",
    tags: post.tags ?? [],
    date: post.created_at.toISOString().split("T")[0],
    isNew: post.created_at.getTime() > oneDayAgo,
  }));

  // 公開一覧用: 記事が1件以上あるカテゴリのみ表示（0件は非表示）
  let categoriesWithCount = ARTICLE_CATEGORIES.filter(
    (c) => (categoryCounts[c] ?? 0) > 0
  );
  // 既存データが旧カテゴリの場合は1件もマッチせず空になるため、そのときは全カテゴリを表示
  if (categoriesWithCount.length === 0) {
    categoriesWithCount = [...ARTICLE_CATEGORIES];
  }

  return (
    <ArticlesClient
      articles={articles}
      categoriesWithCount={categoriesWithCount}
    />
  );
}
