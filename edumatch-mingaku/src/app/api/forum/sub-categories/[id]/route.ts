import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

const VALID_CONTENT_KINDS = ["community", "article", "service", "media", "events-info"];

/** サブカテゴリ更新（ADMIN のみ） */
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
    const { name, icon, contentKind, sortOrder, isActive } = body as {
      name?: string;
      icon?: string;
      contentKind?: string;
      sortOrder?: number;
      isActive?: boolean;
    };

    const sub = await prisma.forumSubCategory.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(icon !== undefined ? { icon: icon.trim() || null } : {}),
        ...(contentKind !== undefined && VALID_CONTENT_KINDS.includes(contentKind)
          ? { content_kind: contentKind }
          : {}),
        ...(sortOrder !== undefined ? { sort_order: sortOrder } : {}),
        ...(isActive !== undefined ? { is_active: isActive } : {}),
      },
    });

    return NextResponse.json({
      subCategory: {
        id: sub.id,
        name: sub.name,
        slug: sub.slug,
        icon: sub.icon,
        contentKind: sub.content_kind,
        sortOrder: sub.sort_order,
        isActive: sub.is_active,
      },
    });
  } catch (err) {
    console.error("[forum/sub-categories/:id PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** サブカテゴリ削除（ADMIN のみ） */
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
    await prisma.forumSubCategory.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[forum/sub-categories/:id DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
