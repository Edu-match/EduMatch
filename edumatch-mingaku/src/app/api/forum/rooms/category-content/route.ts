import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCategoryRoomContent } from "@/lib/forum-category-content";
import { readFaceHotOverride } from "@/lib/forum-pinned-content";
import { categoryRoomId } from "@/lib/forum-category-room";

export const dynamic = "force-dynamic";

/**
 * カテゴリルーム上部に表示する関連DBコンテンツを返す。
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

    const category = await prisma.forumCategory.findUnique({
      where: { slug: categorySlug },
    });
    const subCategory = await prisma.forumSubCategory.findUnique({
      where: { slug: subSlug },
    });
    if (!category || !subCategory) {
      return NextResponse.json({ items: [], contentKind: null });
    }

    const allowAiRefresh = url.searchParams.get("refresh") === "1";
    const [items, hotOverride] = await Promise.all([
      getCategoryRoomContent({
        categoryId: category.id,
        categoryName: category.name,
        categoryDescription: category.description,
        subCategoryId: subCategory.id,
        subCategoryName: subCategory.name,
        contentKind: subCategory.content_kind,
        allowAiRefresh,
      }),
      readFaceHotOverride(categoryRoomId(categorySlug, subSlug)),
    ]);

    return NextResponse.json({ items, contentKind: subCategory.content_kind, hotOverride });
  } catch (err) {
    console.error("[forum/rooms/category-content GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
