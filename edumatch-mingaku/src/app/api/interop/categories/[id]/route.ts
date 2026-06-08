import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** カテゴリの編集（名前・説明・色・中心・並び順・公開）。ADMIN のみ。 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    description?: string;
    color?: string;
    isPrimary?: boolean;
    sortOrder?: number;
    isActive?: boolean;
  };

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.description === "string") data.description = body.description.trim();
  if (typeof body.color === "string" && body.color.trim()) data.color = body.color.trim();
  if (typeof body.isPrimary === "boolean") data.is_primary = body.isPrimary;
  if (typeof body.sortOrder === "number") data.sort_order = body.sortOrder;
  if (typeof body.isActive === "boolean") data.is_active = body.isActive;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "更新内容がありません" }, { status: 400 });
  }

  try {
    // 中心（メイン）は1つだけにする
    if (data.is_primary === true) {
      await prisma.interopCategory.updateMany({
        where: { is_primary: true, NOT: { id } },
        data: { is_primary: false },
      });
    }
    const c = await prisma.interopCategory.update({ where: { id }, data });
    return NextResponse.json({
      category: {
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        color: c.color,
        isPrimary: c.is_primary,
        sortOrder: c.sort_order,
        isActive: c.is_active,
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

/** カテゴリの削除（配下のサブカテゴリ・投稿も連鎖削除）。ADMIN のみ。 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    await prisma.interopCategory.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
