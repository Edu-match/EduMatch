import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import {
  getPendingPostsFromSupabase,
  getPendingServicesFromSupabase,
} from "@/lib/supabase-pending-approvals";

export const dynamic = "force-dynamic";

export type PendingApprovalItem = {
  type: "post" | "service";
  id: string;
  title: string;
};

/**
 * 管理者向け: 承認待ちの記事・サービス一覧を返す（通知ベル用・Supabase連携）
 */
export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "ADMIN") {
    return NextResponse.json(
      { posts: 0, services: 0, items: [] as PendingApprovalItem[] },
      { status: 200 }
    );
  }

  try {
    const [posts, services] = await Promise.all([
      getPendingPostsFromSupabase(),
      getPendingServicesFromSupabase(),
    ]);
    const items: PendingApprovalItem[] = [
      ...posts.map((p) => ({ type: "post" as const, id: p.id, title: p.title })),
      ...services.map((s) => ({ type: "service" as const, id: s.id, title: s.title })),
    ];
    return NextResponse.json({
      posts: posts.length,
      services: services.length,
      items,
    });
  } catch (e) {
    console.error("Error fetching pending approvals:", e);
    return NextResponse.json(
      { posts: 0, services: 0, items: [] as PendingApprovalItem[] },
      { status: 200 }
    );
  }
}
