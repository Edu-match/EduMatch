import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { INTEROP_PRIORITY_TOPICS } from "@/lib/interop-priority-topics";
import { DEFAULT_TOPIC_AXIS } from "@/lib/interop-topic-axis";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 管理者専用：ハードコードの28話題玉を interop_topics へ投入（冪等・upsert）。
 *  既存の no はスキップせず内容を更新する（ハードコードを正とする初期投入用）。 */
export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 401 });
  }

  let created = 0;
  let updated = 0;
  for (let i = 0; i < INTEROP_PRIORITY_TOPICS.length; i++) {
    const t = INTEROP_PRIORITY_TOPICS[i];
    const axis = DEFAULT_TOPIC_AXIS[t.no] ?? { x: 0, y: 0 };
    const existing = await prisma.interopTopic.findUnique({ where: { no: t.no } });
    const data = {
      major: t.major,
      name: t.category,
      room_id: t.roomId,
      topic1: t.topics[0] ?? "",
      topic2: t.topics[1] ?? "",
      topic3: t.topics[2] ?? "",
      axis_x: axis.x,
      axis_y: axis.y,
      sort_order: i,
      is_active: true,
    };
    if (existing) {
      await prisma.interopTopic.update({ where: { no: t.no }, data });
      updated++;
    } else {
      await prisma.interopTopic.create({ data: { no: t.no, ...data } });
      created++;
    }
  }
  return NextResponse.json({ ok: true, created, updated, total: INTEROP_PRIORITY_TOPICS.length });
}
