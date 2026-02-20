import Link from "next/link";
import { getPopularArticlesByEngagement } from "@/app/_actions/popularity";
import { getAllServices } from "@/app/_actions/services";
import { TopicsTabs } from "./topics-tabs";

function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
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
  image: string;
  date: string;
  category: string;
  tags: string[];
  isNew: boolean;
};

export type ServiceItem = {
  id: string;
  title: string;
  image: string;
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
  const [posts, services, videos] = await Promise.all([
    getPopularArticlesByEngagement(20),
    getAllServices(),
    fetchYouTubeVideos(),
  ]);

  const articles: ArticleItem[] = posts.map((post) => ({
    id: post.id,
    title: post.title,
    image: post.thumbnail_url || "https://placehold.co/80x45/e0f2fe/0369a1?text=No",
    date: formatShortDate(post.created_at),
    category: post.category ?? "",
    tags: post.tags ?? [],
    isNew: isNew(post.created_at),
  }));

  const serviceItems: ServiceItem[] = services.slice(0, 10).map((s) => ({
    id: s.id,
    title: s.title,
    image: s.thumbnail_url || "https://placehold.co/80x45/e0f2fe/0369a1?text=No",
    category: s.category ?? "",
  }));

  return (
    <div className="border rounded-lg bg-card">
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold">トピックス</h2>
      </div>
      <TopicsTabs articles={articles} services={serviceItems} videos={videos} />
      <div className="border-t p-3 text-center">
        <Link href="/articles" className="text-sm text-[#1d4ed8] hover:underline font-medium">
          記事一覧を見る
        </Link>
      </div>
    </div>
  );
}
