import { NextRequest, NextResponse } from "next/server";
import { getOrCreateCategoryRoom } from "@/lib/forum-category-room";

export const dynamic = "force-dynamic";

/**
 * 大カテゴリ × サブカテゴリのルームを取得（なければ作成）。
 * GET ?categorySlug=...&subSlug=...
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const categorySlug = url.searchParams.get("categorySlug");
    const subSlug = url.searchParams.get("subSlug");

    if (!categorySlug || !subSlug) {
      return NextResponse.json(
        { error: "categorySlug and subSlug are required" },
        { status: 400 }
      );
    }

    const result = await getOrCreateCategoryRoom(categorySlug, subSlug);
    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[forum/rooms/by-category GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
