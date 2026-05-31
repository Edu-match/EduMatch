import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** 大カテゴリ一覧（公開） */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const includeInactive = url.searchParams.get("includeInactive") === "true";

    let isAdmin = false;
    if (includeInactive) {
      const profile = await getCurrentProfile();
      isAdmin = profile?.role === "ADMIN";
    }

    const categories = await prisma.forumCategory.findMany({
      where: includeInactive && isAdmin ? {} : { is_active: true },
      orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
    });

    return NextResponse.json({
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        color: c.color,
        sortOrder: c.sort_order,
        isActive: c.is_active,
      })),
    });
  } catch (err) {
    console.error("[forum/categories GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** 大カテゴリ作成（ADMIN のみ） */
export async function POST(req: NextRequest) {
  try {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, color, sortOrder } = body as {
      name?: string;
      description?: string;
      color?: string;
      sortOrder?: number;
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    let slug = slugify(name) || `category-${Date.now()}`;
    const existing = await prisma.forumCategory.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now()}`;

    const category = await prisma.forumCategory.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() ?? "",
        color: color?.trim() || "#FFB5C8",
        sort_order: typeof sortOrder === "number" ? sortOrder : 0,
      },
    });

    return NextResponse.json(
      {
        category: {
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          color: category.color,
          sortOrder: category.sort_order,
          isActive: category.is_active,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[forum/categories POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
