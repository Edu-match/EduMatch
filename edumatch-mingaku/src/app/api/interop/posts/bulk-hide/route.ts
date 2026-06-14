import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** サブカテゴリ配下の投稿・返信・AI返信を一括で非表示／表示（ADMIN のみ） */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    subCategoryId?: string;
    isHidden?: boolean;
  };
  if (!body.subCategoryId) {
    return NextResponse.json({ error: "subCategoryId is required" }, { status: 400 });
  }
  if (typeof body.isHidden !== "boolean") {
    return NextResponse.json({ error: "isHidden is required" }, { status: 400 });
  }

  const sub = await prisma.interopSubCategory.findUnique({ where: { id: body.subCategoryId } });
  if (!sub) return NextResponse.json({ error: "sub category not found" }, { status: 404 });

  const result = await prisma.interopPost.updateMany({
    where: { sub_category_id: body.subCategoryId },
    data: {
      is_hidden: body.isHidden,
      ...(body.isHidden === false ? { auto_flagged: false } : {}),
    },
  });

  return NextResponse.json({ ok: true, updated: result.count, isHidden: body.isHidden });
}
