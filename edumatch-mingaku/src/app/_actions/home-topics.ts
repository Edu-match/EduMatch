"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserRole } from "./user";
import type { HomeNewsTab } from "@prisma/client";

export type HomeTopicsAdminPost = {
  id: string;
  title: string;
  category: string;
  created_at: Date;
  home_news_tab: HomeNewsTab;
};

/** ADMIN 用: トップページニュースタブ用の記事一覧 */
export async function getHomeTopicsPostsForAdmin(limit: number = 100): Promise<HomeTopicsAdminPost[]> {
  const role = await getCurrentUserRole();
  if (role !== "ADMIN") return [];

  const posts = await prisma.post.findMany({
    where: {
      OR: [{ status: "APPROVED" }, { is_published: true }],
    },
    orderBy: { created_at: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      category: true,
      created_at: true,
      home_news_tab: true,
    },
  });

  return posts;
}

type UpdateResult = { success: boolean; error?: string };

/** ADMIN 用: 単一記事のニュースタブ分類を更新 */
export async function updateHomeNewsTab(postId: string, tab: HomeNewsTab): Promise<UpdateResult> {
  const role = await getCurrentUserRole();
  if (role !== "ADMIN") {
    return { success: false, error: "管理者権限が必要です" };
  }

  try {
    await prisma.post.update({
      where: { id: postId },
      data: { home_news_tab: tab },
    });
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to update home_news_tab:", error);
    return { success: false, error: "更新に失敗しました" };
  }
}

/** フォーム用: ニュースタブ分類を更新するサーバーアクション */
export async function updateHomeNewsTabAction(formData: FormData) {
  const id = formData.get("id") as string | null;
  const tab = formData.get("tab") as HomeNewsTab | null;
  if (!id || !tab) return;
  await updateHomeNewsTab(id, tab);
}

/** クライアント用: 1件更新して結果を返す（トースト表示用） */
export async function setHomeNewsTabAction(
  postId: string,
  tab: HomeNewsTab
): Promise<UpdateResult> {
  return updateHomeNewsTab(postId, tab);
}

export type BulkUpdateItem = { id: string; tab: HomeNewsTab };

/** 一括でニュースタブ分類を更新（ADMIN 用） */
export async function updateHomeNewsTabBulkAction(
  updates: BulkUpdateItem[]
): Promise<{ success: boolean; count?: number; error?: string }> {
  const role = await getCurrentUserRole();
  if (role !== "ADMIN") {
    return { success: false, error: "管理者権限が必要です" };
  }
  if (!updates.length) {
    return { success: true, count: 0 };
  }
  try {
    await prisma.$transaction(
      updates.map(({ id, tab }) =>
        prisma.post.update({
          where: { id },
          data: { home_news_tab: tab },
        })
      )
    );
    revalidatePath("/");
    return { success: true, count: updates.length };
  } catch (error) {
    console.error("Failed to update home_news_tab bulk:", error);
    return { success: false, error: "一括更新に失敗しました" };
  }
}

