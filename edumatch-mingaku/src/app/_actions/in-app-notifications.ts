"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import {
  SITE_UPDATE_NOTIFICATION_KIND,
  type InAppNotificationRow,
} from "@/lib/in-app-notification-constants";

/**
 * 未配信の運営記事分を、このユーザー向け通知として補完（初回アクセス時に既存記事も届く）
 */
async function ensureUserSiteUpdateNotifications(userId: string): Promise<void> {
  const existing = await prisma.inAppNotification.findMany({
    where: { user_id: userId, kind: SITE_UPDATE_NOTIFICATION_KIND },
    select: { source_id: true },
  });
  const have = new Set(
    existing.map((e) => e.source_id).filter((id): id is string => id != null && id.length > 0)
  );
  const updates = await prisma.siteUpdate.findMany({
    select: { id: true, title: true, link: true },
    orderBy: { published_at: "desc" },
  });
  const toAdd = updates.filter((u) => !have.has(u.id));
  if (toAdd.length === 0) return;

  await prisma.inAppNotification.createMany({
    data: toAdd.map((u) => ({
      user_id: userId,
      kind: SITE_UPDATE_NOTIFICATION_KIND,
      title: `【運営からのお知らせ】${u.title}`,
      link: u.link?.trim() || `/site-updates/${u.id}`,
      source_id: u.id,
    })),
    skipDuplicates: true,
  });
}

function siteUpdateHref(siteUpdateId: string, link: string | null): string {
  const trimmed = link?.trim();
  return trimmed || `/site-updates/${siteUpdateId}`;
}

/**
 * 運営記事を新規公開したとき、全会員へ同一内容のサイト内通知を送る
 */
export async function notifyAllUsersOfSiteUpdate(siteUpdate: {
  id: string;
  title: string;
  link: string | null;
}): Promise<void> {
  const link = siteUpdateHref(siteUpdate.id, siteUpdate.link);
  const title = `【運営からのお知らせ】${siteUpdate.title}`;

  const profiles = await prisma.profile.findMany({ select: { id: true } });
  if (profiles.length === 0) {
    console.warn(
      "[notifyAllUsersOfSiteUpdate] Profile が0件のため通知を作成しません（DBまたは会員データを確認してください）"
    );
    return;
  }

  let inserted = 0;
  const BATCH = 400;
  for (let i = 0; i < profiles.length; i += BATCH) {
    const batch = profiles.slice(i, i + BATCH);
    const result = await prisma.inAppNotification.createMany({
      data: batch.map(({ id }) => ({
        user_id: id,
        kind: SITE_UPDATE_NOTIFICATION_KIND,
        title,
        link,
        source_id: siteUpdate.id,
      })),
      skipDuplicates: true,
    });
    inserted += result.count;
  }
  console.log(
    `[notifyAllUsersOfSiteUpdate] siteUpdate=${siteUpdate.id} 作成=${inserted}/${profiles.length} 件（重複は skip）`
  );
}

/**
 * ヘッダー /api/notifications など、セッション済みユーザーIDが分かっているとき用（requireAuth 不要）
 */
export async function getInAppNotificationsForUserId(
  userId: string,
  limit: number
): Promise<InAppNotificationRow[]> {
  await ensureUserSiteUpdateNotifications(userId);
  return prisma.inAppNotification.findMany({
    where: { user_id: userId },
    orderBy: { created_at: "desc" },
    take: limit,
    select: { id: true, title: true, link: true, read: true, created_at: true },
  });
}

export async function getInAppNotificationsForCurrentUser(
  limit: number
): Promise<InAppNotificationRow[]> {
  const user = await requireAuth();
  return getInAppNotificationsForUserId(user.id, limit);
}

export async function markInAppNotificationRead(notificationId: string): Promise<void> {
  const user = await requireAuth();
  await prisma.inAppNotification.updateMany({
    where: { id: notificationId, user_id: user.id },
    data: { read: true },
  });
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/mypage");
  revalidatePath("/notifications");
}

export async function markInAppNotificationReadFromForm(formData: FormData): Promise<void> {
  const raw = formData.get("id");
  if (typeof raw !== "string" || !raw) return;
  await markInAppNotificationRead(raw);
}
