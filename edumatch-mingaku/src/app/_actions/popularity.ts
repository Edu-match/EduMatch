"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/**
 * サービスのお気に入り数をインクリメント
 */
export async function incrementServiceFavoriteCount(serviceId: string) {
  try {
    await prisma.service.update({
      where: { id: serviceId },
      data: { favorite_count: { increment: 1 } },
    });
  } catch (error) {
    console.error("Failed to increment service favorite count:", error);
  }
}

/**
 * サービスのお気に入り数をデクリメント
 */
export async function decrementServiceFavoriteCount(serviceId: string) {
  try {
    await prisma.service.update({
      where: { id: serviceId },
      data: { favorite_count: { decrement: 1 } },
    });
  } catch (error) {
    console.error("Failed to decrement service favorite count:", error);
  }
}

/**
 * 記事のお気に入り数をインクリメント
 */
export async function incrementArticleFavoriteCount(articleId: string) {
  try {
    await prisma.post.update({
      where: { id: articleId },
      data: { favorite_count: { increment: 1 } },
    });
  } catch (error) {
    console.error("Failed to increment article favorite count:", error);
  }
}

/**
 * 記事のお気に入り数をデクリメント
 */
export async function decrementArticleFavoriteCount(articleId: string) {
  try {
    await prisma.post.update({
      where: { id: articleId },
      data: { favorite_count: { decrement: 1 } },
    });
  } catch (error) {
    console.error("Failed to decrement article favorite count:", error);
  }
}

/**
 * サービスの資料請求リスト追加数をインクリメント
 */
export async function incrementServiceRequestCount(serviceId: string) {
  try {
    await prisma.service.update({
      where: { id: serviceId },
      data: { request_count: { increment: 1 } },
    });
  } catch (error) {
    console.error("Failed to increment service request count:", error);
  }
}

/**
 * サービスの資料請求リスト追加数をデクリメント
 */
export async function decrementServiceRequestCount(serviceId: string) {
  try {
    await prisma.service.update({
      where: { id: serviceId },
      data: { request_count: { decrement: 1 } },
    });
  } catch (error) {
    console.error("Failed to decrement service request count:", error);
  }
}

/**
 * 人気のサービスを取得（お気に入り数 + 資料請求数の合計でソート）
 * 未ログイン時は会員限定サービスを除外
 */
export async function getPopularServicesByEngagement(limit: number = 10) {
  try {
    // 認証状態をチェック（会員限定サービスのフィルタリング用）
    const user = await getCurrentUser();

    const where = !user
      ? {
          AND: [
            { OR: [{ status: "APPROVED" as const }, { is_published: true }] },
            { is_member_only: false },
          ],
        }
      : { OR: [{ status: "APPROVED" as const }, { is_published: true }] };

    const services = await prisma.service.findMany({
      where,
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
          },
        },
      },
      take: limit * 2, // 多めに取得してソート
    });

    // お気に入り数 + 資料請求数でソート
    const sortedServices = services
      .sort((a, b) => {
        const scoreA = a.favorite_count + a.request_count;
        const scoreB = b.favorite_count + b.request_count;
        return scoreB - scoreA;
      })
      .slice(0, limit);

    return sortedServices.map((s) => ({
      ...s,
      provider: s.provider || { id: s.provider_id, name: "提供者", email: "", avatar_url: null },
    }));
  } catch (error) {
    console.error("Failed to get popular services:", error);
    return [];
  }
}

/**
 * 人気の記事を取得（お気に入り数でソート）
 * 未ログイン時は会員限定記事を除外
 */
export async function getPopularArticlesByEngagement(limit: number = 10) {
  try {
    // 認証状態をチェック（会員限定記事のフィルタリング用）
    const user = await getCurrentUser();

    const where = !user
      ? {
          AND: [
            { OR: [{ status: "APPROVED" as const }, { is_published: true }] },
            { is_member_only: false },
          ],
        }
      : { OR: [{ status: "APPROVED" as const }, { is_published: true }] };

    const articles = await prisma.post.findMany({
      where,
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            avatar_url: true,
          },
        },
      },
      orderBy: {
        favorite_count: "desc",
      },
      take: limit,
    });

    return articles.map((article) => ({
      ...article,
      provider: article.provider || { id: article.provider_id, name: "投稿者", avatar_url: null },
    }));
  } catch (error) {
    console.error("Failed to get popular articles:", error);
    return [];
  }
}
