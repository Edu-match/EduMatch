import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** マップ上の「LIVE投稿」吹き出し用：直近の来場者投稿（非表示・AI返信を除く）を返す（公開） */
export async function GET() {
  try {
    const posts = await prisma.interopPost.findMany({
      where: { is_hidden: false, is_ai_reply: false },
      orderBy: { created_at: "desc" },
      take: 20,
      select: { id: true, body: true, author_name: true, sub_category_id: true },
    });
    return NextResponse.json({
      posts: posts.map((p) => ({ id: p.id, body: p.body, authorName: p.author_name, subId: p.sub_category_id })),
    });
  } catch (err) {
    console.error("[interop/recent-posts GET]", err);
    return NextResponse.json({ posts: [] }, { status: 200 });
  }
}
