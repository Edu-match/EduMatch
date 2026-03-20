"use client";

import Link from "next/link";
import Image from "next/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ThumbnailOrTitle } from "@/components/ui/thumbnail-or-title";
import type { ArticleItem, ServiceItem, VideoItem } from "./topics-section";

function ArticleListItem({ article }: { article: ArticleItem }) {
  return (
    <Link
      href={`/articles/${article.id}`}
      className="flex gap-3 py-2.5 px-2 -mx-2 border-b last:border-b-0 hover:bg-muted/50 transition-colors"
    >
      <div className="relative w-16 flex-shrink-0 overflow-hidden rounded border bg-muted aspect-video">
        <ThumbnailOrTitle
          src={article.image ?? undefined}
          title={article.title}
          fill
          className="object-contain"
          sizes="64px"
          unoptimized
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 mb-1">
          {article.isNew && (
            <Badge className="bg-[#ef4444] hover:bg-[#dc2626] text-white text-xs px-1.5 py-0 shrink-0">
              NEW
            </Badge>
          )}
          <h3 className="font-medium text-sm hover:text-[#1d4ed8] transition-colors line-clamp-2 flex-1">
            {article.title}
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{article.date}</span>
        </div>
      </div>
    </Link>
  );
}

function ServiceListItem({ service }: { service: ServiceItem }) {
  return (
    <Link
      href={`/services/${service.id}`}
      className="flex gap-3 py-2.5 px-2 -mx-2 border-b last:border-b-0 hover:bg-muted/50 transition-colors"
    >
      <div className="relative w-16 flex-shrink-0 overflow-hidden rounded border bg-muted aspect-video">
        <ThumbnailOrTitle
          src={service.image ?? undefined}
          title={service.title}
          fill
          className="object-contain"
          sizes="64px"
          unoptimized
        />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm hover:text-[#1d4ed8] transition-colors line-clamp-2">
          {service.title}
        </h3>
      </div>
    </Link>
  );
}

function VideoListItem({ video }: { video: VideoItem }) {
  return (
    <Link
      href={`https://www.youtube.com/watch?v=${video.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 py-2.5 px-2 -mx-2 border-b last:border-b-0 hover:bg-muted/50 transition-colors"
    >
      <div className="relative w-24 flex-shrink-0 overflow-hidden rounded border bg-muted aspect-video">
        <Image
          src={video.thumbnail}
          alt={video.title}
          fill
          className="object-cover"
          sizes="96px"
          unoptimized
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-black/60 rounded-full w-7 h-7 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          </div>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm hover:text-[#1d4ed8] transition-colors line-clamp-2">
          {video.title}
        </h3>
        {video.published && (
          <p className="text-xs text-muted-foreground mt-1">{video.published}</p>
        )}
      </div>
    </Link>
  );
}

type Props = {
  articles: ArticleItem[];
  weeklyArticles: ArticleItem[];
  services: ServiceItem[];
  videos: VideoItem[];
};

export function TopicsTabs({ articles, weeklyArticles, services, videos }: Props) {
  const domesticArticles = articles.filter((a) => a.newsTab === "DOMESTIC");
  const internationalArticles = articles.filter((a) => a.newsTab === "INTERNATIONAL");

  const triggerClass =
    "rounded-none border-b-2 border-transparent data-[state=active]:border-[#1d4ed8] data-[state=active]:bg-transparent px-4 py-2 text-sm";

  return (
    <Tabs defaultValue="all" className="w-full">
      <div className="border-b">
        <TabsList className="w-full justify-start rounded-none h-auto bg-transparent p-0">
          <TabsTrigger value="all" className={triggerClass}>すべて</TabsTrigger>
          <TabsTrigger value="domestic" className={triggerClass}>国内のニュース</TabsTrigger>
          <TabsTrigger value="international" className={triggerClass}>世界のニュース</TabsTrigger>
          {weeklyArticles.length > 0 && (
            <TabsTrigger value="weekly" className={triggerClass}>今週のニュース</TabsTrigger>
          )}
        </TabsList>
      </div>
      <div className="p-3">
        <TabsContent value="all" className="mt-0 space-y-0">
          {articles.length > 0 ? (
            articles.map((a) => <ArticleListItem key={a.id} article={a} />)
          ) : (
            <p className="text-center text-muted-foreground py-4">記事がありません</p>
          )}
        </TabsContent>

        <TabsContent value="domestic" className="mt-0 space-y-0">
          {domesticArticles.length > 0 ? (
            domesticArticles.map((a) => <ArticleListItem key={a.id} article={a} />)
          ) : (
            <p className="text-center text-muted-foreground py-4">国内のニュースがありません</p>
          )}
        </TabsContent>

        <TabsContent value="international" className="mt-0 space-y-0">
          {internationalArticles.length > 0 ? (
            internationalArticles.map((a) => <ArticleListItem key={a.id} article={a} />)
          ) : (
            <p className="text-center text-muted-foreground py-4">世界のニュースがありません</p>
          )}
        </TabsContent>

        {weeklyArticles.length > 0 && (
        <TabsContent value="weekly" className="mt-0 space-y-0">
          {weeklyArticles.map((a) => <ArticleListItem key={a.id} article={a} />)}
        </TabsContent>
        )}
      </div>
    </Tabs>
  );
}
