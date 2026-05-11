import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { getNotifications } from "@/lib/notifications";

export const dynamic = "force-dynamic";

/**
 * 汎用通知API - 承認申請だけでなく様々な種類の通知を返す
 */
export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json(
      { notifications: [], unreadCount: 0 },
      { status: 401 }
    );
  }

  const notifications = await getNotifications();
  const unreadCount = notifications.filter((n) => n.read !== true).length;
  return NextResponse.json({
    notifications: notifications.slice(0, 20),
    unreadCount,
  });
}
