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
    const subs = await prisma.interopSubCategory.findMany({
      where: {
        is_active: true,
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
        sortOrder: s.sort_order,
        isActive: s.is_active,
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
  };
  if (!body.categoryId) return NextResponse.json({ error: "categoryId is required" }, { status: 400 });
  if (!body.name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });

  // slug: categorySlug-name のケバブケース
  const cat = await prisma.interopCategory.findUnique({ where: { id: body.categoryId } });
  if (!cat) return NextResponse.json({ error: "category not found" }, { status: 404 });

  const namePart = body.name.trim().toLowerCase().replace(/[^a-z0-9ぁ-んァ-ヶ一-龯]+/g, "-").replace(/^-+|-+$/g, "") || "sub";
  let slug = `${cat.slug}-${namePart}`;
  if (await prisma.interopSubCategory.findUnique({ where: { slug } })) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
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
