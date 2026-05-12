import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** 部屋のお題履歴（新しい順） */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params;
    const room = await prisma.forumRoom.findUnique({ where: { id: roomId }, select: { id: true } });
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const topics = await prisma.forumRoomTopic.findMany({
      where: { room_id: roomId },
      orderBy: { period_start: "desc" },
      take: 30,
      select: { id: true, title: true, period_start: true },
    });

    return NextResponse.json({
      topics: topics.map((t) => ({
        id: t.id,
        title: t.title,
        periodStart: t.period_start.toISOString(),
      })),
    });
  } catch (e) {
    console.error("[forum/rooms/:id/topics GET]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
