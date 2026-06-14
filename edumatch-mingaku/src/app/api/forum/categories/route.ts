import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { uniqueForumSlug } from "@/lib/forum-slug";
import { validateForumCategoryTags } from "@/lib/forum-category-tags";
import { findForumCategoriesList } from "@/lib/forum-category-query";
import { forumPrismaErrorMessage } from "@/lib/forum-prisma-errors";
import { provisionCategoryRooms } from "@/lib/forum-category-room";

export const dynamic = "force-dynamic";

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

    const categories = await findForumCategoriesList({
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
    const hint = forumPrismaErrorMessage(err);
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

    // 全サブカテゴリのルーム生成＋コンテンツ紐付けは重く、await するとカテゴリ作成UIが固まる。
    // レスポンスは即返し、ルーム生成は after() でバックグラウンド実行する。
    after(async () => {
      try {
        await provisionCategoryRooms({
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          color: category.color,
        });
      } catch (e) {
        console.error("[forum/categories POST] provisionCategoryRooms", e);
      }
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
    const hint = forumPrismaErrorMessage(err);
    return NextResponse.json(
      { error: hint ?? "Internal server error" },
      { status: hint ? 503 : 500 }
    );
  }
}
