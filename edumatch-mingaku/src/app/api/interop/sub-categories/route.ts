import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** カテゴリ配下のサブカテゴリ一覧（公開）
 *  ?categoryId=xxx でフィルタ必須。未指定なら全件。
 */
export async function GET(req: NextRequest) {
  try {
    const categoryId = req.nextUrl.searchParams.get("categoryId") ?? undefined;
    let includeInactive = false;
    if (req.nextUrl.searchParams.get("all") === "true") {
      try { await requireAdmin(); includeInactive = true; } catch { includeInactive = false; }
    }
    const subs = await prisma.interopSubCategory.findMany({
      where: {
        ...(includeInactive ? {} : { is_active: true }),
        ...(categoryId ? { category_id: categoryId } : {}),
      },
      orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
    });
    return NextResponse.json({
      subCategories: subs.map((s) => ({
        id: s.id,
        categoryId: s.category_id,
        name: s.name,
        slug: s.slug,
        description: s.description,
        url: s.url,
        sortOrder: s.sort_order,
        isActive: s.is_active,
        contentKinds: s.content_kinds,
        contentQuery: s.content_query,
      })),
    });
  } catch (err) {
    console.error("[interop/sub-categories GET]", err);
    return NextResponse.json({ subCategories: [], error: "Internal server error" }, { status: 200 });
  }
}

/** サブカテゴリ作成（ADMIN のみ） */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as {
    categoryId?: string;
    name?: string;
    description?: string;
    sortOrder?: number;
    /** サテライト等で固定slugを使いたいとき明示指定（未指定なら名前から自動生成） */
    slug?: string;
  };
  if (!body.categoryId) return NextResponse.json({ error: "categoryId is required" }, { status: 400 });
  if (!body.name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const cat = await prisma.interopCategory.findUnique({ where: { id: body.categoryId } });
  if (!cat) return NextResponse.json({ error: "category not found" }, { status: 404 });

  // slug: 明示指定があればそれを優先（サテライトの固定slug用）、なければ categorySlug-name から生成
  let slug: string;
  if (body.slug?.trim()) {
    slug = body.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
    // 固定slugが既に存在するなら重複作成は拒否（サテライトの二重作成防止）
    if (await prisma.interopSubCategory.findUnique({ where: { slug } })) {
      return NextResponse.json({ error: "このサテライトは既に存在します" }, { status: 409 });
    }
  } else {
    const namePart = body.name.trim().toLowerCase().replace(/[^a-z0-9ぁ-んァ-ヶ一-龯]+/g, "-").replace(/^-+|-+$/g, "") || "sub";
    slug = `${cat.slug}-${namePart}`;
    if (await prisma.interopSubCategory.findUnique({ where: { slug } })) {
      slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    }
  }

  const created = await prisma.interopSubCategory.create({
    data: {
      category_id: body.categoryId,
      name: body.name.trim(),
      slug,
      description: body.description?.trim() ?? "",
      sort_order: body.sortOrder ?? 0,
    },
  });

  return NextResponse.json({
    subCategory: {
      id: created.id,
      categoryId: created.category_id,
      name: created.name,
      slug: created.slug,
      description: created.description,
      sortOrder: created.sort_order,
    },
  });
}
