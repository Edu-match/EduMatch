import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAiWeeklyTopicForRoom } from "@/lib/forum-weekly-topic-ai";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function verifyCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV === "development";
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/** Vercel Cron 等: AI週次お題が有効なルームに新しいお題を追加 */
export async function GET(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rooms = await prisma.forumRoom.findMany({
      where: { ai_weekly_topic_enabled: true },
      select: { id: true },
    });

    const results: { roomId: string; ok: boolean; error?: string }[] = [];
    for (const r of rooms) {
      try {
        await createAiWeeklyTopicForRoom(r.id);
        results.push({ roomId: r.id, ok: true });
      } catch (e) {
        results.push({
          roomId: r.id,
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return NextResponse.json({ processed: rooms.length, results });
  } catch (e) {
    console.error("[cron/forum-weekly-topics]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
