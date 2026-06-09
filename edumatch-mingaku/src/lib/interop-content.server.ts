import { prisma } from "@/lib/prisma";
import { fetchContentCandidates, type ContentCandidate } from "@/lib/forum-category-content-ai";
import {
  SOURCE_TYPE_LABEL,
  type InteropContentItem,
} from "@/lib/interop-content";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://edu-match.com").replace(/\/$/, "");

/** 相対hrefを本体エデュマッチの絶対URLにし、計測用パラメータを付ける */
export function absolutizeHref(href: string): string {
  const base = /^https?:\/\//.test(href) ? href : `${SITE_URL}${href.startsWith("/") ? "" : "/"}${href}`;
  try {
    const u = new URL(base);
    if (!u.searchParams.has("utm_source")) u.searchParams.set("utm_source", "interop");
    return u.toString();
  } catch {
    return base;
  }
}

/** カテゴリ名等のキーワードで候補をフィルタ（本体 getCategoryRoomContentKeywordFallback と同手法） */
function matchByQuery(candidates: ContentCandidate[], query: string): ContentCandidate[] {
  const q = query.trim().toLowerCase();
  if (!q) return candidates;
  const parts = q.split(/[\s・、,]+/).filter((p) => p.length >= 2);
  const matched = candidates.filter((c) => {
    const hay = `${c.title} ${c.description} ${c.categoryLabel ?? ""} ${c.tags.join(" ")}`.toLowerCase();
    return hay.includes(q) || parts.some((p) => hay.includes(p));
  });
  // マッチ0なら絞り込みすぎを避けて全候補を返す（本体と同じ思想）
  return matched.length > 0 ? matched : candidates;
}

function candidateToItem(c: ContentCandidate): InteropContentItem {
  return {
    id: `${c.sourceType}:${c.id}`,
    sourceType: c.sourceType,
    sourceId: c.id,
    title: c.title,
    description: c.description,
    thumbnailUrl: c.thumbnailUrl,
    href: absolutizeHref(c.href),
    meta: c.meta,
    kindLabel: SOURCE_TYPE_LABEL[c.sourceType] ?? "コンテンツ",
    pinned: false,
  };
}

/**
 * サブカテゴリの関連コンテンツを取得。
 * 手動ピン（最上位固定）＋ 自動抽出（キーワードマッチ、除外・重複を考慮）。
 * 失敗時は [] を返す（未マイグレーションでも500にしない）。
 */
export async function getInteropContent(
  subCategoryId: string,
  limit = 8
): Promise<InteropContentItem[]> {
  try {
    const sub = await prisma.interopSubCategory.findUnique({
      where: { id: subCategoryId },
      include: { category: { select: { name: true } } },
    });
    if (!sub) return [];

    const pins = await prisma.interopContentPin.findMany({
      where: { sub_category_id: subCategoryId },
      orderBy: [{ rank_order: "asc" }, { created_at: "asc" }],
    });

    // 手動ピン（表示するもの）
    const pinnedItems: InteropContentItem[] = pins
      .filter((p) => !p.is_hidden)
      .map((p) => ({
        id: p.id,
        sourceType: p.source_type,
        sourceId: p.source_id,
        title: p.title,
        description: p.description,
        thumbnailUrl: p.thumbnail_url,
        href: absolutizeHref(p.href),
        meta: p.meta ?? undefined,
        kindLabel: SOURCE_TYPE_LABEL[p.source_type] ?? "コンテンツ",
        pinned: true,
      }));

    const excludedIds = new Set(pins.filter((p) => p.is_hidden).map((p) => p.source_id));
    const pinnedSourceIds = new Set(pinnedItems.map((p) => p.sourceId));

    // 自動抽出
    const kinds = (sub.content_kinds ?? []) as string[];
    let autoItems: InteropContentItem[] = [];
    if (kinds.length > 0) {
      const query = sub.content_query?.trim() || `${sub.category.name} ${sub.name}`;
      const lists = await Promise.all(
        kinds.map((k) => fetchContentCandidates(k, 48).catch(() => [] as ContentCandidate[]))
      );
      const merged = matchByQuery(lists.flat(), query);
      const seen = new Set<string>();
      autoItems = merged
        .filter((c) => !excludedIds.has(c.id) && !pinnedSourceIds.has(c.id))
        .filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)))
        .map(candidateToItem);
    }

    return [...pinnedItems, ...autoItems].slice(0, limit);
  } catch (err) {
    console.error("[getInteropContent]", err);
    return [];
  }
}

/** 管理画面：ピン候補の検索（種別＋キーワード） */
export async function searchInteropCandidates(
  kinds: string[],
  query: string,
  limit = 30
): Promise<InteropContentItem[]> {
  try {
    const lists = await Promise.all(
      kinds.map((k) => fetchContentCandidates(k, 48).catch(() => [] as ContentCandidate[]))
    );
    const matched = matchByQuery(lists.flat(), query);
    const seen = new Set<string>();
    return matched
      .filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)))
      .slice(0, limit)
      .map(candidateToItem);
  } catch (err) {
    console.error("[searchInteropCandidates]", err);
    return [];
  }
}
