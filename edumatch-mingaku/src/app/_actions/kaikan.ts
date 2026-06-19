"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";

/** 来場者がコンテンツに申込→電子チケット(QR)を発行。ログイン不要。 */
export async function applyForKaikanContent(formData: FormData) {
  const contentId = String(formData.get("contentId") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const note = String(formData.get("note") || "").trim();
  if (!contentId || !name) throw new Error("お名前は必須です");

  const content = await prisma.kaikanContent.findUnique({ where: { id: contentId } });
  if (!content || !content.is_published) throw new Error("受付を終了したか、存在しないコンテンツです");

  if (content.capacity != null) {
    const count = await prisma.kaikanApplication.count({
      where: { content_id: contentId, status: { not: "cancelled" } },
    });
    if (count >= content.capacity) throw new Error("定員に達しました");
  }

  // ログインしていれば申込者を紐付け（任意）
  let profileId: string | null = null;
  try {
    const profile = await getCurrentProfile();
    profileId = profile?.id ?? null;
  } catch {
    profileId = null;
  }

  const token = randomUUID().replace(/-/g, "");
  await prisma.kaikanApplication.create({
    data: { content_id: contentId, name, email, note, qr_token: token, profile_id: profileId },
  });
  revalidatePath("/admin/kaikan");
  redirect(`/forum/kaikan/ticket/${token}`);
}

/** 管理者：コンテンツ新設。 */
export async function createKaikanContent(formData: FormData) {
  await requireAdmin();
  const title = String(formData.get("title") || "").trim();
  if (!title) throw new Error("タイトルは必須です");
  const description = String(formData.get("description") || "").trim();
  const location = String(formData.get("location") || "").trim();
  const startsAtRaw = String(formData.get("starts_at") || "").trim();
  const capacityRaw = String(formData.get("capacity") || "").trim();
  await prisma.kaikanContent.create({
    data: {
      title,
      description,
      location,
      starts_at: startsAtRaw ? new Date(startsAtRaw) : null,
      capacity: capacityRaw ? Math.max(0, parseInt(capacityRaw, 10)) || null : null,
      is_published: formData.get("is_published") === "on",
    },
  });
  revalidatePath("/admin/kaikan");
  revalidatePath("/forum/kaikan");
}

/** 管理者：公開/非公開トグル。 */
export async function setKaikanContentPublished(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const next = String(formData.get("next") || "") === "true";
  if (!id) return;
  await prisma.kaikanContent.update({ where: { id }, data: { is_published: next } });
  revalidatePath("/admin/kaikan");
  revalidatePath("/forum/kaikan");
}

/** 管理者：受付チェックイン（QR読み取り先）。 */
export async function checkInKaikanApplication(formData: FormData) {
  await requireAdmin();
  const token = String(formData.get("token") || "");
  if (!token) throw new Error("トークンが不正です");
  const app = await prisma.kaikanApplication.findUnique({ where: { qr_token: token } });
  if (!app) throw new Error("申込が見つかりません");
  await prisma.kaikanApplication.update({
    where: { qr_token: token },
    data: { status: "checked_in", checked_in_at: new Date() },
  });
  revalidatePath(`/admin/kaikan/checkin/${token}`);
  revalidatePath("/admin/kaikan");
}
