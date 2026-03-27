"use server";

import { getCurrentProfile } from "@/lib/auth";
import {
  getPendingPostsFromSupabase,
  getPendingServicesFromSupabase,
} from "@/lib/supabase-pending-approvals";
import { getInAppNotificationsForUserId } from "@/app/_actions/in-app-notifications";

export type NotificationItem = {
  id: string;
  type: "approval_request" | "system" | "material_request" | "site_update";
  category: string; // 表示用カテゴリ（例: 記事の承認申請）
  title: string;
  body?: string;
  href?: string;
  createdAt: string;
  /** 未読バッジ用（undefined は未読扱い） */
  read?: boolean;
  meta?: Record<string, unknown>;
};

/**
 * 汎用通知取得 - 承認申請だけでなく様々な種類に対応
 */
export async function getNotifications(): Promise<NotificationItem[]> {
  const profile = await getCurrentProfile();
  if (!profile) return [];

  const notifications: NotificationItem[] = [];

  if (profile.role === "ADMIN") {
    const [posts, services] = await Promise.all([
      getPendingPostsFromSupabase(),
      getPendingServicesFromSupabase(),
    ]);
    for (const p of posts) {
      notifications.push({
        id: `approval-post-${p.id}`,
        type: "approval_request",
        category: "記事の承認申請",
        title: `「${p.title}」の承認申請が届いています`,
        body: `${p.provider?.name ?? "投稿者"} から申請`,
        href: "/admin/approvals",
        createdAt: p.submitted_at ?? p.id,
        read: false,
        meta: { contentType: "post", contentId: p.id },
      });
    }
    for (const s of services) {
      notifications.push({
        id: `approval-service-${s.id}`,
        type: "approval_request",
        category: "サービスの承認申請",
        title: `「${s.title}」の承認申請が届いています`,
        body: `${s.provider?.name ?? "提供者"} から申請`,
        href: "/admin/approvals",
        createdAt: s.submitted_at ?? s.id,
        read: false,
        meta: { contentType: "service", contentId: s.id },
      });
    }
  }

  try {
    const inApp = await getInAppNotificationsForUserId(profile.id, 30);
    for (const row of inApp) {
      const href = row.link?.trim() || "/notifications";
      notifications.push({
        id: `inapp-${row.id}`,
        type: "site_update",
        category: "運営お知らせ",
        title: row.title,
        href,
        createdAt: row.created_at.toISOString(),
        read: row.read,
      });
    }
  } catch (e) {
    console.error("[getNotifications] InAppNotification の取得に失敗:", e);
  }

  notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return notifications;
}
