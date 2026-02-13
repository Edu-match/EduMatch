"use server";

import { prisma } from "@/lib/prisma";

export type ValidatedFavoriteItem = {
  id: string;
  title: string;
  thumbnail: string | null;
  category: string | null;
  type: "article" | "service";
  isDeleted: boolean;
};

/**
 * お気に入りIDリストから、削除されていないアイテムの情報を取得する
 */
export async function validateFavorites(
  articleIds: string[],
  serviceIds: string[]
): Promise<ValidatedFavoriteItem[]> {
  const results: ValidatedFavoriteItem[] = [];

  // 記事を取得（公開済みのもの）
  if (articleIds.length > 0) {
    const articles = await prisma.post.findMany({
      where: {
        id: { in: articleIds },
        OR: [
          { status: "APPROVED" },
          { is_published: true },
        ],
      },
      select: {
        id: true,
        title: true,
        thumbnail_url: true,
      },
    });

    for (const article of articles) {
      results.push({
        id: article.id,
        title: article.title,
        thumbnail: article.thumbnail_url,
        category: null, // Post モデルには category フィールドがない
        type: "article",
        isDeleted: false,
      });
    }
  }

  // サービスを取得（公開済みのもの）
  if (serviceIds.length > 0) {
    const services = await prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        OR: [
          { status: "APPROVED" },
          { is_published: true },
        ],
      },
      select: {
        id: true,
        title: true,
        thumbnail_url: true,
        category: true,
      },
    });

    for (const service of services) {
      results.push({
        id: service.id,
        title: service.title,
        thumbnail: service.thumbnail_url,
        category: service.category,
        type: "service",
        isDeleted: false,
      });
    }
  }

  return results;
}
