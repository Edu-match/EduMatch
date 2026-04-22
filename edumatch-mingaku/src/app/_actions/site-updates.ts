"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isImportedContent } from "@/lib/imported-content";
import { prisma } from "@/lib/prisma";
import { getCurrentUserRole } from "@/app/_actions/user";
import { notifyAllUsersOfSiteUpdate } from "@/app/_actions/in-app-notifications";
import { blocksToBody, type SiteUpdateContentBlock } from "@/lib/site-update-blocks";

export type SiteUpdateItem = {
  id: string;
  title: string;
  published_at: Date;
  link: string | null;
  wp_post_id: number | null;
};

/**
 * 運営情報（サイト更新情報）を公開日時の新しい順で取得
 */
export async function getSiteUpdates(limit: number = 10): Promise<SiteUpdateItem[]> {
  try {
    const rows = await prisma.siteUpdate.findMany({
      orderBy: { published_at: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        published_at: true,
        link: true,
        wp_post_id: true,
      },
    });
    return rows;
  } catch (error) {
    if (isDbUnavailable(error)) {
      return [];
    }
    console.error("Failed to get site updates:", error);
    return [];
  }
}

/**
 * 運営情報を1件取得（詳細表示用）
 */
export async function getSiteUpdateById(id: string) {
  try {
    return await prisma.siteUpdate.findUnique({
      where: { id },
    });
  } catch (error) {
    if (isDbUnavailable(error)) return null;
    console.error("Failed to get site update:", error);
    return null;
  }
}

/**
 * 運営情報一覧（管理用・ADMIN のみ）
 */
export async function getSiteUpdatesForAdmin(limit: number = 50) {
  const role = await getCurrentUserRole();
  if (role !== "ADMIN") return [];
  try {
    return await prisma.siteUpdate.findMany({
      orderBy: { published_at: "desc" },
      take: limit,
    });
  } catch (error) {
    if (isDbUnavailable(error)) return [];
    console.error("Failed to get site updates for admin:", error);
    return [];
  }
}

export type CreateSiteUpdateInput = {
  title: string;
  body?: string;
  blocks?: SiteUpdateContentBlock[];
  excerpt?: string | null;
  published_at: string; // ISO
  link?: string | null;
  thumbnail_url?: string | null;
  category?: string | null;
};

export type CreateSiteUpdateResult = { success: boolean; id?: string; error?: string };

/**
 * 運営情報を新規作成（ADMIN のみ）
 * blocks を渡した場合は body に変換して保存。未渡しの場合は body をそのまま使用。
 */
export async function createSiteUpdate(input: CreateSiteUpdateInput): Promise<CreateSiteUpdateResult> {
  const role = await getCurrentUserRole();
  if (role !== "ADMIN") {
    return { success: false, error: "管理者権限が必要です" };
  }
  const bodyStr =
    input.body != null && isImportedContent(input.body)
      ? input.body
      : input.blocks != null && input.blocks.length > 0
        ? blocksToBody(input.blocks)
        : (input.body?.trim() ?? "");
  try {
    const row = await prisma.siteUpdate.create({
      data: {
        title: input.title.trim(),
        body: bodyStr,
        excerpt: input.excerpt?.trim() || null,
        published_at: new Date(input.published_at),
        link: input.link?.trim() || null,
        thumbnail_url: input.thumbnail_url?.trim() || null,
        category: input.category?.trim() || null,
      },
    });
    try {
      await notifyAllUsersOfSiteUpdate({
        id: row.id,
        title: row.title,
        link: row.link,
      });
      revalidatePath("/admin/site-updates");
      revalidatePath("/dashboard");
      revalidatePath("/mypage");
      revalidatePath("/notifications");
    } catch (e) {
      console.error("notifyAllUsersOfSiteUpdate error:", e);
    }
    return { success: true, id: row.id };
  } catch (error) {
    console.error("Failed to create site update:", error);
    return { success: false, error: "作成に失敗しました" };
  }
}

export type UpdateSiteUpdateInput = CreateSiteUpdateInput & { id: string };

/**
 * 運営情報を更新（ADMIN のみ）
 */
export async function updateSiteUpdate(input: UpdateSiteUpdateInput): Promise<CreateSiteUpdateResult> {
  const role = await getCurrentUserRole();
  if (role !== "ADMIN") {
    return { success: false, error: "管理者権限が必要です" };
  }
  const bodyStr =
    input.body != null && isImportedContent(input.body)
      ? input.body
      : input.blocks != null && input.blocks.length > 0
        ? blocksToBody(input.blocks)
        : (input.body?.trim() ?? "");
  try {
    await prisma.siteUpdate.update({
      where: { id: input.id },
      data: {
        title: input.title.trim(),
        body: bodyStr,
        excerpt: input.excerpt?.trim() || null,
        published_at: new Date(input.published_at),
        link: input.link?.trim() || null,
        thumbnail_url: input.thumbnail_url?.trim() || null,
        category: input.category?.trim() || null,
        updated_at: new Date(),
      },
    });
    revalidatePath("/admin/site-updates");
    revalidatePath("/dashboard");
    revalidatePath("/mypage");
    return { success: true, id: input.id };
  } catch (error) {
    console.error("Failed to update site update:", error);
    return { success: false, error: "更新に失敗しました" };
  }
}

/**
 * 運営情報を削除（ADMIN のみ）
 */
export async function deleteSiteUpdate(id: string): Promise<{ success: boolean; error?: string }> {
  const role = await getCurrentUserRole();
  if (role !== "ADMIN") {
    return { success: false, error: "管理者権限が必要です" };
  }
  try {
    await prisma.siteUpdate.delete({ where: { id } });
    return { success: true };
  } catch (error) {
    console.error("Failed to delete site update:", error);
    return { success: false, error: "削除に失敗しました" };
  }
}

/**
 * フォーム用：運営情報を削除してからリダイレクト
 */
export async function deleteSiteUpdateAction(formData: FormData) {
  const id = formData.get("id") as string | null;
  const redirectTo = (formData.get("redirectTo") as string) || "/admin/site-updates";
  if (!id) return;
  const result = await deleteSiteUpdate(id);
  if (result.success) redirect(redirectTo);
}

function isDbUnavailable(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /relation.*does not exist|table.*does not exist/i.test(msg) || msg.includes("P2021");
}
