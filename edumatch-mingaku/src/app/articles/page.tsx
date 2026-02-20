import { unstable_noStore } from "next/cache";
import { getLatestPosts, getArticleCategoryCounts } from "@/app/_actions";
import { ArticlesClient } from "./articles-client";
import { ARTICLE_CATEGORIES } from "@/lib/categories";
import { excerptFromHtml } from "@/lib/html";

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
    getLatestPosts(600),
    getArticleCategoryCounts(),
  ]);

  const now = new Date();
  const oneDayAgo = now.getTime() - 24 * 60 * 60 * 1000;

  const articles: ArticleForList[] = posts.map((post) => ({
    id: post.id,
    title: post.title,
    excerpt: excerptFromHtml(post.content, 150),
    image: post.thumbnail_url || "https://placehold.co/400x250/e0f2fe/0369a1?text=Article",
    category: post.category || "未分類",
    tags: post.tags ?? [],
    date: post.created_at.toISOString().split("T")[0],
    isNew: post.created_at.getTime() > oneDayAgo,
  }));

  // 公開一覧用: 記事が1件以上あるカテゴリのみ表示（0件は非表示）
  // DBに存在する任意のカテゴリも含めて件数が1件以上のものを表示
  const allCategoryKeys = new Set([
    ...ARTICLE_CATEGORIES,
    ...Object.keys(categoryCounts),
  ]);
  const categoriesWithCount = [...allCategoryKeys]
    .filter((c) => (categoryCounts[c] ?? 0) > 0)
    .sort((a, b) => (categoryCounts[b] ?? 0) - (categoryCounts[a] ?? 0));

  return (
    <ArticlesClient
      articles={articles}
      categoriesWithCount={categoriesWithCount}
    />
  );
}
