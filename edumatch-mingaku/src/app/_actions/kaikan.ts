"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";

/** ログイン中アカウントでコンテンツに申込→電子チケット(QR)を発行。氏名/メールはアカウント情報を使用。 */
export async function applyForKaikanContent(formData: FormData) {
  const contentId = String(formData.get("contentId") || "").trim();
  const note = String(formData.get("note") || "").trim();
  if (!contentId) throw new Error("コンテンツが不正です");

  // 申込にはログイン必須。氏名・メールはアカウント登録情報を使う。
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("申込にはログインが必要です");

  const content = await prisma.kaikanContent.findUnique({ where: { id: contentId } });
  if (!content || !content.is_published) throw new Error("受付を終了したか、存在しないコンテンツです");

  // 同一アカウントの二重申込を防ぐ：既存があればそのチケットへ。
  const existing = await prisma.kaikanApplication.findFirst({
    where: { content_id: contentId, profile_id: profile.id, status: { not: "cancelled" } },
    select: { qr_token: true, ticket_token: true },
  });
  if (existing) redirect(`/forum/kaikan/ticket/${existing.ticket_token ?? existing.qr_token}`);

  if (content.capacity != null) {
    const count = await prisma.kaikanApplication.count({
      where: { content_id: contentId, status: { not: "cancelled" } },
    });
    if (count >= content.capacity) throw new Error("定員に達しました");
  }

  const token = randomUUID().replace(/-/g, "");
  await prisma.kaikanApplication.create({
    data: {
      content_id: contentId,
      name: profile.name,
      email: profile.email ?? "",
      note,
      qr_token: token,
      ticket_token: token,
      profile_id: profile.id,
    },
  });
  revalidatePath("/admin/kaikan");
  redirect(`/forum/kaikan/ticket/${token}`);
}

/** 複数コンテンツをまとめて申込→1枚のチケット(共有ticket_token)に集約。受付はセッション単位。 */
export async function applyForKaikanContents(formData: FormData) {
  const contentIds = formData.getAll("contentId").map(String).map((s) => s.trim()).filter(Boolean);
  const note = String(formData.get("note") || "").trim();
  if (contentIds.length === 0) throw new Error("コンテンツを1つ以上選んでください");

  const profile = await getCurrentProfile();
  if (!profile) throw new Error("申込にはログインが必要です");

  // 既存の自分の申込（このアカウント）を見て、チケットを流用しつつ二重を避ける
  const existingApps = await prisma.kaikanApplication.findMany({
    where: { profile_id: profile.id, status: { not: "cancelled" } },
    select: { content_id: true, ticket_token: true },
  });
  const alreadyIds = new Set(existingApps.map((a) => a.content_id));
  const ticketToken = existingApps.find((a) => a.ticket_token)?.ticket_token ?? randomUUID().replace(/-/g, "");

  const toAdd = contentIds.filter((id) => !alreadyIds.has(id));
  const contents = await prisma.kaikanContent.findMany({ where: { id: { in: toAdd }, is_published: true } });
  for (const c of contents) {
    if (c.capacity != null) {
      const count = await prisma.kaikanApplication.count({ where: { content_id: c.id, status: { not: "cancelled" } } });
      if (count >= c.capacity) continue; // 満員は除外
    }
    await prisma.kaikanApplication.create({
      data: {
        content_id: c.id,
        name: profile.name,
        email: profile.email ?? "",
        note,
        qr_token: randomUUID().replace(/-/g, ""),
        ticket_token: ticketToken,
        profile_id: profile.id,
      },
    });
  }
  revalidatePath("/admin/kaikan");
  redirect(`/forum/kaikan/ticket/${ticketToken}`);
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
