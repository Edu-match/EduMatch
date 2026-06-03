/** 大カテゴリタグの正規化（NFKC + trim + 小文字） */
export function normalizeForumTag(tag: string): string {
  return tag.trim().normalize("NFKC").toLowerCase();
}

export function normalizeForumTags(tags: string[]): string[] {
  return tags.map(normalizeForumTag);
}

export type CategoryForGraph = {
  id: string;
  tags: string[];
};

export type TagBubbleConnection = {
  from: string;
  to: string;
  sharedCount: number;
};

const MAX_EDGES_PER_NODE = 4;

/**
 * 共有タグ数 >= 1 でエッジ。ノードあたり最大 MAX_EDGES_PER_NODE 本（共有数の多い順）。
 */
export function computeCategoryConnectionsFromTags(
  categories: CategoryForGraph[]
): TagBubbleConnection[] {
  const normalized = categories.map((c) => ({
    id: c.id,
    tags: new Set(normalizeForumTags(c.tags)),
  }));

  const candidates: TagBubbleConnection[] = [];

  for (let i = 0; i < normalized.length; i += 1) {
    for (let j = i + 1; j < normalized.length; j += 1) {
      const a = normalized[i];
      const b = normalized[j];
      let sharedCount = 0;
      for (const t of a.tags) {
        if (b.tags.has(t)) sharedCount += 1;
      }
      if (sharedCount >= 1) {
        candidates.push({ from: a.id, to: b.id, sharedCount });
      }
    }
  }

  candidates.sort((x, y) => y.sharedCount - x.sharedCount);

  const degree = new Map<string, number>();
  const result: TagBubbleConnection[] = [];

  for (const edge of candidates) {
    const da = degree.get(edge.from) ?? 0;
    const db = degree.get(edge.to) ?? 0;
    if (da >= MAX_EDGES_PER_NODE || db >= MAX_EDGES_PER_NODE) continue;
    result.push(edge);
    degree.set(edge.from, da + 1);
    degree.set(edge.to, db + 1);
  }

  return result;
}

export function validateForumCategoryTags(tags: unknown): { ok: true; tags: string[] } | { ok: false; error: string } {
  if (!Array.isArray(tags) || tags.length !== 3) {
    return { ok: false, error: "タグは3つ必須です" };
  }
  const trimmed = tags.map((t) => (typeof t === "string" ? t.trim() : ""));
  if (trimmed.some((t) => t.length < 2 || t.length > 24)) {
    return { ok: false, error: "各タグは2〜24文字で入力してください" };
  }
  const normalized = normalizeForumTags(trimmed);
  if (new Set(normalized).size !== 3) {
    return { ok: false, error: "タグは重複できません" };
  }
  return { ok: true, tags: trimmed };
}
