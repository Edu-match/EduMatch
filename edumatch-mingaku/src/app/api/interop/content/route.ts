import { NextRequest, NextResponse } from "next/server";
import { getInteropContent } from "@/lib/interop-content.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** サブカテゴリの関連コンテンツ（公開）。?subCategoryId=... 必須。 */
export async function GET(req: NextRequest) {
  const subCategoryId = req.nextUrl.searchParams.get("subCategoryId");
  if (!subCategoryId) {
    return NextResponse.json({ items: [], error: "subCategoryId is required" }, { status: 400 });
  }
  const items = await getInteropContent(subCategoryId);
  return NextResponse.json({ items });
}
