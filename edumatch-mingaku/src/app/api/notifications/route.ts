import { NextResponse } from "next/server";
import { getNotifications } from "@/lib/notifications";

export const dynamic = "force-dynamic";

/**
 * 汎用通知API - 承認申請だけでなく様々な種類の通知を返す
 */
export async function GET() {
  const notifications = await getNotifications();
  return NextResponse.json({
    notifications: notifications.slice(0, 20),
    unreadCount: notifications.length,
  });
}
