import OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/server-admin";

export type ChatContextItem = {
  id: string;
  type: "article" | "service" | "knowledge";
  title: string;
  content: string;
};

export type KnowledgeChunkResult = {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  similarity: number;
  doc_title: string;
  doc_source_type: string;
};

const SOURCE_TYPE_LABEL: Record<string, string> = {
  curriculum_elementary: "学習指導要領（小学校）",
  curriculum_middle: "学習指導要領（中学校）",
  curriculum_high: "学習指導要領（高等学校）",
  mext_giga: "GIGAスクール構想関連",
  mext_digital: "デジタル教育・教科書",
  mext_special: "特別支援教育",
  mext_guideline: "文科省ガイドライン",
  oecd_learning: "OECD ラーニングコンパス 2030",
  oecd_teaching: "OECD ティーチングコンパス",
  oecd_other: "OECD その他",
  school_standard: "学校設置基準",
  education_plan: "教育振興基本計画",
  cue_answer: "中央教育審議会答申",
  law_education: "教育基本法・学校教育法",
  other: "公的文書（その他）",
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

function supabaseForKnowledgeSearch(): SupabaseClient {
  if (
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL
  ) {
    try {
      return createServiceRoleClient();
    } catch (e) {
      console.error("searchKnowledgeChunks: service role client failed", e);
    }
  }
  throw new Error("sync_cookie_client");
}

async function supabaseForKnowledgeSearchAsync(): Promise<SupabaseClient> {
  try {
    return supabaseForKnowledgeSearch();
  } catch {
    return createClient();
  }
}

async function rpcMatchKnowledge(
  supabase: SupabaseClient,
  queryEmbedding: number[],
  matchCount: number,
  matchThreshold: number
) {
  return supabase.rpc("match_knowledge_chunks", {
    query_embedding: queryEmbedding,
    match_count: matchCount,
    match_threshold: matchThreshold,
  });
}

/**
 * pgvector で登録済み公的文書チャンクを取得（チャット API から呼ぶ）
 * - 可能なら service role で RPC（Cookie 無しでも安定、RLS 越えて読める）
 * - 閾値は段階的に下げて再試行（0.72 だとヒットゼロになりやすい）
 */
export async function searchKnowledgeChunks(
  query: string,
  matchCount = 8
): Promise<ChatContextItem[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn("searchKnowledgeChunks: OPENAI_API_KEY missing");
      return [];
    }

    const openai = new OpenAI({ apiKey });
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: q.slice(0, 8000),
      dimensions: 1536,
    });
    const queryEmbedding = embeddingResponse.data[0]?.embedding;
    if (!queryEmbedding) return [];

    const supabase = await supabaseForKnowledgeSearchAsync();

    const tiers = [0.45, 0.32, 0.2] as const;
    let rows: KnowledgeChunkResult[] | null = null;
    for (const th of tiers) {
      const { data, error } = await rpcMatchKnowledge(
        supabase,
        queryEmbedding,
        matchCount,
        th
      );
      if (error) {
        console.error("searchKnowledgeChunks rpc error:", error);
        break;
      }
      if (data && data.length > 0) {
        rows = data as KnowledgeChunkResult[];
        break;
      }
    }

    if (!rows || rows.length === 0) {
      return [];
    }

    return rows.map((row) => ({
      id: row.id,
      type: "knowledge" as const,
      title: row.doc_title,
      content: truncate(
        [
          `文書: ${row.doc_title}`,
          `種別: ${SOURCE_TYPE_LABEL[row.doc_source_type] ?? row.doc_source_type}`,
          `\n${row.content}`,
        ].join("\n"),
        1400
      ),
    }));
  } catch (error) {
    console.error("searchKnowledgeChunks error:", error);
    return [];
  }
}

/**
 * ユーザーの発話でサービス・記事を検索し、あわせて公的文書（RAG）を常に取得する
 */
export async function searchRelevantContent(
  query: string,
  limit = 4
): Promise<{
  services: ChatContextItem[];
  articles: ChatContextItem[];
  knowledge: ChatContextItem[];
}> {
  try {
    const keywords = query
      .replace(/[。、！？「」【】\s]+/g, " ")
      .trim()
      .split(" ")
      .filter((w) => w.length >= 2)
      .slice(0, 6);

    if (keywords.length === 0) {
      const [services, knowledge] = await Promise.all([
        prisma.service.findMany({
          where: { OR: [{ status: "APPROVED" }, { is_published: true }] },
          select: {
            id: true, title: true, description: true,
            category: true, tags: true, price_info: true,
            provider: { select: { name: true } },
          },
          orderBy: { created_at: "desc" },
          take: limit,
        }),
        searchKnowledgeChunks(query),
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
              s.description ? `概要: ${s.description}` : "",
            ].filter(Boolean).join("\n"),
            MAX_SEARCH_CONTEXT_CHARS
          ),
        })),
        articles: [],
        knowledge,
      };
    }

    const orClauses = keywords.map((kw) => ({
      OR: [
        { title: { contains: kw, mode: "insensitive" as const } },
        { description: { contains: kw, mode: "insensitive" as const } },
        { category: { contains: kw, mode: "insensitive" as const } },
      ],
    }));

    const [services, articles, knowledge] = await Promise.all([
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
      searchKnowledgeChunks(query),
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
      knowledge,
    };
  } catch (error) {
    console.error("searchRelevantContent error:", error);
    return { services: [], articles: [], knowledge: [] };
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
