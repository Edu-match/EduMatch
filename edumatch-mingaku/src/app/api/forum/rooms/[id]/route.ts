import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** 今週のお題などの更新（管理者 or 部屋作成者） */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { weeklyTopic, description, emoji, aiDiscussion, isHidden } = body as {
      weeklyTopic?: string;
      description?: string;
      emoji?: string;
      aiDiscussion?: boolean;
      isHidden?: boolean;
    };

    const isAdmin = profile.role === "ADMIN";

    if (!isAdmin) {
      // 部屋作成者かチェック
      const existing = await prisma.forumRoom.findUnique({ where: { id }, select: { created_by: true } });
      if (!existing || existing.created_by !== profile.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      // 作成者はweeklyTopicのみ変更可（非表示・AI設定等は管理者のみ）
      if (description !== undefined || emoji !== undefined || aiDiscussion !== undefined || isHidden !== undefined) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // is_hidden is managed via raw SQL until migration is confirmed in DB
    if (isHidden !== undefined && isAdmin) {
      try {
        await prisma.$executeRaw`UPDATE forum_rooms SET is_hidden = ${isHidden} WHERE id = ${id}`;
      } catch {
        // Column may not exist yet
      }
    }

    const prismaData = {
      ...(weeklyTopic !== undefined && { weekly_topic: weeklyTopic }),
      ...(description !== undefined && { description }),
      ...(emoji !== undefined && { emoji }),
      ...(aiDiscussion !== undefined && { ai_discussion: aiDiscussion }),
    };

    let room;
    if (Object.keys(prismaData).length > 0) {
      room = await prisma.forumRoom.update({ where: { id }, data: prismaData });
    } else {
      room = await prisma.forumRoom.findUnique({ where: { id } });
    }

    return NextResponse.json({ room });
  } catch (err) {
    console.error("[forum/rooms/:id PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** 部屋削除（管理者のみ） */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await prisma.forumRoom.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[forum/rooms/:id DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
