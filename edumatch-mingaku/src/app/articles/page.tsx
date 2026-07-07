import { unstable_noStore } from "next/cache";
import { getLocale } from "next-intl/server";
import { getLatestPosts, getArticleCategoryCounts } from "@/app/_actions";
import { ArticlesClient } from "./articles-client";
import { ARTICLE_CATEGORIES } from "@/lib/categories";
import { excerptFromHtml } from "@/lib/html";
import { translateBatch } from "@/lib/translate";
import type { Locale } from "@/i18n/config";

export const dynamic = "force-dynamic";

export type ArticleForList = {
  id: string;
  title: string;
  excerpt: string;
  image: string | null;
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
  const locale = (await getLocale()) as Locale;

  const excerpts = posts.map((post) => excerptFromHtml(post.content, 150));
  // DB 由来テキスト（タイトル・抜粋）を表示言語へ機械翻訳（ja のときは原文のまま）
  const [translatedTitles, translatedExcerpts] = await Promise.all([
    translateBatch(posts.map((p) => p.title), locale),
    translateBatch(excerpts, locale),
  ]);

  const articles: ArticleForList[] = posts.map((post, i) => ({
    id: post.id,
    title: translatedTitles[i],
    excerpt: translatedExcerpts[i],
    image: post.thumbnail_url ?? null,
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
