import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * 管理者向け: 承認待ちの記事・サービス件数を返す（通知ベル用）
 */
export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "ADMIN") {
    return NextResponse.json({ posts: 0, services: 0 }, { status: 200 });
  }

  try {
    const [posts, services] = await Promise.all([
      prisma.post.count({ where: { status: "PENDING" } }),
      prisma.service.count({ where: { status: "PENDING" } }),
    ]);
    return NextResponse.json({ posts, services });
  } catch (e) {
    console.error("Error fetching pending approvals count:", e);
    return NextResponse.json({ posts: 0, services: 0 }, { status: 200 });
  }
}
