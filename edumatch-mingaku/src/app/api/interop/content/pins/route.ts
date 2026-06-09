import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serialize(p: {
  id: string; sub_category_id: string; source_type: string; source_id: string;
  title: string; description: string; thumbnail_url: string | null; href: string;
  meta: string | null; is_hidden: boolean; rank_order: number;
}) {
  return {
    id: p.id,
    subCategoryId: p.sub_category_id,
    sourceType: p.source_type,
    sourceId: p.source_id,
    title: p.title,
    description: p.description,
    thumbnailUrl: p.thumbnail_url,
    href: p.href,
    meta: p.meta ?? undefined,
    isHidden: p.is_hidden,
    rankOrder: p.rank_order,
  };
}

/** サブカテゴリのピン/除外一覧（ADMIN のみ）。?subCategoryId=... */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const subCategoryId = req.nextUrl.searchParams.get("subCategoryId");
  if (!subCategoryId) return NextResponse.json({ error: "subCategoryId is required" }, { status: 400 });
  const pins = await prisma.interopContentPin.findMany({
    where: { sub_category_id: subCategoryId },
    orderBy: [{ rank_order: "asc" }, { created_at: "asc" }],
  });
  return NextResponse.json({ pins: pins.map(serialize) });
}

/** ピン追加（手動）／除外マーカー追加（ADMIN のみ） */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    subCategoryId?: string;
    sourceType?: string;
    sourceId?: string;
    title?: string;
    description?: string;
    thumbnailUrl?: string | null;
    href?: string;
    meta?: string;
    isHidden?: boolean;
  };

  if (!body.subCategoryId || !body.sourceType || !body.sourceId) {
    return NextResponse.json({ error: "subCategoryId, sourceType, sourceId は必須です" }, { status: 400 });
  }
  if (!body.isHidden && (!body.title || !body.href)) {
    return NextResponse.json({ error: "title, href は必須です" }, { status: 400 });
  }

  // 既存（同一source）があれば更新（is_hiddenの付け替え等）
  const existing = await prisma.interopContentPin.findFirst({
    where: { sub_category_id: body.subCategoryId, source_type: body.sourceType, source_id: body.sourceId },
  });

  const count = await prisma.interopContentPin.count({ where: { sub_category_id: body.subCategoryId } });

  const data = {
    sub_category_id: body.subCategoryId,
    source_type: body.sourceType,
    source_id: body.sourceId,
    title: body.title ?? "",
    description: body.description ?? "",
    thumbnail_url: body.thumbnailUrl ?? null,
    href: body.href ?? "",
    meta: body.meta ?? null,
    is_hidden: body.isHidden === true,
  };

  const pin = existing
    ? await prisma.interopContentPin.update({ where: { id: existing.id }, data })
    : await prisma.interopContentPin.create({ data: { ...data, rank_order: count } });

  return NextResponse.json({ pin: serialize(pin) }, { status: existing ? 200 : 201 });
}
