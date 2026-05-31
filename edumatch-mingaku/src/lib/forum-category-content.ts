import {
  fetchContentCandidates,
  pickCategoryContentWithAI,
  readCategoryContentCache,
  refreshCategoryContentCache,
} from "@/lib/forum-category-content-ai";

export type CategoryContentItem = {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  href: string;
  meta?: string;
};

export type CategoryContentParams = {
  categoryId: string;
  categoryName: string;
  categoryDescription: string;
  subCategoryId: string;
  subCategoryName: string;
  contentKind: string;
  limit?: number;
};

/**
 * ページ表示用（高速）: キャッシュ → キーワードフォールバックのみ。
 * AI 選定は日次 Cron またはクライアントの API 取得で行う。
 */
export async function getCategoryRoomContentForPage(
  params: CategoryContentParams
): Promise<CategoryContentItem[]> {
  const limit = params.limit ?? 6;
  if (params.contentKind === "community") return [];

  try {
    const cached = await readCategoryContentCache(
      params.categoryId,
      params.subCategoryId,
      params.contentKind,
      limit
    );
    if (cached.length > 0) return cached;
    return await getCategoryRoomContentKeywordFallback(
      params.categoryName,
      params.contentKind,
      limit
    );
  } catch (err) {
    console.error("[getCategoryRoomContentForPage]", err);
    return getCategoryRoomContentKeywordFallback(params.categoryName, params.contentKind, limit);
  }
}

/**
 * カテゴリルーム上部に表示する関連コンテンツ（API・手動同期用）。
 * allowAiRefresh=true のときキャッシュが空ならその場で AI 選定する。
 */
export async function getCategoryRoomContent(
  params: CategoryContentParams & { allowAiRefresh?: boolean }
): Promise<CategoryContentItem[]> {
  const limit = params.limit ?? 6;
  if (params.contentKind === "community") return [];

  try {
    const cached = await readCategoryContentCache(
      params.categoryId,
      params.subCategoryId,
      params.contentKind,
      limit
    );
    if (cached.length > 0) return cached;

    if (params.allowAiRefresh) {
      const { items } = await refreshCategoryContentCache({
        categoryId: params.categoryId,
        categoryName: params.categoryName,
        categoryDescription: params.categoryDescription,
        subCategoryId: params.subCategoryId,
        subCategoryName: params.subCategoryName,
        contentKind: params.contentKind,
        limit,
      });
      if (items.length > 0) return items;
    }

    return await getCategoryRoomContentKeywordFallback(params.categoryName, params.contentKind, limit);
  } catch (err) {
    console.error("[getCategoryRoomContent]", err);
    return getCategoryRoomContentKeywordFallback(params.categoryName, params.contentKind, limit);
  }
}

/** キーワード一致のみ（AI・キャッシュ不可時のフォールバック） */
async function getCategoryRoomContentKeywordFallback(
  categoryName: string,
  contentKind: string,
  limit: number
): Promise<CategoryContentItem[]> {
  const q = categoryName.trim().toLowerCase();
  const candidates = await fetchContentCandidates(contentKind, 80);
  const matched = candidates.filter((c) => {
    const hay = `${c.title} ${c.description} ${c.categoryLabel ?? ""} ${c.tags.join(" ")}`.toLowerCase();
    return hay.includes(q) || q.split(/[\s・、]+/).some((part) => part.length >= 2 && hay.includes(part));
  });
  const pool = matched.length > 0 ? matched : candidates;
  return pool.slice(0, limit).map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    thumbnailUrl: c.thumbnailUrl,
    href: c.href,
    meta: c.meta,
  }));
}
