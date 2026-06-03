import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { uniqueForumSlug } from "@/lib/forum-slug";
import { validateForumCategoryTags } from "@/lib/forum-category-tags";

export const dynamic = "force-dynamic";

function prismaErrorMessage(err: unknown): string | null {
  const code = (err as { code?: string })?.code;
  if (code === "P2021") {
    return "forum_categories テーブルがありません。Supabase SQL でマイグレーションを実行してください。";
  }
  return null;
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
        tags: c.tags ?? [],
      })),
    });
  } catch (err) {
    console.error("[forum/categories GET]", err);
    const hint = prismaErrorMessage(err);
    return NextResponse.json(
      { error: hint ?? "Internal server error" },
      { status: hint ? 503 : 500 }
    );
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
    const { name, description, color, sortOrder, tags } = body as {
      name?: string;
      description?: string;
      color?: string;
      sortOrder?: number;
      tags?: string[];
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const tagCheck = validateForumCategoryTags(tags);
    if (!tagCheck.ok) {
      return NextResponse.json({ error: tagCheck.error }, { status: 400 });
    }

    let slug = uniqueForumSlug(name, "category");
    const existing = await prisma.forumCategory.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now()}`;

    const category = await prisma.forumCategory.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() ?? "",
        color: color?.trim() || "#FFB5C8",
        sort_order: typeof sortOrder === "number" ? sortOrder : 0,
        tags: tagCheck.tags,
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
          tags: category.tags,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[forum/categories POST]", err);
    const hint = prismaErrorMessage(err);
    return NextResponse.json(
      { error: hint ?? "Internal server error" },
      { status: hint ? 503 : 500 }
    );
  }
}
