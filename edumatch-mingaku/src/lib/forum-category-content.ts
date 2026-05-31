import { prisma } from "@/lib/prisma";

export type CategoryContentItem = {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  href: string;
  meta?: string;
};

/**
 * サブカテゴリの種別（content_kind）と大カテゴリ名に応じて、
 * 関連する既存DBコンテンツ（記事・サービス・メディア・イベント）を返す。
 * community の場合はコンテンツなし（空配列）。
 */
export async function getCategoryRoomContent(
  categoryName: string,
  contentKind: string,
  limit = 6
): Promise<CategoryContentItem[]> {
  const q = categoryName.trim();

  try {
    switch (contentKind) {
      case "article": {
        const matched = await prisma.post.findMany({
          where: {
            status: "APPROVED",
            is_published: true,
            OR: [
              { category: { contains: q, mode: "insensitive" } },
              { title: { contains: q, mode: "insensitive" } },
              { tags: { has: q } },
            ],
          },
          orderBy: [{ favorite_count: "desc" }, { created_at: "desc" }],
          take: limit,
          select: {
            id: true,
            title: true,
            summary: true,
            content: true,
            thumbnail_url: true,
            category: true,
          },
        });
        const list = matched.length
          ? matched
          : await prisma.post.findMany({
              where: { status: "APPROVED", is_published: true },
              orderBy: [{ favorite_count: "desc" }, { created_at: "desc" }],
              take: limit,
              select: {
                id: true,
                title: true,
                summary: true,
                content: true,
                thumbnail_url: true,
                category: true,
              },
            });
        return list.map((p) => ({
          id: p.id,
          title: p.title,
          description: (p.summary ?? p.content ?? "").slice(0, 120),
          thumbnailUrl: p.thumbnail_url,
          href: `/articles/${p.id}`,
          meta: p.category,
        }));
      }

      case "service": {
        const matched = await prisma.service.findMany({
          where: {
            status: "APPROVED",
            is_published: true,
            OR: [
              { category: { contains: q, mode: "insensitive" } },
              { title: { contains: q, mode: "insensitive" } },
              { tags: { has: q } },
            ],
          },
          orderBy: [{ display_order: "asc" }, { favorite_count: "desc" }],
          take: limit,
          select: {
            id: true,
            title: true,
            description: true,
            thumbnail_url: true,
            category: true,
          },
        });
        const list = matched.length
          ? matched
          : await prisma.service.findMany({
              where: { status: "APPROVED", is_published: true },
              orderBy: [{ display_order: "asc" }, { favorite_count: "desc" }],
              take: limit,
              select: {
                id: true,
                title: true,
                description: true,
                thumbnail_url: true,
                category: true,
              },
            });
        return list.map((s) => ({
          id: s.id,
          title: s.title,
          description: (s.description ?? "").slice(0, 120),
          thumbnailUrl: s.thumbnail_url,
          href: `/services/${s.id}`,
          meta: s.category,
        }));
      }

      case "media": {
        const matched = await prisma.video.findMany({
          where: {
            visibility: "PUBLIC",
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          },
          orderBy: { created_at: "desc" },
          take: limit,
          select: {
            id: true,
            title: true,
            description: true,
            youtube_id: true,
          },
        });
        const list = matched.length
          ? matched
          : await prisma.video.findMany({
              where: { visibility: "PUBLIC" },
              orderBy: { created_at: "desc" },
              take: limit,
              select: {
                id: true,
                title: true,
                description: true,
                youtube_id: true,
              },
            });
        return list.map((v) => ({
          id: v.id,
          title: v.title,
          description: (v.description ?? "").slice(0, 120),
          thumbnailUrl: v.youtube_id
            ? `https://i.ytimg.com/vi/${v.youtube_id}/hqdefault.jpg`
            : null,
          href: `/videos/${v.id}`,
        }));
      }

      case "events-info": {
        const matched = await prisma.seminarEvent.findMany({
          where: {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { company: { contains: q, mode: "insensitive" } },
            ],
          },
          orderBy: [{ event_date: "desc" }, { created_at: "desc" }],
          take: limit,
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
        const list = matched.length
          ? matched
          : await prisma.seminarEvent.findMany({
              orderBy: [{ event_date: "desc" }, { created_at: "desc" }],
              take: limit,
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
        return list.map((e) => ({
          id: e.id,
          title: e.title,
          description: (e.description ?? "").slice(0, 120),
          thumbnailUrl: null,
          href: e.external_url || `/events/${e.id}`,
          meta: [e.event_date, e.venue].filter(Boolean).join(" / ") || undefined,
        }));
      }

      default:
        return [];
    }
  } catch (err) {
    console.error("[getCategoryRoomContent]", err);
    return [];
  }
}
