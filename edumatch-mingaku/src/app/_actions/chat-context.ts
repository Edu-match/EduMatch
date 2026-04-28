"use server";

import { prisma } from "@/lib/prisma";

export type ChatContextItem = {
  id: string;
  type: "article" | "service";
  title: string;
  content: string;
};

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "…";
}

const MAX_CONTEXT_CHARS = 6000;
const MAX_SEARCH_CONTEXT_CHARS = 800;

export async function getArticleContextForChat(
  id: string
): Promise<ChatContextItem | null> {
  try {
    const post = await prisma.post.findFirst({
      where: {
        id,
        OR: [{ status: "APPROVED" }, { is_published: true }],
      },
      select: {
        id: true,
        title: true,
        content: true,
        category: true,
        tags: true,
        summary: true,
      },
    });
    if (!post) return null;

    const parts: string[] = [];
    parts.push(`タイトル: ${post.title}`);
    if (post.category) parts.push(`カテゴリ: ${post.category}`);
    if (post.tags && post.tags.length > 0)
      parts.push(`タグ: ${post.tags.join(", ")}`);
    if (post.summary) parts.push(`要約: ${post.summary}`);
    if (post.content) parts.push(`\n本文:\n${stripHtml(post.content)}`);

    return {
      id: post.id,
      type: "article",
      title: post.title,
      content: truncate(parts.join("\n"), MAX_CONTEXT_CHARS),
    };
  } catch (error) {
    console.error("getArticleContextForChat error:", error);
    return null;
  }
}

/**
 * ナビゲーターモード用：ユーザーの質問キーワードでサービス・記事を検索して返す
 */
export async function searchRelevantContent(
  query: string,
  limit = 4
): Promise<{ services: ChatContextItem[]; articles: ChatContextItem[] }> {
  try {
    // クエリからキーワードを抽出（2文字以上）
    const keywords = query
      .replace(/[。、！？「」【】\s]+/g, " ")
      .trim()
      .split(" ")
      .filter((w) => w.length >= 2)
      .slice(0, 6);

    if (keywords.length === 0) {
      // キーワードなし → 人気サービス上位を返す
      const services = await prisma.service.findMany({
        where: { OR: [{ status: "APPROVED" }, { is_published: true }] },
        select: {
          id: true, title: true, description: true,
          category: true, tags: true, price_info: true,
          provider: { select: { name: true } },
        },
        orderBy: { created_at: "desc" },
        take: limit,
      });
      return {
        services: services.map((s) => ({
          id: s.id,
          type: "service" as const,
          title: s.title,
          content: truncate(
            [
              `サービス名: ${s.title}`,
              s.provider?.name ? `提供者: ${s.provider.name}` : "",
              s.category ? `カテゴリ: ${s.category}` : "",
              s.description ? `概要: ${s.description}` : "",
            ].filter(Boolean).join("\n"),
            MAX_SEARCH_CONTEXT_CHARS
          ),
        })),
        articles: [],
      };
    }

    const orClauses = keywords.map((kw) => ({
      OR: [
        { title: { contains: kw, mode: "insensitive" as const } },
        { description: { contains: kw, mode: "insensitive" as const } },
        { category: { contains: kw, mode: "insensitive" as const } },
      ],
    }));

    const [services, articles] = await Promise.all([
      prisma.service.findMany({
        where: {
          OR: [{ status: "APPROVED" }, { is_published: true }],
          AND: [{ OR: orClauses.flatMap((o) => o.OR) }],
        },
        select: {
          id: true, title: true, description: true,
          category: true, tags: true, price_info: true,
          provider: { select: { name: true } },
        },
        take: limit,
      }),
      prisma.post.findMany({
        where: {
          OR: [{ status: "APPROVED" }, { is_published: true }],
          AND: [{ OR: [
            ...keywords.map((kw) => ({ title: { contains: kw, mode: "insensitive" as const } })),
            ...keywords.map((kw) => ({ summary: { contains: kw, mode: "insensitive" as const } })),
            ...keywords.map((kw) => ({ category: { contains: kw, mode: "insensitive" as const } })),
          ]}],
        },
        select: { id: true, title: true, summary: true, category: true, tags: true },
        take: limit,
      }),
    ]);

    return {
      services: services.map((s) => ({
        id: s.id,
        type: "service" as const,
        title: s.title,
        content: truncate(
          [
            `サービス名: ${s.title}`,
            s.provider?.name ? `提供者: ${s.provider.name}` : "",
            s.category ? `カテゴリ: ${s.category}` : "",
            s.tags?.length ? `タグ: ${s.tags.join(", ")}` : "",
            s.description ? `概要: ${s.description}` : "",
            s.price_info ? `料金: ${s.price_info}` : "",
          ].filter(Boolean).join("\n"),
          MAX_SEARCH_CONTEXT_CHARS
        ),
      })),
      articles: articles.map((a) => ({
        id: a.id,
        type: "article" as const,
        title: a.title,
        content: truncate(
          [
            `タイトル: ${a.title}`,
            a.category ? `カテゴリ: ${a.category}` : "",
            a.tags?.length ? `タグ: ${a.tags.join(", ")}` : "",
            a.summary ? `要約: ${a.summary}` : "",
          ].filter(Boolean).join("\n"),
          MAX_SEARCH_CONTEXT_CHARS
        ),
      })),
    };
  } catch (error) {
    console.error("searchRelevantContent error:", error);
    return { services: [], articles: [] };
  }
}

export async function getServiceContextForChat(
  id: string
): Promise<ChatContextItem | null> {
  try {
    const service = await prisma.service.findFirst({
      where: {
        id,
        OR: [{ status: "APPROVED" }, { is_published: true }],
      },
      select: {
        id: true,
        title: true,
        description: true,
        content: true,
        category: true,
        tags: true,
        price_info: true,
        provider: { select: { name: true } },
      },
    });
    if (!service) return null;

    const parts: string[] = [];
    parts.push(`サービス名: ${service.title}`);
    if (service.provider?.name)
      parts.push(`提供者: ${service.provider.name}`);
    if (service.category) parts.push(`カテゴリ: ${service.category}`);
    if (service.tags && service.tags.length > 0)
      parts.push(`タグ: ${service.tags.join(", ")}`);
    if (service.description) parts.push(`概要: ${service.description}`);
    if (service.price_info) parts.push(`料金: ${service.price_info}`);
    if (service.content) parts.push(`\n詳細:\n${stripHtml(service.content)}`);

    return {
      id: service.id,
      type: "service",
      title: service.title,
      content: truncate(parts.join("\n"), MAX_CONTEXT_CHARS),
    };
  } catch (error) {
    console.error("getServiceContextForChat error:", error);
    return null;
  }
}
