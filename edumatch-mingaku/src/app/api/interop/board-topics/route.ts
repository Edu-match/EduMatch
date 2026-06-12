import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

function serialize(t: {
  id: string;
  sub_category_id: string;
  name: string;
  description: string;
  url: string;
  content_kinds: string[];
  content_query: string;
  sort_order: number;
  is_active: boolean;
}) {
  return {
    id: t.id,
    subCategoryId: t.sub_category_id,
    name: t.name,
    description: t.description,
    url: t.url,
    contentKinds: t.content_kinds,
    contentQuery: t.content_query,
    sortOrder: t.sort_order,
    isActive: t.is_active,
  };
}

/** サブカテゴリ配下のトピック一覧（公開）。?subCategoryId=xxx 必須。
 *  ?all=true は管理者のみ非アクティブも含む。
 */
export async function GET(req: NextRequest) {
  try {
    const subCategoryId = req.nextUrl.searchParams.get("subCategoryId");
    if (!subCategoryId) {
      return NextResponse.json({ topics: [], error: "subCategoryId is required" }, { status: 400 });
    }
    let includeInactive = false;
    if (req.nextUrl.searchParams.get("all") === "true") {
      try { await requireAdmin(); includeInactive = true; } catch { includeInactive = false; }
    }
    const topics = await prisma.interopBoardTopic.findMany({
      where: { sub_category_id: subCategoryId, ...(includeInactive ? {} : { is_active: true }) },
      orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
    });
    return NextResponse.json({ topics: topics.map(serialize) });
  } catch (err) {
    console.error("[interop/board-topics GET]", err);
    return NextResponse.json({ topics: [], error: "Internal server error" }, { status: 200 });
  }
}

/** トピック作成（ADMIN のみ） */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    subCategoryId?: string;
    name?: string;
    description?: string;
    url?: string;
    contentKinds?: string[];
    contentQuery?: string;
    sortOrder?: number;
  };
  if (!body.subCategoryId) return NextResponse.json({ error: "subCategoryId is required" }, { status: 400 });
  if (!body.name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const sub = await prisma.interopSubCategory.findUnique({ where: { id: body.subCategoryId } });
  if (!sub) return NextResponse.json({ error: "sub category not found" }, { status: 404 });

  const ALLOWED_KINDS = ["article", "service", "media", "events-info"];
  const created = await prisma.interopBoardTopic.create({
    data: {
      sub_category_id: body.subCategoryId,
      name: body.name.trim(),
      description: body.description?.trim() ?? "",
      url: body.url?.trim() ?? "",
      content_kinds: Array.isArray(body.contentKinds)
        ? body.contentKinds.filter((k) => ALLOWED_KINDS.includes(k))
        : [],
      content_query: body.contentQuery?.trim() ?? "",
      sort_order: body.sortOrder ?? 0,
    },
  });
  return NextResponse.json({ topic: serialize(created) }, { status: 201 });
}
