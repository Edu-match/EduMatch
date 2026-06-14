import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** ピンの更新（並び順・除外切替）。ADMIN のみ。 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { rankOrder?: number; isHidden?: boolean };
  const data: { rank_order?: number; is_hidden?: boolean } = {};
  if (typeof body.rankOrder === "number") data.rank_order = body.rankOrder;
  if (typeof body.isHidden === "boolean") data.is_hidden = body.isHidden;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "更新内容がありません" }, { status: 400 });
  }
  try {
    await prisma.interopContentPin.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

/** ピン削除。ADMIN のみ。 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  try {
    await prisma.interopContentPin.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
