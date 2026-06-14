import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 井戸端 管理画面の上部集計。
 * 以前は管理画面が全部屋ぶんの投稿を個別fetch（N+1で約117リクエスト→1分でクラッシュ）して
 * クライアントで数えていた。ここでは数本の count に置き換えて即時・軽量に返す。
 */
export async function GET() {
  try {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [rooms, total, pinned, hidden, noReply] = await Promise.all([
      prisma.forumRoom.count(),
      prisma.forumPost.count(),
      prisma.forumPost.count({ where: { is_pinned: true, is_hidden: false } }),
      prisma.forumPost.count({ where: { is_hidden: true } }),
      // 返信待ち = 返信が1件も付いていない（非表示を除く）投稿
      prisma.forumPost.count({ where: { is_hidden: false, replies: { none: {} } } }),
    ]);

    return NextResponse.json({ rooms, total, pinned, hidden, noReply });
  } catch (err) {
    console.error("[admin/forum/stats GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
