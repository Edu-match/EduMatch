import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * トップマップの自動吹き出し用：井戸端コミュニティルームの最新コメントを軽量に返す。
 * 来場者向けの「生きている感」演出に使う（本文・ニックネーム・肩書き・room_id）。
 */
export async function GET() {
  try {
    const posts = await prisma.forumPost.findMany({
      where: {
        room_id: { contains: "--community--" },
        is_hidden: false,
        NOT: { body: { startsWith: "[AI]" } },
      },
      orderBy: { created_at: "desc" },
      take: 80,
      select: {
        room_id: true,
        body: true,
        author_name: true,
        author_role: true,
      },
    });
    return NextResponse.json({
      comments: posts.map((p) => ({
        roomId: p.room_id,
        body: p.body.length > 60 ? `${p.body.slice(0, 58)}…` : p.body,
        authorName: p.author_name,
        authorRole: p.author_role,
      })),
    });
  } catch (err) {
    console.error("[interop/sample-comments GET]", err);
    return NextResponse.json({ comments: [] }, { status: 200 });
  }
}
