import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** サブカテゴリの編集（名前・説明・並び順・公開）。ADMIN のみ。 */
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
    sortOrder?: number;
    isActive?: boolean;
    contentKinds?: string[];
    contentQuery?: string;
    url?: string;
    linkUrl?: string;
  };

  const ALLOWED_KINDS = ["article", "service", "media", "events-info"];
  const data: Record<string, unknown> = {};
  if (typeof body.url === "string") data.url = body.url.trim();
  if (typeof body.linkUrl === "string") data.link_url = body.linkUrl.trim();
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.description === "string") data.description = body.description.trim();
  if (typeof body.sortOrder === "number") data.sort_order = body.sortOrder;
  if (typeof body.isActive === "boolean") data.is_active = body.isActive;
  if (Array.isArray(body.contentKinds)) {
    data.content_kinds = body.contentKinds.filter((k) => ALLOWED_KINDS.includes(k));
  }
  if (typeof body.contentQuery === "string") data.content_query = body.contentQuery.trim();

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "更新内容がありません" }, { status: 400 });
  }

  try {
    const s = await prisma.interopSubCategory.update({ where: { id }, data });
    return NextResponse.json({
      subCategory: {
        id: s.id,
        categoryId: s.category_id,
        name: s.name,
        slug: s.slug,
        description: s.description,
        url: s.url,
        linkUrl: s.link_url,
        sortOrder: s.sort_order,
        isActive: s.is_active,
        contentKinds: s.content_kinds,
        contentQuery: s.content_query,
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
    await prisma.interopSubCategory.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
