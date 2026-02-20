"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type ReviewData = {
  id: string;
  service_id: string;
  user_id: string | null;
  author_name: string;
  rating: number | null;
  body: string;
  is_approved: boolean;
  created_at: Date;
};

/** マイページ用：自分の口コミ（サービス名付き） */
export type MyReviewData = ReviewData & {
  service: { id: string; title: string };
};

/**
 * サービスの承認済み口コミ一覧を取得
 */
export async function getServiceReviews(serviceId: string): Promise<ReviewData[]> {
  try {
    const reviews = await prisma.review.findMany({
      where: {
        service_id: serviceId,
        is_approved: true,
      },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        service_id: true,
        user_id: true,
        author_name: true,
        rating: true,
        body: true,
        is_approved: true,
        created_at: true,
      },
    });
    return reviews;
  } catch (error) {
    console.error("Failed to get service reviews:", error);
    return [];
  }
}

/**
 * ログインユーザーの口コミ一覧を取得（マイページ用）
 */
export async function getMyReviews(): Promise<MyReviewData[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  try {
    const reviews = await prisma.review.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: "desc" },
      include: {
        service: { select: { id: true, title: true } },
      },
    });
    return reviews as MyReviewData[];
  } catch (error) {
    console.error("Failed to get my reviews:", error);
    return [];
  }
}

/**
 * 口コミを投稿する（ログインユーザーのみ）
 * 表示名はプロフィール名またはメールの@前を使用
 */
export async function createReview(
  serviceId: string,
  data: {
    rating: number | null;
    body: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "口コミを投稿するにはログインしてください。" };
    }

    if (!data.body || data.body.trim().length < 10) {
      return { success: false, error: "口コミは10文字以上で入力してください" };
    }
    if (
      data.rating !== null &&
      (data.rating < 1 || data.rating > 5 || !Number.isInteger(data.rating))
    ) {
      return { success: false, error: "評価は1〜5の整数で入力してください" };
    }

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { id: true },
    });
    if (!service) {
      return { success: false, error: "サービスが見つかりません" };
    }

    const profile = await getCurrentProfile();
    const authorName =
      (profile?.name && profile.name.trim()) || user.email?.split("@")[0] || "ユーザー";

    await prisma.review.create({
      data: {
        service_id: serviceId,
        user_id: user.id,
        author_name: authorName,
        rating: data.rating,
        body: data.body.trim(),
        is_approved: true,
      },
    });

    await prisma.service.update({
      where: { id: serviceId },
      data: { review_count: { increment: 1 } },
    });

    revalidatePath(`/services/${serviceId}`);
    revalidatePath("/mypage");
    return { success: true };
  } catch (error) {
    console.error("Failed to create review:", error);
    return { success: false, error: "口コミの投稿に失敗しました。もう一度お試しください。" };
  }
}

/**
 * 自分の口コミを削除する
 */
export async function deleteReview(reviewId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "ログインしてください。" };
    }

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { id: true, user_id: true, service_id: true },
    });

    if (!review) {
      return { success: false, error: "口コミが見つかりません。" };
    }
    if (review.user_id !== user.id) {
      return { success: false, error: "この口コミを削除する権限がありません。" };
    }

    await prisma.review.delete({ where: { id: reviewId } });
    await prisma.service.update({
      where: { id: review.service_id },
      data: { review_count: { decrement: 1 } },
    });

    revalidatePath("/mypage");
    revalidatePath(`/services/${review.service_id}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete review:", error);
    return { success: false, error: "削除に失敗しました。" };
  }
}
