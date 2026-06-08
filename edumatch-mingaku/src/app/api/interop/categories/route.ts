import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Interop特設の大カテゴリ一覧（公開）。?all=true は管理者のみ非公開も含む。 */
export async function GET(req: NextRequest) {
  try {
    let includeInactive = false;
    if (req.nextUrl.searchParams.get("all") === "true") {
      try { await requireAdmin(); includeInactive = true; } catch { includeInactive = false; }
    }
    const categories = await prisma.interopCategory.findMany({
      where: includeInactive ? {} : { is_active: true },
      orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
    });
    return NextResponse.json({
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        color: c.color,
        isPrimary: c.is_primary,
        sortOrder: c.sort_order,
        isActive: c.is_active,
      })),
    });
  } catch (err) {
    console.error("[interop/categories GET]", err);
    return NextResponse.json({ categories: [], error: "Internal server error" }, { status: 200 });
  }
}

function slugify(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `cat-${Math.random().toString(36).slice(2, 8)}`;
}

/** Interop特設の大カテゴリ作成（ADMIN のみ） */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as {
    name?: string;
    description?: string;
    color?: string;
    isPrimary?: boolean;
    sortOrder?: number;
  };
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  let slug = slugify(body.name);
  // slug 重複回避
  if (await prisma.interopCategory.findUnique({ where: { slug } })) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const created = await prisma.interopCategory.create({
    data: {
      name: body.name.trim(),
      slug,
      description: body.description?.trim() ?? "",
      color: body.color?.trim() || "#C9D4F6",
      is_primary: !!body.isPrimary,
      sort_order: body.sortOrder ?? 0,
    },
  });

  return NextResponse.json({
    category: {
      id: created.id,
      name: created.name,
      slug: created.slug,
      description: created.description,
      color: created.color,
      isPrimary: created.is_primary,
      sortOrder: created.sort_order,
      isActive: created.is_active,
    },
  });
}
