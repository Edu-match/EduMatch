import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { findPublishedServicesLegacy, isPrismaMissingColumn } from "@/lib/prisma-schema-fallback";
import type { CategoryContentItem } from "@/lib/forum-category-content";

export type ContentCandidate = {
  sourceType: "post" | "service" | "video" | "seminar_event";
  id: string;
  title: string;
  description: string;
  categoryLabel?: string;
  tags: string[];
  href: string;
  thumbnailUrl: string | null;
  meta?: string;
};

const CANDIDATE_POOL_SIZE = 48;
const DEFAULT_PICK_LIMIT = 6;

const KIND_LABEL: Record<string, string> = {
  article: "記事",
  service: "サービス",
  media: "動画",
  "events-info": "イベント",
};

function clip(text: string, max = 200): string {
  return text.replace(/\s+/g, " ").trim().slice(0, max);
}

/** DB から AI 判定用の候補プールを取得 */
export async function fetchContentCandidates(
  contentKind: string,
  poolSize = CANDIDATE_POOL_SIZE
): Promise<ContentCandidate[]> {
  switch (contentKind) {
    case "article": {
      const rows = await prisma.post.findMany({
        where: { status: "APPROVED", is_published: true },
        orderBy: [{ favorite_count: "desc" }, { created_at: "desc" }],
        take: poolSize,
        select: {
          id: true,
          title: true,
          summary: true,
          content: true,
          category: true,
          tags: true,
          thumbnail_url: true,
        },
      });
      return rows.map((p) => ({
        sourceType: "post",
        id: p.id,
        title: p.title,
        description: clip(p.summary ?? p.content ?? ""),
        categoryLabel: p.category,
        tags: p.tags ?? [],
        href: `/articles/${p.id}`,
        thumbnailUrl: p.thumbnail_url,
        meta: p.category,
      }));
    }

    case "service": {
      let rows: {
        id: string;
        title: string;
        description: string;
        category: string;
        tags: string[];
        thumbnail_url: string | null;
      }[] = [];

      try {
        const prismaRows = await prisma.service.findMany({
          where: {
            OR: [{ status: "APPROVED" }, { is_published: true }],
          },
          orderBy: [{ favorite_count: "desc" }, { created_at: "desc" }],
          take: poolSize,
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            tags: true,
            thumbnail_url: true,
          },
        });
        rows = prismaRows;
      } catch (err) {
        if (!isPrismaMissingColumn(err)) throw err;
        const legacy = await findPublishedServicesLegacy({ take: poolSize });
        rows = legacy.map((s) => ({
          id: s.id,
          title: s.title,
          description: s.description,
          category: s.category,
          tags: s.tags ?? [],
          thumbnail_url: s.thumbnail_url,
        }));
      }

      return rows.map((s) => ({
        sourceType: "service",
        id: s.id,
        title: s.title,
        description: clip(s.description ?? ""),
        categoryLabel: s.category,
        tags: s.tags ?? [],
        href: `/services/${s.id}`,
        thumbnailUrl: s.thumbnail_url,
        meta: s.category,
      }));
    }

    case "media": {
      try {
        const rows = await (
          prisma as unknown as {
            video: {
              findMany: (args: {
                where: { visibility: string };
                orderBy: { created_at: "desc" };
                take: number;
                select: {
                  id: true;
                  title: true;
                  description: true;
                  youtube_id: true;
                };
              }) => Promise<
                {
                  id: string;
                  title: string;
                  description: string | null;
                  youtube_id: string | null;
                }[]
              >;
            };
          }
        ).video.findMany({
          where: { visibility: "PUBLIC" },
          orderBy: { created_at: "desc" },
          take: poolSize,
          select: {
            id: true,
            title: true,
            description: true,
            youtube_id: true,
          },
        });
        return rows.map((v) => ({
          sourceType: "video" as const,
          id: v.id,
          title: v.title,
          description: clip(v.description ?? ""),
          tags: [],
          href: `/videos/${v.id}`,
          thumbnailUrl: v.youtube_id
            ? `https://i.ytimg.com/vi/${v.youtube_id}/hqdefault.jpg`
            : null,
        }));
      } catch {
        return [];
      }
    }

    case "events-info": {
      const rows = await prisma.seminarEvent.findMany({
        orderBy: [{ event_date: "desc" }, { created_at: "desc" }],
        take: poolSize,
        select: {
          id: true,
          title: true,
          description: true,
          event_date: true,
          venue: true,
          company: true,
          external_url: true,
        },
      });
      return rows.map((e) => ({
        sourceType: "seminar_event",
        id: e.id,
        title: e.title,
        description: clip(e.description ?? ""),
        categoryLabel: e.company ?? undefined,
        tags: [],
        href: e.external_url || `/events/${e.id}`,
        thumbnailUrl: null,
        meta: [e.event_date, e.venue].filter(Boolean).join(" / ") || undefined,
      }));
    }

    default:
      return [];
  }
}

function candidateKey(c: ContentCandidate): string {
  return `${c.sourceType}:${c.id}`;
}

/** OpenAI で大カテゴリに最も関連する候補を選ぶ */
export async function pickCategoryContentWithAI(params: {
  categoryName: string;
  categoryDescription: string;
  subCategoryName: string;
  contentKind: string;
  candidates: ContentCandidate[];
  limit?: number;
}): Promise<ContentCandidate[]> {
  const limit = params.limit ?? DEFAULT_PICK_LIMIT;
  if (params.candidates.length === 0) return [];
  if (params.candidates.length <= limit) return params.candidates.slice(0, limit);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return params.candidates.slice(0, limit);
  }

  const kindLabel = KIND_LABEL[params.contentKind] ?? params.contentKind;
  const list = params.candidates.map((c, i) => ({
    index: i,
    key: candidateKey(c),
    title: c.title,
    description: c.description,
    category: c.categoryLabel ?? "",
    tags: c.tags.slice(0, 8),
  }));

  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `あなたは教育メディアの編集者です。大カテゴリ「${params.categoryName}」の${kindLabel}ルームに載せるコンテンツを、候補リストから厳密に選びます。
- 大カテゴリの説明とテーマの一致度を最優先
- タイトル・概要・カテゴリ・タグを総合判断
- 無関係な一般記事は避ける
- 出力は JSON のみ: {"picks":[{"key":"post:xxx","score":0.0,"reason":"..."}, ...]}
- picks は関連度の高い順に最大 ${limit} 件
- key は候補の key をそのまま使う`,
      },
      {
        role: "user",
        content: `大カテゴリ: ${params.categoryName}
説明: ${params.categoryDescription || "（なし）"}
サブカテゴリ: ${params.subCategoryName}（${kindLabel}）
候補:
${JSON.stringify(list, null, 0)}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) return params.candidates.slice(0, limit);

  try {
    const parsed = JSON.parse(raw) as {
      picks?: { key?: string; score?: number }[];
    };
    const byKey = new Map(params.candidates.map((c) => [candidateKey(c), c]));
    const picked: ContentCandidate[] = [];
    for (const p of parsed.picks ?? []) {
      if (!p.key) continue;
      const c = byKey.get(p.key);
      if (c) picked.push(c);
      if (picked.length >= limit) break;
    }
    if (picked.length > 0) return picked;
  } catch {
    // fall through
  }

  return params.candidates.slice(0, limit);
}

function toCategoryContentItem(c: ContentCandidate): CategoryContentItem {
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    thumbnailUrl: c.thumbnailUrl,
    href: c.href,
    meta: c.meta,
  };
}

/** キャッシュテーブルから読み取り（テーブル未作成時は []） */
export async function readCategoryContentCache(
  categoryId: string,
  subCategoryId: string,
  contentKind: string,
  limit = DEFAULT_PICK_LIMIT
): Promise<CategoryContentItem[]> {
  try {
    const rows = await prisma.forumCategoryContentCache.findMany({
      where: { category_id: categoryId, sub_category_id: subCategoryId, content_kind: contentKind },
      orderBy: { rank_order: "asc" },
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
    if (isPrismaMissingColumn(err) || (err as { code?: string }).code === "P2021") {
      return [];
    }
    throw err;
  }
}

/** AI で選定してキャッシュを更新（日次 Cron 用） */
export async function refreshCategoryContentCache(params: {
  categoryId: string;
  categoryName: string;
  categoryDescription: string;
  subCategoryId: string;
  subCategoryName: string;
  contentKind: string;
  limit?: number;
}): Promise<{ items: CategoryContentItem[]; cached: boolean }> {
  if (params.contentKind === "community") {
    return { items: [], cached: true };
  }

  const candidates = await fetchContentCandidates(params.contentKind);
  const picked = await pickCategoryContentWithAI({
    categoryName: params.categoryName,
    categoryDescription: params.categoryDescription,
    subCategoryName: params.subCategoryName,
    contentKind: params.contentKind,
    candidates,
    limit: params.limit ?? DEFAULT_PICK_LIMIT,
  });

  const items = picked.map(toCategoryContentItem);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.forumCategoryContentCache.deleteMany({
        where: {
          category_id: params.categoryId,
          sub_category_id: params.subCategoryId,
          content_kind: params.contentKind,
        },
      });
      if (picked.length > 0) {
        await tx.forumCategoryContentCache.createMany({
          data: picked.map((c, i) => ({
            category_id: params.categoryId,
            sub_category_id: params.subCategoryId,
            content_kind: params.contentKind,
            source_type: c.sourceType,
            source_id: c.id,
            title: c.title,
            description: c.description,
            thumbnail_url: c.thumbnailUrl,
            href: c.href,
            meta: c.meta ?? null,
            rank_order: i,
            refreshed_at: new Date(),
          })),
        });
      }
    });
    return { items, cached: true };
  } catch (err) {
    console.error("[refreshCategoryContentCache]", err);
    return { items, cached: false };
  }
}
