import { NextRequest, NextResponse } from "next/server";
import { getInteropContent } from "@/lib/interop-content.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** サブカテゴリ／トピックの関連コンテンツ（公開）。?subCategoryId=... 必須、?topicId=... 任意。
 *  topicId 指定時はトピック側の検索設定（kinds/query）を優先する。 */
export async function GET(req: NextRequest) {
  const subCategoryId = req.nextUrl.searchParams.get("subCategoryId");
  if (!subCategoryId) {
    return NextResponse.json({ items: [], error: "subCategoryId is required" }, { status: 400 });
  }
  const topicId = req.nextUrl.searchParams.get("topicId") ?? undefined;
  const items = await getInteropContent(subCategoryId, 8, topicId);
  return NextResponse.json({ items });
}
