import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** トピックの編集（ADMIN のみ） */
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
    url?: string;
    contentKinds?: string[];
    contentQuery?: string;
    sortOrder?: number;
    isActive?: boolean;
  };

  const ALLOWED_KINDS = ["article", "service", "media", "events-info"];
  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.description === "string") data.description = body.description.trim();
  if (typeof body.url === "string") data.url = body.url.trim();
  if (Array.isArray(body.contentKinds)) data.content_kinds = body.contentKinds.filter((k) => ALLOWED_KINDS.includes(k));
  if (typeof body.contentQuery === "string") data.content_query = body.contentQuery.trim();
  if (typeof body.sortOrder === "number") data.sort_order = body.sortOrder;
  if (typeof body.isActive === "boolean") data.is_active = body.isActive;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "更新内容がありません" }, { status: 400 });
  }

  try {
    const t = await prisma.interopBoardTopic.update({ where: { id }, data });
    return NextResponse.json({
      topic: {
        id: t.id,
        subCategoryId: t.sub_category_id,
        name: t.name,
        description: t.description,
        url: t.url,
        contentKinds: t.content_kinds,
        contentQuery: t.content_query,
        sortOrder: t.sort_order,
        isActive: t.is_active,
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    await prisma.interopBoardTopic.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
