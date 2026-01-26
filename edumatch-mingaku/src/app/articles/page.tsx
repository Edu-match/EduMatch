import { getLatestPosts } from "@/app/_actions";
import { ArticlesClient } from "./articles-client";

// カテゴリを推測（日本語ラベルを返す）
function getCategory(content: string): string {
  if (content.includes("ICT") || content.includes("デジタル") || content.includes("AI") || content.includes("ツール")) {
    return "教育ICT";
  }
  if (content.includes("事例") || content.includes("実践") || content.includes("導入")) {
    return "導入事例";
  }
  if (content.includes("運営") || content.includes("保護者") || content.includes("働き方") || content.includes("コミュニケーション")) {
    return "学校運営";
  }
  if (content.includes("政策") || content.includes("GIGA") || content.includes("構想")) {
    return "政策・制度";
  }
  return "教育ICT";
}

export type ArticleForList = {
  id: string;
  title: string;
  excerpt: string;
  image: string;
  category: string;
  date: string;
  isNew: boolean;
};

export default async function ArticlesPage() {
  const posts = await getLatestPosts(20);
  
  // サーバー側で現在時刻を取得して「新着」判定に使用
  const now = new Date();
  const oneDayAgo = now.getTime() - 24 * 60 * 60 * 1000;

  const articles: ArticleForList[] = posts.map((post) => ({
    id: post.id,
    title: post.title,
    excerpt: post.content.substring(0, 150) + "...",
    image: post.thumbnail_url || "https://placehold.co/400x250/e0f2fe/0369a1?text=Article",
    category: getCategory(post.content),
    date: post.created_at.toISOString().split("T")[0],
    isNew: post.created_at.getTime() > oneDayAgo,
  }));

  return <ArticlesClient articles={articles} />;
}
