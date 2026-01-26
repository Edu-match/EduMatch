import Link from "next/link";
import { getLatestPosts } from "@/app/_actions";
import { TopicsTabs } from "./topics-tabs";

function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

// 記事が新しいかどうか判定（24時間以内）
function isNew(date: Date): boolean {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return diff < 24 * 60 * 60 * 1000;
}

// 仮のカテゴリマッピング（将来的にはDBでカテゴリを管理）
function getCategory(content: string): string {
  if (content.includes("ICT") || content.includes("デジタル") || content.includes("AI")) {
    return "教育ICT";
  }
  if (content.includes("事例") || content.includes("実践") || content.includes("導入")) {
    return "導入事例";
  }
  if (content.includes("運営") || content.includes("保護者") || content.includes("働き方")) {
    return "学校運営";
  }
  return "教育ICT"; // デフォルト
}

export type ArticleItem = {
  id: string;
  title: string;
  image: string;
  date: string;
  category: string;
  isNew: boolean;
};

export async function TopicsSection() {
  const posts = await getLatestPosts(10);

  const articles: ArticleItem[] = posts.map((post) => ({
    id: post.id,
    title: post.title,
    image: post.thumbnail_url || "https://placehold.co/80x80/e0f2fe/0369a1?text=No",
    date: formatShortDate(post.created_at),
    category: getCategory(post.content),
    isNew: isNew(post.created_at),
  }));

  return (
    <div className="border rounded-lg bg-card">
      <div className="p-3 border-b">
        <h2 className="text-sm font-bold">トピックス</h2>
      </div>
      <TopicsTabs articles={articles} />
      <div className="border-t p-3 text-center">
        <Link
          href="/articles"
          className="text-sm text-[#1d4ed8] hover:underline font-medium"
        >
          記事一覧を見る
        </Link>
      </div>
    </div>
  );
}
