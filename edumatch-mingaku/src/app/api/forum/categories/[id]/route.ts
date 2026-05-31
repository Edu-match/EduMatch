import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** 大カテゴリ更新（ADMIN のみ） */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, description, color, sortOrder, isActive } = body as {
      name?: string;
      description?: string;
      color?: string;
      sortOrder?: number;
      isActive?: boolean;
    };

    const category = await prisma.forumCategory.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description: description.trim() } : {}),
        ...(color !== undefined ? { color: color.trim() || "#FFB5C8" } : {}),
        ...(sortOrder !== undefined ? { sort_order: sortOrder } : {}),
        ...(isActive !== undefined ? { is_active: isActive } : {}),
      },
    });

    return NextResponse.json({
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        color: category.color,
        sortOrder: category.sort_order,
        isActive: category.is_active,
      },
    });
  } catch (err) {
    console.error("[forum/categories/:id PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** 大カテゴリ削除（ADMIN のみ） */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await prisma.forumCategory.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[forum/categories/:id DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
