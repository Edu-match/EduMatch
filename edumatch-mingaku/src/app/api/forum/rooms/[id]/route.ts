import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** 今週のお題などの更新（管理者のみ） */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { weeklyTopic, description, emoji, aiDiscussion } = body as {
      weeklyTopic?: string;
      description?: string;
      emoji?: string;
      aiDiscussion?: boolean;
    };

    const room = await prisma.forumRoom.update({
      where: { id },
      data: {
        ...(weeklyTopic !== undefined && { weekly_topic: weeklyTopic }),
        ...(description !== undefined && { description }),
        ...(emoji !== undefined && { emoji }),
        ...(aiDiscussion !== undefined && { ai_discussion: aiDiscussion }),
      },
    });

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
