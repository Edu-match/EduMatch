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
  /** バックボーン用の並び（API の sortOrder） */
  sortOrder?: number;
};

export type TagBubbleConnection = {
  from: string;
  to: string;
  sharedCount: number;
};

const MAX_EDGES_PER_NODE = 4;

type NormalizedCategory = { id: string; tags: Set<string> };
type Pair = { from: string; to: string; sharedCount: number };

function countSharedTags(a: Set<string>, b: Set<string>): number {
  let sharedCount = 0;
  for (const t of a) {
    if (b.has(t)) sharedCount += 1;
  }
  return sharedCount;
}

function canonicalPairKey(a: string, b: string): string {
  return a < b ? `${a}::${b}` : `${b}::${a}`;
}

function buildAllPairs(normalized: NormalizedCategory[]): Pair[] {
  const pairs: Pair[] = [];
  for (let i = 0; i < normalized.length; i += 1) {
    for (let j = i + 1; j < normalized.length; j += 1) {
      const a = normalized[i];
      const b = normalized[j];
      pairs.push({
        from: a.id,
        to: b.id,
        sharedCount: countSharedTags(a.tags, b.tags),
      });
    }
  }
  return pairs;
}

function comparePairs(a: Pair, b: Pair): number {
  if (b.sharedCount !== a.sharedCount) return b.sharedCount - a.sharedCount;
  return canonicalPairKey(a.from, a.to).localeCompare(canonicalPairKey(b.from, b.to));
}

/**
 * 1) 共有タグ >= 1 を優先（ノード最大 MAX_EDGES_PER_NODE）
 * 2) 孤立ノードには必ず1本（上限超え可）
 * 3) 連結成分が複数なら橋渡しエッジを追加
 */
export function computeCategoryConnectionsFromTags(
  categories: CategoryForGraph[]
): TagBubbleConnection[] {
  if (categories.length <= 1) return [];

  const sorted = [...categories].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id.localeCompare(b.id)
  );

  const normalized: NormalizedCategory[] = sorted.map((c) => ({
    id: c.id,
    tags: new Set(normalizeForumTags(c.tags)),
  }));

  const pairs = buildAllPairs(normalized).sort(comparePairs);
  const degree = new Map<string, number>();
  const seen = new Set<string>();
  const result: TagBubbleConnection[] = [];

  const tryAdd = (
    from: string,
    to: string,
    sharedCount: number,
    opts?: { force?: boolean }
  ): boolean => {
    const key = canonicalPairKey(from, to);
    if (seen.has(key)) return false;
    const da = degree.get(from) ?? 0;
    const db = degree.get(to) ?? 0;
    if (!opts?.force && (da >= MAX_EDGES_PER_NODE || db >= MAX_EDGES_PER_NODE)) {
      return false;
    }
    seen.add(key);
    result.push({ from, to, sharedCount });
    degree.set(from, da + 1);
    degree.set(to, db + 1);
    return true;
  };

  // Phase 1: 共有タグあり
  for (const pair of pairs) {
    if (pair.sharedCount >= 1) tryAdd(pair.from, pair.to, pair.sharedCount);
  }

  // Phase 2: 各ノードに最低1本
  for (const node of normalized) {
    if ((degree.get(node.id) ?? 0) > 0) continue;

    const incident = pairs
      .filter((p) => p.from === node.id || p.to === node.id)
      .sort(comparePairs);

    let linked = false;
    for (const pair of incident) {
      const other = pair.from === node.id ? pair.to : pair.from;
      if (tryAdd(node.id, other, pair.sharedCount, { force: true })) {
        linked = true;
        break;
      }
    }

    if (!linked && normalized.length > 1) {
      const idx = normalized.findIndex((n) => n.id === node.id);
      const next = normalized[(idx + 1) % normalized.length];
      tryAdd(node.id, next.id, 0, { force: true });
    }
  }

  // Phase 3: グラフ全体を1連結成分に
  const parent = new Map<string, string>();
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) {
      root = parent.get(root)!;
    }
    let cur = id;
    while (parent.get(cur) !== root) {
      const next = parent.get(cur)!;
      parent.set(cur, root);
      cur = next;
    }
    return root;
  };
  const unite = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  for (const node of normalized) parent.set(node.id, node.id);
  for (const edge of result) unite(edge.from, edge.to);

  const componentCount = () => new Set(normalized.map((n) => find(n.id))).size;

  let guard = 0;
  while (componentCount() > 1 && guard < normalized.length ** 2) {
    guard += 1;

    let bridge: Pair | null = null;
    for (const pair of pairs) {
      if (find(pair.from) === find(pair.to)) continue;
      if (!bridge || pair.sharedCount > bridge.sharedCount) bridge = pair;
    }

    if (!bridge) {
      const byRoot = new Map<string, string[]>();
      for (const node of normalized) {
        const root = find(node.id);
        if (!byRoot.has(root)) byRoot.set(root, []);
        byRoot.get(root)!.push(node.id);
      }
      const groups = [...byRoot.values()];
      bridge = { from: groups[0][0], to: groups[1][0], sharedCount: 0 };
    }

    if (!tryAdd(bridge.from, bridge.to, bridge.sharedCount, { force: true })) {
      break;
    }
    unite(bridge.from, bridge.to);
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
