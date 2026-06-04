"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { normalizeImageUrl } from "@/lib/image-url-utils";
import type { PublishStatus } from "@prisma/client";

export type HomeSliderItem = {
  type: "article" | "service" | "site_update";
  id: string;
  title: string;
  thumbnailUrl: string;
  url: string;
  category?: string;
};

const SLIDER_PLACEHOLDER = "https://placehold.co/1200x500/e0f2fe/0369a1?text=No+Image";

const PUBLISHED_POST_OR: Array<
  { status: PublishStatus } | { is_published: true }
> = [{ status: "APPROVED" }, { is_published: true }];

function sliderThumbnail(url: string | null | undefined): string {
  if (!url?.trim()) return SLIDER_PLACEHOLDER;
  return normalizeImageUrl(url.trim());
}

function isPrismaSchemaMismatch(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
  return (
    code === "P2021" ||
    code === "P2022" ||
    msg.includes("does not exist") ||
    msg.includes("HomeSliderArticle") ||
    msg.includes("show_in_slider")
  );
}

/** トップは未ログイン閲覧が主のため、会員限定記事はスライダーに出さない */
const PUBLIC_SLIDER_POST_WHERE = {
  AND: [{ OR: PUBLISHED_POST_OR }, { is_member_only: false }],
};

async function fetchSiteUpdatesForSlider() {
  const select = {
    id: true,
    title: true,
    thumbnail_url: true,
    link: true,
  } as const;

  try {
    return await prisma.siteUpdate.findMany({
      where: { show_in_slider: true },
      orderBy: { published_at: "desc" },
      take: 5,
      select,
    });
  } catch (error) {
    if (!isPrismaSchemaMismatch(error)) throw error;
    return await prisma.siteUpdate.findMany({
      orderBy: { published_at: "desc" },
      take: 5,
      select,
    });
  }
}

async function fetchAdminSliderArticles() {
  try {
    return await prisma.homeSliderArticle.findMany({
      where: { post: PUBLIC_SLIDER_POST_WHERE },
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
    });
  } catch (error) {
    if (isPrismaSchemaMismatch(error)) return [];
    throw error;
  }
}

async function fetchFallbackSliderArticles(take: number): Promise<HomeSliderItem[]> {
  if (take <= 0) return [];
  const { getLatestPosts } = await import("./posts");
  const posts = await getLatestPosts(take);
  return posts.map((post) => ({
    type: "article" as const,
    id: post.id,
    title: post.title,
    thumbnailUrl: sliderThumbnail(post.thumbnail_url),
    url: `/articles/${post.id}`,
    category: post.category ?? undefined,
  }));
}

function dedupeSliderItems(items: HomeSliderItem[]): HomeSliderItem[] {
  const seenUrls = new Set<string>();
  return items.filter((item) => {
    if (seenUrls.has(item.url)) return false;
    seenUrls.add(item.url);
    return true;
  });
}

/**
 * トップのヒーロースライダー用：運営お知らせを先頭に、続けてADMINが選択した記事を表示
 * 選択記事が無い・取得失敗時は最新の公開記事で補完する
 */
export async function getHomeSliderItems(limit: number = 12): Promise<HomeSliderItem[]> {
  try {
    const [siteUpdates, sliderArticles] = await Promise.all([
      fetchSiteUpdatesForSlider(),
      fetchAdminSliderArticles(),
    ]);

    const siteUpdateItems: HomeSliderItem[] = siteUpdates.map((u) => ({
      type: "site_update" as const,
      id: u.id,
      title: u.title,
      thumbnailUrl: sliderThumbnail(u.thumbnail_url),
      url: u.link || `/site-updates/${u.id}`,
    }));

    let articleItems: HomeSliderItem[] = sliderArticles
      .filter((e) => e.post != null)
      .map((e) => ({
        type: "article" as const,
        id: e.post!.id,
        title: e.post!.title,
        thumbnailUrl: sliderThumbnail(e.post!.thumbnail_url),
        url: `/articles/${e.post!.id}`,
        category: e.post!.category ?? undefined,
      }));

    if (articleItems.length === 0) {
      const remaining = Math.max(0, limit - siteUpdateItems.length);
      articleItems = await fetchFallbackSliderArticles(remaining);
    }

    return dedupeSliderItems([...siteUpdateItems, ...articleItems]).slice(0, limit);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: unknown }).code)
        : "";
    console.error(
      "Failed to get home slider items:",
      msg,
      code ? `(code ${code})` : "",
      error
    );
    try {
      const fallback = await fetchFallbackSliderArticles(limit);
      if (fallback.length > 0) return fallback.slice(0, limit);
    } catch {
      /* ignore secondary failure */
    }
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
