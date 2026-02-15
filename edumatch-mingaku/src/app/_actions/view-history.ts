"use server";

import { prisma } from "@/lib/prisma";

export type RecentViewItem = {
  id: string;
  title: string;
  type: "article" | "service";
  image: string | null;
  viewedAt: Date;
};

/**
 * 記事またはサービスを閲覧したときの記録。
 * 同じコンテンツを再度見た場合は viewed_at だけ更新する。
 * @param userId ログイン中ユーザーのID（Profile.id）
 * @param contentType "ARTICLE" | "SERVICE"
 * @param contentId Post.id または Service.id
 */
export async function recordView(
  userId: string,
  contentType: "ARTICLE" | "SERVICE",
  contentId: string
): Promise<void> {
  try {
    // ユーザー存在チェック
    const userExists = await prisma.profile.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!userExists) {
      console.error(`recordView: User ${userId} does not exist`);
      return;
    }

    await prisma.viewHistory.upsert({
      where: {
        user_id_content_type_content_id: {
          user_id: userId,
          content_type: contentType,
          content_id: contentId,
        },
      },
      create: {
        user_id: userId,
        content_type: contentType,
        content_id: contentId,
      },
      update: { viewed_at: new Date() },
    });
  } catch (error) {
    console.error("recordView error:", error);
  }
}

/**
 * ユーザーの直近の閲覧履歴を取得（閲覧時刻の新しい順）。
 * 削除済みの記事・サービスは除外する。
 * @param userId ログイン中ユーザーのID
 * @param limit 最大件数（デフォルト: 10）
 */
export async function getRecentViewHistory(
  userId: string,
  limit: number = 10
): Promise<RecentViewItem[]> {
  try {
    const rows = await prisma.viewHistory.findMany({
      where: { user_id: userId },
      orderBy: { viewed_at: "desc" },
      take: limit * 2, // 削除分を考慮して多めに取得
    });

    const result: RecentViewItem[] = [];

    for (const row of rows) {
      if (result.length >= limit) break;

      if (row.content_type === "ARTICLE") {
        const post = await prisma.post.findFirst({
          where: {
            id: row.content_id,
            OR: [
              { status: "APPROVED" },
              { is_published: true },
            ],
          },
          select: { id: true, title: true, thumbnail_url: true },
        });
        if (post) {
          result.push({
            id: post.id,
            title: post.title,
            type: "article",
            image: post.thumbnail_url,
            viewedAt: row.viewed_at,
          });
        }
      } else {
        const service = await prisma.service.findFirst({
          where: {
            id: row.content_id,
            OR: [
              { status: "APPROVED" },
              { is_published: true },
            ],
          },
          select: { id: true, title: true, thumbnail_url: true },
        });
        if (service) {
          result.push({
            id: service.id,
            title: service.title,
            type: "service",
            image: service.thumbnail_url,
            viewedAt: row.viewed_at,
          });
        }
      }
    }

    return result;
  } catch (error) {
    console.error("getRecentViewHistory error:", error);
    return [];
  }
}
