import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateCategoryRoom } from "@/lib/forum-category-room";
import { refreshCategoryContentCache } from "@/lib/forum-category-content-ai";
import { verifyCron } from "@/lib/security";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * 毎日1回: DB をスキャンし、各カテゴリ×サブカテゴリに AI で関連コンテンツを選定してキャッシュする。
 */
export async function GET(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [categories, subCategories] = await Promise.all([
      prisma.forumCategory.findMany({
        where: { is_active: true },
        orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
        select: { id: true, name: true, slug: true, description: true },
      }),
      prisma.forumSubCategory.findMany({
        where: { is_active: true, content_kind: { not: "community" } },
        orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
        select: { id: true, name: true, slug: true, content_kind: true },
      }),
    ]);

    const results: {
      categorySlug: string;
      subSlug: string;
      itemCount: number;
      cached: boolean;
      error?: string;
    }[] = [];

    for (const category of categories) {
      for (const sub of subCategories) {
        const row = {
          categorySlug: category.slug,
          subSlug: sub.slug,
          itemCount: 0,
          cached: false,
          error: undefined as string | undefined,
        };

        try {
          await getOrCreateCategoryRoom(category.slug, sub.slug);

          const { items, cached } = await refreshCategoryContentCache({
            categoryId: category.id,
            categoryName: category.name,
            categoryDescription: category.description,
            subCategoryId: sub.id,
            subCategoryName: sub.name,
            contentKind: sub.content_kind,
          });

          row.itemCount = items.length;
          row.cached = cached;
        } catch (e) {
          console.error(
            `[cron/forum-category-content-sync] ${category.slug}/${sub.slug}:`,
            e
          );
          row.error = "同期に失敗しました";
        }

        results.push(row);
      }
    }

    const totalItems = results.reduce((n, r) => n + r.itemCount, 0);
    const failed = results.filter((r) => !!r.error).length;

    return NextResponse.json({
      processedPairs: results.length,
      totalItems,
      failed,
      results,
    });
  } catch (e) {
    console.error("[cron/forum-category-content-sync]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
