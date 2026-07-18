"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Pin } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ThumbnailOrTitle } from "@/components/ui/thumbnail-or-title";
import type { ArticleItem, PinnedSiteUpdateItem, ServiceItem, VideoItem } from "./topics-section";

function PinnedSiteUpdateListItem({ item }: { item: PinnedSiteUpdateItem }) {
  const t = useTranslations("home");
  return (
    <Link
      href={item.href}
      target={item.external ? "_blank" : undefined}
      rel={item.external ? "noopener noreferrer" : undefined}
      className="flex gap-3 py-2.5 px-2 -mx-2 border-b last:border-b-0 bg-amber-50/80 hover:bg-amber-100/70 transition-colors rounded-sm"
    >
      <div className="relative w-16 flex-shrink-0 overflow-hidden rounded border border-amber-200/80 bg-muted aspect-video">
        <ThumbnailOrTitle
          src={item.image ?? undefined}
          title={item.title}
          fill
          className="object-contain"
          sizes="64px"
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <Pin className="h-3.5 w-3.5 shrink-0 fill-amber-500 text-amber-600" aria-hidden />
          <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-wide">
            {t("pinned")}
          </span>
          {item.isNew && (
            <Badge className="bg-[#ef4444] hover:bg-[#dc2626] text-white text-xs px-1.5 py-0 shrink-0">
              NEW
            </Badge>
          )}
        </div>
        <h3 className="font-medium text-sm hover:text-[#1d4ed8] transition-colors line-clamp-2">
          {item.title}
        </h3>
        <div className="flex items-center gap-2 text-xs text-amber-900/70 mt-0.5">
          <span>{item.date}</span>
          <span>{t("siteUpdate")}</span>
        </div>
      </div>
    </Link>
  );
}

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
  pinnedSiteUpdates: PinnedSiteUpdateItem[];
  services: ServiceItem[];
  videos: VideoItem[];
};

const ALL_TAB_MAX = 10;

export function TopicsTabs({ articles, pinnedSiteUpdates, services, videos }: Props) {
  const t = useTranslations("home");
  const pinnedCount = pinnedSiteUpdates.length;
  const regularAllCount = Math.max(0, ALL_TAB_MAX - pinnedCount);
  const allArticles = articles.slice(0, regularAllCount);
  const newsArticles = articles
    .filter((a) => a.newsTab === "DOMESTIC" || a.newsTab === "INTERNATIONAL" || a.newsTab === "WEEKLY")
    .slice(0, 10);
  const serviceItems = services.slice(0, 10);
  const videoItems = videos.slice(0, 10);

  const triggerClass =
    "rounded-none border-b-2 border-transparent data-[state=active]:border-[#1d4ed8] data-[state=active]:bg-transparent px-3 sm:px-4 py-2.5 text-sm whitespace-nowrap flex-shrink-0";

  return (
    <Tabs defaultValue="all" className="w-full">
      <div className="border-b overflow-x-auto">
        <TabsList className="w-max min-w-full justify-start rounded-none h-auto bg-transparent p-0 flex">
          <TabsTrigger value="all" className={triggerClass}>{t("tabArticles")}</TabsTrigger>
          <TabsTrigger value="news" className={triggerClass}>{t("tabNews")}</TabsTrigger>
          <TabsTrigger value="services" className={triggerClass}>{t("tabServices")}</TabsTrigger>
          <TabsTrigger value="videos" className={triggerClass}>{t("tabVideos")}</TabsTrigger>
        </TabsList>
      </div>
      <div className="p-3">
        <TabsContent value="all" className="mt-0 space-y-0">
          {pinnedSiteUpdates.length > 0 || allArticles.length > 0 ? (
            <>
              {pinnedSiteUpdates.map((item) => (
                <PinnedSiteUpdateListItem key={`site-update-${item.id}`} item={item} />
              ))}
              {allArticles.map((a) => (
                <ArticleListItem key={a.id} article={a} />
              ))}
            </>
          ) : (
            <p className="text-center text-muted-foreground py-4">{t("noArticles")}</p>
          )}
        </TabsContent>

        <TabsContent value="news" className="mt-0 space-y-0">
          {newsArticles.length > 0 ? (
            newsArticles.map((a) => <ArticleListItem key={a.id} article={a} />)
          ) : (
            <p className="text-center text-muted-foreground py-4">{t("noNews")}</p>
          )}
        </TabsContent>

        <TabsContent value="services" className="mt-0 space-y-0">
          {serviceItems.length > 0 ? (
            serviceItems.map((s) => <ServiceListItem key={s.id} service={s} />)
          ) : (
            <p className="text-center text-muted-foreground py-4">{t("noServices")}</p>
          )}
        </TabsContent>

        <TabsContent value="videos" className="mt-0 space-y-0">
          {videoItems.length > 0 ? (
            videoItems.map((v) => <VideoListItem key={v.id} video={v} />)
          ) : (
            <p className="text-center text-muted-foreground py-4">{t("noVideos")}</p>
          )}
        </TabsContent>
      </div>
    </Tabs>
  );
}
