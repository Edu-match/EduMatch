import { prisma } from "@/lib/prisma";
import type { CategoryContentItem } from "@/lib/forum-category-content";

/**
 * 面（大カテゴリ×サブカテゴリ）に管理者が手動固定したコンテンツを取得する。
 * マイグレーション未適用（テーブル無し）でも落とさず空配列を返す。
 */
export async function readPinnedContentItems(
  categoryId: string,
  subCategoryId: string,
  limit = 6
): Promise<CategoryContentItem[]> {
  try {
    const rows = await prisma.forumPinnedContent.findMany({
      where: { category_id: categoryId, sub_category_id: subCategoryId },
      orderBy: [{ rank_order: "asc" }, { created_at: "asc" }],
      take: limit,
    });
    return rows.map((r) => ({
      id: r.source_id,
      title: r.title,
      description: r.description,
      thumbnailUrl: r.thumbnail_url,
      href: r.href,
      meta: r.meta ?? undefined,
    }));
  } catch (err) {
    console.warn("[readPinnedContentItems] skip (table missing?)", err);
    return [];
  }
}

/** 固定コンテンツを先頭に、残りを後ろに。href で重複排除し limit 件に収める。 */
export function mergePinnedFirst(
  pinned: CategoryContentItem[],
  rest: CategoryContentItem[],
  limit: number
): CategoryContentItem[] {
  const seen = new Set(pinned.map((p) => p.href));
  const merged = [...pinned];
  for (const item of rest) {
    if (merged.length >= limit) break;
    if (seen.has(item.href)) continue;
    seen.add(item.href);
    merged.push(item);
  }
  return merged.slice(0, limit);
}

/**
 * 面の炎マーク手動上書きを取得（null=自動 / true=強制ON / false=強制OFF）。
 * roomId は面のルーム（cat-<categorySlug>--<subSlug>）。列が無い環境では null。
 */
export async function readFaceHotOverride(roomId: string): Promise<boolean | null> {
  try {
    const room = await prisma.forumRoom.findUnique({
      where: { id: roomId },
      select: { hot_override: true },
    });
    return room?.hot_override ?? null;
  } catch (err) {
    console.warn("[readFaceHotOverride] skip (column missing?)", err);
    return null;
  }
}
