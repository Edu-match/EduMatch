"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth";
import { getForumAuthorRoleForUser } from "@/lib/forum-author-profile";
import { revalidatePath } from "next/cache";

/**
 * 記事(Post)への口コミ＋返信スレッド。
 * Review モデルを service/post 両対応・自己参照スレッドに拡張して再利用する。
 * 返信は AI（汎用ファシリテーター）/ AIペルソナ（記事著者本人）/ 人間 の3種。
 */

export type ReviewReply = {
  id: string;
  author_name: string;
  author_role: string | null;
  body: string;
  created_at: Date;
  is_ai: boolean;
};

export type ArticleReview = {
  id: string;
  user_id: string | null;
  author_name: string;
  author_role: string | null;
  rating: number | null;
  body: string;
  created_at: Date;
  replies: ReviewReply[];
};

/** 記事の承認済み口コミ一覧（返信スレッド付き・新しい順） */
export async function getArticleReviews(postId: string): Promise<ArticleReview[]> {
  const rows = await prisma.review
    .findMany({
      where: { post_id: postId, parent_id: null, is_approved: true },
      orderBy: { created_at: "desc" },
      include: {
        replies: {
          where: { is_approved: true },
          orderBy: { created_at: "asc" },
        },
      },
    })
    .catch((e: unknown) => {
      // マイグレーション未適用（post_id/parent_id 等が無い）時はレビュー欄を空扱いにする
      if (e && typeof e === "object" && "code" in e && e.code === "P2022") return [];
      throw e;
    });

  return rows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    author_name: r.author_name,
    author_role: r.author_role,
    rating: r.rating,
    body: r.body,
    created_at: r.created_at,
    replies: r.replies.map((rp) => ({
      id: rp.id,
      author_name: rp.author_name,
      author_role: rp.author_role,
      body: rp.body,
      created_at: rp.created_at,
      is_ai: rp.user_id === null,
    })),
  }));
}

/** 記事に口コミを投稿する（ログイン必須・立場バッジ自動付与） */
export async function createArticleReview(
  postId: string,
  data: { rating: number | null; body: string }
): Promise<{ success: boolean; error?: string; reviewId?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "口コミを投稿するにはログインしてください。" };

    const body = data.body?.trim() ?? "";
    if (body.length < 10) return { success: false, error: "口コミは10文字以上で入力してください" };
    if (body.length > 2000) return { success: false, error: "口コミは2000文字以内で入力してください" };
    if (
      data.rating !== null &&
      (data.rating < 1 || data.rating > 5 || !Number.isInteger(data.rating))
    ) {
      return { success: false, error: "評価は1〜5の整数で入力してください" };
    }

    const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
    if (!post) return { success: false, error: "記事が見つかりません" };

    const profile = await getCurrentProfile();
    const authorName =
      (profile?.name && profile.name.trim()) || user.email?.split("@")[0] || "ユーザー";
    const authorRole = await getForumAuthorRoleForUser(user.id).catch(() => null);

    const review = await prisma.review.create({
      data: {
        post_id: postId,
        user_id: user.id,
        author_name: authorName,
        author_role: authorRole,
        rating: data.rating,
        body,
        is_approved: true,
      },
      select: { id: true },
    });

    revalidatePath(`/articles/${postId}`);
    revalidatePath("/mypage");
    return { success: true, reviewId: review.id };
  } catch (error) {
    console.error("Failed to create article review:", error);
    return { success: false, error: "口コミの投稿に失敗しました。もう一度お試しください。" };
  }
}

/** 口コミへの人間返信（立場バッジ付き） */
export async function createArticleReviewReply(
  parentReviewId: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "返信するにはログインしてください。" };

    const text = body?.trim() ?? "";
    if (text.length < 1) return { success: false, error: "返信を入力してください" };
    if (text.length > 2000) return { success: false, error: "返信は2000文字以内で入力してください" };

    const parent = await prisma.review.findUnique({
      where: { id: parentReviewId },
      select: { id: true, post_id: true },
    });
    if (!parent?.post_id) return { success: false, error: "返信先の口コミが見つかりません" };

    const profile = await getCurrentProfile();
    const authorName =
      (profile?.name && profile.name.trim()) || user.email?.split("@")[0] || "ユーザー";
    const authorRole = await getForumAuthorRoleForUser(user.id).catch(() => null);

    await prisma.review.create({
      data: {
        post_id: parent.post_id,
        parent_id: parent.id,
        user_id: user.id,
        author_name: authorName,
        author_role: authorRole,
        body: text,
        is_approved: true,
      },
    });

    revalidatePath(`/articles/${parent.post_id}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to create review reply:", error);
    return { success: false, error: "返信の投稿に失敗しました。もう一度お試しください。" };
  }
}
