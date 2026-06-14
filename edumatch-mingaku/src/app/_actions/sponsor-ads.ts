"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SponsorPlacement } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { getCurrentUserRole } from "@/app/_actions/user";
import { logActivity } from "@/app/_actions/activity-log";

export type SponsorAdItem = {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  link_url: string;
  placement: SponsorPlacement;
  is_active: boolean;
  position: number;
  starts_at: Date | null;
  ends_at: Date | null;
  click_count: number;
  created_at: Date;
  updated_at: Date;
};

function isDbUnavailable(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /relation.*does not exist|table.*does not exist/i.test(msg) || msg.includes("P2021");
}

/**
 * 公開中のスポンサーPRを取得する（トップページ等で使用）。
 * is_active かつ掲載期間内のものを position 昇順で返す。
 */
export async function getActiveSponsorAds(
  placement: SponsorPlacement,
  limit = 5
): Promise<SponsorAdItem[]> {
  const now = new Date();
  try {
    const rows = await prisma.sponsorAd.findMany({
      where: {
        placement,
        is_active: true,
        AND: [
          { OR: [{ starts_at: null }, { starts_at: { lte: now } }] },
          { OR: [{ ends_at: null }, { ends_at: { gte: now } }] },
        ],
      },
      orderBy: [{ position: "asc" }, { created_at: "desc" }],
      take: limit,
    });
    return rows;
  } catch (error) {
    if (isDbUnavailable(error)) return [];
    console.error("Failed to get active sponsor ads:", error);
    return [];
  }
}

/**
 * 管理用：全スポンサーPRを取得（ADMIN のみ）
 */
export async function getSponsorAdsForAdmin(): Promise<SponsorAdItem[]> {
  const role = await getCurrentUserRole();
  if (role !== "ADMIN") return [];
  try {
    return await prisma.sponsorAd.findMany({
      orderBy: [{ placement: "asc" }, { position: "asc" }, { created_at: "desc" }],
    });
  } catch (error) {
    if (isDbUnavailable(error)) return [];
    console.error("Failed to get sponsor ads for admin:", error);
    return [];
  }
}

export type SponsorAdInput = {
  title: string;
  description?: string | null;
  image_url: string;
  link_url: string;
  placement: SponsorPlacement;
  is_active: boolean;
  position?: number;
  starts_at?: string | null; // ISO
  ends_at?: string | null; // ISO
};

export type SponsorAdMutationResult = { success: boolean; id?: string; error?: string };

function validateInput(input: SponsorAdInput): string | null {
  if (!input.title?.trim()) return "タイトルを入力してください";
  if (!input.image_url?.trim()) return "バナー画像をアップロードしてください";
  if (!input.link_url?.trim()) return "リンク先URLを入力してください";
  try {
    const u = new URL(input.link_url.trim());
    if (!/^https?:$/.test(u.protocol)) return "リンク先は http(s) のURLにしてください";
  } catch {
    return "リンク先URLの形式が正しくありません";
  }
  if (input.starts_at && input.ends_at) {
    if (new Date(input.starts_at) > new Date(input.ends_at)) {
      return "掲載終了日時は開始日時より後にしてください";
    }
  }
  return null;
}

/** スポンサーPRを新規作成（ADMIN のみ） */
export async function createSponsorAd(
  input: SponsorAdInput
): Promise<SponsorAdMutationResult> {
  const [role, actor] = await Promise.all([getCurrentUserRole(), getCurrentProfile()]);
  if (role !== "ADMIN") return { success: false, error: "管理者権限が必要です" };

  const validationError = validateInput(input);
  if (validationError) return { success: false, error: validationError };

  try {
    const row = await prisma.sponsorAd.create({
      data: {
        title: input.title.trim(),
        description: input.description?.trim() || null,
        image_url: input.image_url.trim(),
        link_url: input.link_url.trim(),
        placement: input.placement,
        is_active: input.is_active,
        position: input.position ?? 0,
        starts_at: input.starts_at ? new Date(input.starts_at) : null,
        ends_at: input.ends_at ? new Date(input.ends_at) : null,
      },
    });
    revalidatePath("/");
    revalidatePath("/admin/sponsors");
    void logActivity({
      actorId: actor?.id,
      actorName: actor?.name ?? "管理者",
      action: "CREATE",
      targetType: "SPONSOR_AD",
      targetId: row.id,
      targetTitle: row.title,
    });
    return { success: true, id: row.id };
  } catch (error) {
    console.error("Failed to create sponsor ad:", error);
    return { success: false, error: "作成に失敗しました" };
  }
}

export type UpdateSponsorAdInput = SponsorAdInput & { id: string };

/** スポンサーPRを更新（ADMIN のみ） */
export async function updateSponsorAd(
  input: UpdateSponsorAdInput
): Promise<SponsorAdMutationResult> {
  const [role, actor] = await Promise.all([getCurrentUserRole(), getCurrentProfile()]);
  if (role !== "ADMIN") return { success: false, error: "管理者権限が必要です" };

  const validationError = validateInput(input);
  if (validationError) return { success: false, error: validationError };

  try {
    await prisma.sponsorAd.update({
      where: { id: input.id },
      data: {
        title: input.title.trim(),
        description: input.description?.trim() || null,
        image_url: input.image_url.trim(),
        link_url: input.link_url.trim(),
        placement: input.placement,
        is_active: input.is_active,
        position: input.position ?? 0,
        starts_at: input.starts_at ? new Date(input.starts_at) : null,
        ends_at: input.ends_at ? new Date(input.ends_at) : null,
      },
    });
    revalidatePath("/");
    revalidatePath("/admin/sponsors");
    void logActivity({
      actorId: actor?.id,
      actorName: actor?.name ?? "管理者",
      action: "UPDATE",
      targetType: "SPONSOR_AD",
      targetId: input.id,
      targetTitle: input.title.trim(),
    });
    return { success: true, id: input.id };
  } catch (error) {
    console.error("Failed to update sponsor ad:", error);
    return { success: false, error: "更新に失敗しました" };
  }
}

/** 表示ON/OFFをトグル（ADMIN のみ） */
export async function toggleSponsorAd(
  id: string,
  isActive: boolean
): Promise<SponsorAdMutationResult> {
  const role = await getCurrentUserRole();
  if (role !== "ADMIN") return { success: false, error: "管理者権限が必要です" };
  try {
    await prisma.sponsorAd.update({
      where: { id },
      data: { is_active: isActive },
    });
    revalidatePath("/");
    revalidatePath("/admin/sponsors");
    return { success: true, id };
  } catch (error) {
    console.error("Failed to toggle sponsor ad:", error);
    return { success: false, error: "更新に失敗しました" };
  }
}

/** スポンサーPRを削除（ADMIN のみ） */
export async function deleteSponsorAd(
  id: string
): Promise<SponsorAdMutationResult> {
  const [role, actor] = await Promise.all([getCurrentUserRole(), getCurrentProfile()]);
  if (role !== "ADMIN") return { success: false, error: "管理者権限が必要です" };
  try {
    const row = await prisma.sponsorAd.findUnique({
      where: { id },
      select: { title: true },
    });
    await prisma.sponsorAd.delete({ where: { id } });
    revalidatePath("/");
    revalidatePath("/admin/sponsors");
    void logActivity({
      actorId: actor?.id,
      actorName: actor?.name ?? "管理者",
      action: "DELETE",
      targetType: "SPONSOR_AD",
      targetId: id,
      targetTitle: row?.title ?? id,
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to delete sponsor ad:", error);
    return { success: false, error: "削除に失敗しました" };
  }
}

/** フォーム用：削除してから一覧へリダイレクト */
export async function deleteSponsorAdAction(formData: FormData) {
  const id = formData.get("id") as string | null;
  if (!id) return;
  const result = await deleteSponsorAd(id);
  if (result.success) redirect("/admin/sponsors");
}
