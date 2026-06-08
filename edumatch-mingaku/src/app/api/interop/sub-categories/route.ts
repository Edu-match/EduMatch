import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Interop特設のサブカテゴリ（面）一覧（公開） */
export async function GET() {
  try {
    const subs = await prisma.interopSubCategory.findMany({
      where: { is_active: true },
      orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
    });
    return NextResponse.json({
      subCategories: subs.map((s) => ({
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
    console.error("[interop/sub-categories GET]", err);
    return NextResponse.json({ subCategories: [], error: "Internal server error" }, { status: 200 });
  }
}
