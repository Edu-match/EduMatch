import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

function clampAxis(v: number | undefined): number | undefined {
  if (typeof v !== "number" || !isFinite(v)) return undefined;
  return Math.max(-1, Math.min(1, v));
}

/** 話題玉の更新（ADMIN のみ） */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const b = (await req.json()) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (typeof b.major === "string") data.major = b.major.toUpperCase().slice(0, 1);
  if (typeof b.name === "string") data.name = b.name.trim();
  if (typeof b.roomId === "string") data.room_id = b.roomId.trim();
  if (typeof b.topic1 === "string") data.topic1 = b.topic1.trim();
  if (typeof b.topic2 === "string") data.topic2 = b.topic2.trim();
  if (typeof b.topic3 === "string") data.topic3 = b.topic3.trim();
  const ax = clampAxis(b.axisX as number | undefined);
  if (ax !== undefined) data.axis_x = ax;
  const ay = clampAxis(b.axisY as number | undefined);
  if (ay !== undefined) data.axis_y = ay;
  if (typeof b.sortOrder === "number") data.sort_order = b.sortOrder;
  if (typeof b.isActive === "boolean") data.is_active = b.isActive;

  try {
    await prisma.interopTopic.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 400 });
  }
}

/** 話題玉の削除（ADMIN のみ） */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  try {
    await prisma.interopTopic.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 400 });
  }
}
