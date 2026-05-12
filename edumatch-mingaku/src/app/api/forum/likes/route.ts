import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** いいね追加・取り消し（トグル） */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    const body = await req.json();
    const { targetId, targetType } = body as {
      targetId: string;
      targetType: "post" | "reply";
    };

    if (!targetId || !targetType) {
      return NextResponse.json({ error: "targetId and targetType are required" }, { status: 400 });
    }

    const existing = await prisma.forumLike.findFirst({
      where: { target_id: targetId, user_id: user.id },
    });

    if (existing) {
      await prisma.forumLike.delete({ where: { id: existing.id } });
      const count = await prisma.forumLike.count({
        where: { target_id: targetId, target_type: targetType },
      });
      return NextResponse.json({ liked: false, count });
    } else {
      await prisma.forumLike.create({
        data: {
          target_id: targetId,
          target_type: targetType,
          user_id: user.id,
        },
      });
      const count = await prisma.forumLike.count({
        where: { target_id: targetId, target_type: targetType },
      });
      return NextResponse.json({ liked: true, count });
    }
  } catch (err) {
    console.error("[forum/likes POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
