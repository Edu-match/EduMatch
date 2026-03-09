import Link from "next/link";
import { getLatestArticlesForTopics, getLatestArticlesFromLast7Days } from "@/app/_actions/popularity";
import { getAllServices } from "@/app/_actions/services";
import { TopicsTabs } from "./topics-tabs";

function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(date);
}

function isNew(date: Date): boolean {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return diff < 24 * 60 * 60 * 1000;
}

export type ArticleItem = {
  id: string;
  title: string;
  /** サムネイルURL。未設定時はタイトルを表示 */
  image?: string | null;
  date: string;
  category: string;
  tags: string[];
  isNew: boolean;
  newsTab: "NONE" | "DOMESTIC" | "INTERNATIONAL" | "WEEKLY";
};

export type ServiceItem = {
  id: string;
  title: string;
  /** サムネイルURL。未設定時はタイトルを表示 */
  image?: string | null;
  category: string;
};

export type VideoItem = {
  id: string;
  title: string;
  thumbnail: string;
  published: string;
};

async function fetchYouTubeVideos(): Promise<VideoItem[]> {
  const CHANNEL_ID = "UCgfqF4UhO4fa1EBAs6dxHdw";
  try {
    const res = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const xml = await res.text();

    const entries: VideoItem[] = [];
    const entryMatches = xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g);

    for (const match of entryMatches) {
      const entry = match[1];
      const idMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
      const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
      const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);
      const thumbMatch = entry.match(/media:thumbnail[^>]+url="([^"]+)"/);

      if (!idMatch || !titleMatch) continue;
      const videoId = idMatch[1];
      entries.push({
        id: videoId,
        title: titleMatch[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"),
        thumbnail: thumbMatch ? thumbMatch[1] : `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        published: publishedMatch ? publishedMatch[1].slice(0, 10) : "",
      });
    }

    return entries.slice(0, 20);
  } catch {
    return [];
  }
}

export async function TopicsSection() {
  const [posts, weeklyPosts, services, videos] = await Promise.all([
    getLatestArticlesForTopics(10),
    getLatestArticlesFromLast7Days(),
    getAllServices(),
    fetchYouTubeVideos(),
  ]);

  const articles: ArticleItem[] = posts.slice(0, 10).map((post) => ({
    id: post.id,
    title: post.title,
    image: post.thumbnail_url ?? undefined,
    date: formatShortDate(post.created_at),
    category: post.category ?? "",
    tags: post.tags ?? [],
    isNew: isNew(post.created_at),
    newsTab: (post as unknown as { home_news_tab?: ArticleItem["newsTab"] }).home_news_tab ?? "NONE",
  }));

  const weeklyArticles: ArticleItem[] = weeklyPosts.map((post) => ({
    id: post.id,
    title: post.title,
    image: post.thumbnail_url ?? undefined,
    date: formatShortDate(post.created_at),
    category: post.category ?? "",
    tags: post.tags ?? [],
    isNew: isNew(post.created_at),
    newsTab: (post as unknown as { home_news_tab?: ArticleItem["newsTab"] }).home_news_tab ?? "NONE",
  }));

  const serviceItems: ServiceItem[] = services.slice(0, 10).map((s) => ({
    id: s.id,
    title: s.title,
    image: s.thumbnail_url ?? undefined,
    category: s.category ?? "",
  }));

  return (
    <div className="border rounded-lg bg-card">
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold">トピックス</h2>
      </div>
      <TopicsTabs articles={articles} weeklyArticles={weeklyArticles} services={serviceItems} videos={videos} />
      <div className="border-t p-3 text-center">
        <Link href="/articles" className="text-sm text-[#1d4ed8] hover:underline font-medium">
          記事一覧を見る
        </Link>
      </div>
    </div>
  );
}
