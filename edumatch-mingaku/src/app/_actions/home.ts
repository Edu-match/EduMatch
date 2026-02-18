"use server";

import { getLatestPosts } from "./posts";
import { getPopularServices } from "./services";

export type HomeSliderItem = {
  type: "article" | "service";
  id: string;
  title: string;
  thumbnailUrl: string;
  url: string;
  category?: string;
};

/**
 * トップのヒーロースライダー用：記事とサービスを混在させた一覧（最新中心）
 */
export async function getHomeSliderItems(limit: number = 8): Promise<HomeSliderItem[]> {
  try {
    const half = Math.ceil(limit / 2);
    const [posts, services] = await Promise.all([
      getLatestPosts(half),
      getPopularServices(half),
    ]);

    const articleItems: HomeSliderItem[] = posts.map((p) => ({
      type: "article" as const,
      id: p.id,
      title: p.title,
      thumbnailUrl: p.thumbnail_url || "",
      url: `/articles/${p.id}`,
      category: p.category ?? undefined,
    }));

    const serviceItems: HomeSliderItem[] = services.map((s) => ({
      type: "service" as const,
      id: s.id,
      title: s.title,
      thumbnailUrl: s.thumbnail_url || "",
      url: `/services/${s.id}`,
      category: s.category ?? undefined,
    }));

    // 記事・サービスを交互に並べる（記事→サービス→記事→…）
    const merged: HomeSliderItem[] = [];
    const maxLen = Math.max(articleItems.length, serviceItems.length);
    for (let i = 0; i < maxLen; i++) {
      if (articleItems[i]) merged.push(articleItems[i]);
      if (serviceItems[i]) merged.push(serviceItems[i]);
    }

    return merged.slice(0, limit);
  } catch (error) {
    console.error("Failed to get home slider items:", error);
    return [];
  }
}
