import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { searchInteropCandidates } from "@/lib/interop-content.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** ピン候補の検索（ADMIN のみ）。
 *  ?kinds=article,media&q=... もしくは ?subCategoryId=...（サブカテゴリの設定を流用）
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  let kinds = (sp.get("kinds") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  let query = sp.get("q") ?? "";

  const subCategoryId = sp.get("subCategoryId");
  if (subCategoryId && (kinds.length === 0 || !query)) {
    const sub = await prisma.interopSubCategory.findUnique({
      where: { id: subCategoryId },
      include: { category: { select: { name: true } } },
    });
    if (sub) {
      if (kinds.length === 0) {
        const ck = (sub.content_kinds ?? []) as string[];
        kinds = ck.length > 0 ? ck : ["article", "service", "media", "events-info"];
      }
      if (!query) query = sub.content_query?.trim() || `${sub.category.name} ${sub.name}`;
    }
  }
  if (kinds.length === 0) kinds = ["article", "service", "media", "events-info"];

  const items = await searchInteropCandidates(kinds, query);
  return NextResponse.json({ items });
}
