"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type HomeSliderItem = {
  type: "article" | "service" | "site_update";
  id: string;
  title: string;
  thumbnailUrl: string;
  url: string;
  category?: string;
};

const SLIDER_PLACEHOLDER = "https://placehold.co/1200x500/e0f2fe/0369a1?text=No+Image";

/**
 * トップのヒーロースライダー用：運営お知らせを先頭に、続けてADMINが選択した記事を表示
 */
export async function getHomeSliderItems(limit: number = 12): Promise<HomeSliderItem[]> {
  try {
    const [siteUpdates, sliderArticles] = await Promise.all([
      prisma.siteUpdate.findMany({
        orderBy: { published_at: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          thumbnail_url: true,
          link: true,
        },
      }),
      prisma.homeSliderArticle.findMany({
        orderBy: { position: "asc" },
        include: {
          post: {
            select: {
              id: true,
              title: true,
              thumbnail_url: true,
              category: true,
              status: true,
              is_published: true,
            },
          },
        },
      }),
    ]);

    const siteUpdateItems: HomeSliderItem[] = siteUpdates.map((u) => ({
      type: "site_update" as const,
      id: u.id,
      title: u.title,
      thumbnailUrl: u.thumbnail_url || SLIDER_PLACEHOLDER,
      url: u.link || `/site-updates/${u.id}`,
    }));

    const approved = sliderArticles.filter(
      (e) => e.post && (e.post.status === "APPROVED" || e.post.is_published)
    );
    const articleItems: HomeSliderItem[] = approved.map((e) => ({
      type: "article" as const,
      id: e.post.id,
      title: e.post.title,
      thumbnailUrl: e.post.thumbnail_url || SLIDER_PLACEHOLDER,
      url: `/articles/${e.post.id}`,
      category: e.post.category ?? undefined,
    }));

    return [...siteUpdateItems, ...articleItems].slice(0, limit);
  } catch (error) {
    console.error("Failed to get home slider items:", error);
    return [];
  }
}

/** ADMIN用: スライダーに表示する記事一覧（管理画面用） */
export async function getHomeSliderArticlesForAdmin() {
  const rows = await prisma.homeSliderArticle.findMany({
    orderBy: { position: "asc" },
    include: {
      post: {
        select: {
          id: true,
          title: true,
          thumbnail_url: true,
          category: true,
          status: true,
          is_published: true,
          created_at: true,
        },
      },
    },
  });
  return rows;
}

/** ADMIN用: スライダーに記事を追加 */
export async function addHomeSliderArticle(postId: string) {
  const { getCurrentUserRole } = await import("./user");
  const role = await getCurrentUserRole();
  if (role !== "ADMIN") return { success: false, error: "権限がありません" };
  const max = await prisma.homeSliderArticle.aggregate({ _max: { position: true } });
  const position = (max._max.position ?? -1) + 1;
  await prisma.homeSliderArticle.create({
    data: { post_id: postId, position },
  });
  revalidatePath("/");
  return { success: true };
}

/** ADMIN用: スライダーから記事を削除 */
export async function removeHomeSliderArticle(postId: string) {
  const { getCurrentUserRole } = await import("./user");
  const role = await getCurrentUserRole();
  if (role !== "ADMIN") return { success: false, error: "権限がありません" };
  await prisma.homeSliderArticle.deleteMany({ where: { post_id: postId } });
  revalidatePath("/");
  return { success: true };
}

/** ADMIN用: スライダー記事の並び順を更新 */
export async function reorderHomeSliderArticles(orderedPostIds: string[]) {
  const { getCurrentUserRole } = await import("./user");
  const role = await getCurrentUserRole();
  if (role !== "ADMIN") return { success: false, error: "権限がありません" };
  await prisma.$transaction(
    orderedPostIds.map((post_id, index) =>
      prisma.homeSliderArticle.updateMany({
        where: { post_id },
        data: { position: index },
      })
    )
  );
  revalidatePath("/");
  return { success: true };
}
