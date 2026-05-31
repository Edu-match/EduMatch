import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

const VALID_CONTENT_KINDS = ["community", "article", "service", "media", "events-info"];

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** サブカテゴリ一覧（公開） */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const includeInactive = url.searchParams.get("includeInactive") === "true";

    let isAdmin = false;
    if (includeInactive) {
      const profile = await getCurrentProfile();
      isAdmin = profile?.role === "ADMIN";
    }

    const subCategories = await prisma.forumSubCategory.findMany({
      where: includeInactive && isAdmin ? {} : { is_active: true },
      orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
    });

    return NextResponse.json({
      subCategories: subCategories.map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        icon: s.icon,
        contentKind: s.content_kind,
        sortOrder: s.sort_order,
        isActive: s.is_active,
      })),
    });
  } catch (err) {
    console.error("[forum/sub-categories GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** サブカテゴリ作成（ADMIN のみ） */
export async function POST(req: NextRequest) {
  try {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, icon, contentKind, sortOrder } = body as {
      name?: string;
      icon?: string;
      contentKind?: string;
      sortOrder?: number;
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const kind = VALID_CONTENT_KINDS.includes(contentKind ?? "")
      ? (contentKind as string)
      : "community";

    let slug = slugify(name) || `sub-${Date.now()}`;
    const existing = await prisma.forumSubCategory.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now()}`;

    const sub = await prisma.forumSubCategory.create({
      data: {
        name: name.trim(),
        slug,
        icon: icon?.trim() || null,
        content_kind: kind,
        sort_order: typeof sortOrder === "number" ? sortOrder : 0,
      },
    });

    return NextResponse.json(
      {
        subCategory: {
          id: sub.id,
          name: sub.name,
          slug: sub.slug,
          icon: sub.icon,
          contentKind: sub.content_kind,
          sortOrder: sub.sort_order,
          isActive: sub.is_active,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[forum/sub-categories POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
