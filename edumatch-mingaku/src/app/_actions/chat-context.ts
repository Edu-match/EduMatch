import OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/server-admin";
import type { ChatActivityPhase } from "@/lib/ai-chat-stream";

export type ChatContextItem = {
  id: string;
  type: "article" | "service" | "knowledge";
  title: string;
  content: string;
  /** RAG ドキュメントの参照 URL（knowledge タイプのみ） */
  sourceUrl?: string | null;
};

export type KnowledgeChunkResult = {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  similarity: number;
  doc_title: string;
  doc_source_type: string;
  doc_source_url?: string | null;
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
const SERVICE_NAME_ALIAS_GROUPS: string[][] = [
  ["one lead", "onelead", "ワンリード", "わんりーど"],
];

function expandSearchKeywordsWithAliases(query: string, baseKeywords: string[]): string[] {
  const normalizedQuery = query.toLowerCase().normalize("NFKC");
  const compactQuery = normalizedQuery.replace(/\s+/g, "");
  const result = new Set(baseKeywords);

  for (const group of SERVICE_NAME_ALIAS_GROUPS) {
    const normalizedGroup = group.map((name) => name.toLowerCase().normalize("NFKC"));
    const matched = normalizedGroup.some((name) => {
      const compactName = name.replace(/\s+/g, "");
      return normalizedQuery.includes(name) || compactQuery.includes(compactName);
    });
    if (!matched) continue;
    for (const name of normalizedGroup) {
      result.add(name);
      result.add(name.replace(/\s+/g, ""));
    }
  }

  return Array.from(result).filter((w) => w.length >= 2).slice(0, 12);
}

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
  // PostgREST は vector 型パラメータに対してテキスト→vector のキャストを使うため
  // 文字列形式 "[0.1,0.2,...]" の方が確実に型変換される
  const embeddingStr = `[${queryEmbedding.join(",")}]`;
  return supabase.rpc("match_knowledge_chunks", {
    query_embedding: embeddingStr,
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
      model: "text-embedding-3-large",
      input: q.slice(0, 8000),
      dimensions: 1536,
    });
    const queryEmbedding = embeddingResponse.data[0]?.embedding;
    if (!queryEmbedding) return [];

    const supabase = await supabaseForKnowledgeSearchAsync();

    const tiers = [0.45, 0.32, 0.2] as const;
    let rows: KnowledgeChunkResult[] | null = null;
    let lastRpcError: unknown = null;
    for (const th of tiers) {
      const { data, error } = await rpcMatchKnowledge(
        supabase,
        queryEmbedding,
        matchCount,
        th
      );
      if (error) {
        lastRpcError = error;
        console.error(
          `searchKnowledgeChunks rpc error (threshold=${th}):`,
          JSON.stringify(error)
        );
        // エラーが出てもループを継続せず打ち切る（同じエラーが繰り返されるため）
        break;
      }
      console.log(`searchKnowledgeChunks: threshold=${th}, hits=${data?.length ?? 0}`);
      if (data && data.length > 0) {
        rows = data as KnowledgeChunkResult[];
        break;
      }
    }
    if (lastRpcError) {
      console.error("searchKnowledgeChunks: all tiers failed, last error:", lastRpcError);
    }

    if (!rows || rows.length === 0) {
      return [];
    }

    // ドキュメントの source_url を取得（RPC が返さない場合は Prisma で補完）
    const docIds = [...new Set(rows.map((r) => r.document_id))];
    const sourceUrlMap: Record<string, string | null> = {};
    try {
      const docs = await prisma.knowledgeDocument.findMany({
        where: { id: { in: docIds } },
        select: { id: true, source_url: true },
      });
      for (const d of docs) sourceUrlMap[d.id] = d.source_url ?? null;
    } catch {
      // source_url 取得に失敗しても検索結果は返す
    }

    return rows.map((row) => ({
      id: row.id,
      type: "knowledge" as const,
      title: row.doc_title,
      sourceUrl: row.doc_source_url ?? sourceUrlMap[row.document_id] ?? null,
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
 * アプリコンテンツチャンクをセマンティック検索（ベクトル検索）
 */
export async function searchAppContent(
  query: string,
  matchCount = 8
): Promise<ChatContextItem[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn("searchAppContent: OPENAI_API_KEY missing");
      return [];
    }

    const openai = new OpenAI({ apiKey });

    // クエリをベクトル化
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: q.slice(0, 8000),
      dimensions: 1536,
    });
    const queryEmbedding = embeddingResponse.data[0]?.embedding;
    if (!queryEmbedding) return [];

    // Supabase RPC でセマンティック検索
    const supabase = await supabaseForKnowledgeSearchAsync();
    const { data: chunks, error } = await supabase.rpc(
      "search_app_content_chunks",
      {
        query_embedding: `[${queryEmbedding.join(",")}]`,
        match_count: matchCount,
        match_threshold: 0.3, // アプリコンテンツは閾値を低めに
      }
    );

    if (error) {
      console.error("searchAppContent rpc error:", error);
      return [];
    }

    if (!chunks || chunks.length === 0) return [];

    // グループ化：ソースごとに最初のチャンクのみ取得（重複排除）
    const grouped = new Map<string, any>();
    for (const chunk of chunks) {
      const key = `${chunk.source_table}:${chunk.source_id}`;
      if (!grouped.has(key)) {
        grouped.set(key, chunk);
      }
    }

    const groupedArray = Array.from(grouped.values());

    // ── 公開ステータスフィルタリング ─────────────────────────────────────────
    // RPC はチャンクのベクトル検索のみを行うため、非公開コンテンツが混入する場合がある。
    // post / service については Prisma で公開済みかどうかを確認してフィルタする。
    const postIds = groupedArray
      .filter((c) => c.source_table === "post")
      .map((c) => c.source_id as string);
    const serviceIds = groupedArray
      .filter((c) => c.source_table === "service")
      .map((c) => c.source_id as string);

    const [publishedPosts, publishedServices] = await Promise.all([
      postIds.length > 0
        ? prisma.post.findMany({
            where: {
              id: { in: postIds },
              OR: [{ status: "APPROVED" }, { is_published: true }],
            },
            select: { id: true },
          })
        : Promise.resolve([]),
      serviceIds.length > 0
        ? prisma.service.findMany({
            where: {
              id: { in: serviceIds },
              OR: [{ status: "APPROVED" }, { is_published: true }],
            },
            select: { id: true },
          })
        : Promise.resolve([]),
    ]);

    const publishedPostSet = new Set(publishedPosts.map((p) => p.id));
    const publishedServiceSet = new Set(publishedServices.map((s) => s.id));

    const filteredChunks = groupedArray.filter((chunk) => {
      if (chunk.source_table === "post") return publishedPostSet.has(chunk.source_id);
      if (chunk.source_table === "service") return publishedServiceSet.has(chunk.source_id);
      // forum_post / review / seminar_event / site_update は別の公開ロジックのためそのまま
      return true;
    });

    // ChatContextItem に変換
    return filteredChunks.map((chunk: any) => {
      const typeLabel: Record<string, "article" | "service"> = {
        post: "article",
        service: "service",
        review: "service",
        forum_post: "article",
        seminar_event: "service",
        site_update: "article",
      };

      return {
        id: chunk.source_id,
        type: (typeLabel[chunk.source_table] || "article") as "article" | "service",
        title: chunk.source_title,
        content: [
          `タイプ: ${chunk.source_type_label || chunk.source_table}`,
          `タイトル: ${chunk.source_title}`,
          ...(chunk.source_category ? [`カテゴリ: ${chunk.source_category}`] : []),
          `\n${truncate(chunk.content, 1200)}`,
        ]
          .filter(Boolean)
          .join("\n"),
      };
    });
  } catch (error) {
    console.error("searchAppContent error:", error);
    return [];
  }
}

/** `retrieveChatContext` が使う emit コールバックの型 */
export type ActivityEmit = (
  event:
    | { type: "status"; id: string; phase: ChatActivityPhase; message: string; submessage?: string; status: "active" }
    | { type: "status_update"; id: string; message?: string; submessage?: string; status: "done" | "skipped" }
) => void;

/** キーワードフォールバック検索（セマンティック結果が不足時に使用） */
async function keywordFallbackSearch(
  query: string,
  currentServices: ChatContextItem[],
  currentArticles: ChatContextItem[],
  limit: number
): Promise<{ services: ChatContextItem[]; articles: ChatContextItem[] }> {
  const baseKeywords = query
    .replace(/[。、！？「」【】\s]+/g, " ")
    .trim()
    .split(" ")
    .filter((w) => w.length >= 2)
    .slice(0, 6);
  const keywords = expandSearchKeywordsWithAliases(query, baseKeywords);
  if (keywords.length === 0) return { services: currentServices, articles: currentArticles };

  const orClauses = keywords.map((kw) => ({
    OR: [
      { title: { contains: kw, mode: "insensitive" as const } },
      { description: { contains: kw, mode: "insensitive" as const } },
      { category: { contains: kw, mode: "insensitive" as const } },
    ],
  }));

  const [keywordServices, keywordArticles] = await Promise.all([
    currentServices.length < limit
      ? prisma.service.findMany({
          where: {
            OR: [{ status: "APPROVED" }, { is_published: true }],
            AND: [{ OR: orClauses.flatMap((o) => o.OR) }],
          },
          select: {
            id: true, title: true, description: true,
            category: true, tags: true, price_info: true,
            provider: { select: { name: true } },
          },
          take: limit - currentServices.length,
        })
      : Promise.resolve([]),
    currentArticles.length < limit
      ? prisma.post.findMany({
          where: {
            OR: [{ status: "APPROVED" }, { is_published: true }],
            AND: [{ OR: [
              ...keywords.map((kw) => ({ title: { contains: kw, mode: "insensitive" as const } })),
              ...keywords.map((kw) => ({ summary: { contains: kw, mode: "insensitive" as const } })),
              ...keywords.map((kw) => ({ category: { contains: kw, mode: "insensitive" as const } })),
            ]}],
          },
          select: { id: true, title: true, summary: true, category: true, tags: true },
          take: limit - currentArticles.length,
        })
      : Promise.resolve([]),
  ]);

  const serviceIds = new Set(currentServices.map((s) => s.id));
  const additionalServices = keywordServices
    .filter((s) => !serviceIds.has(s.id))
    .map((s) => ({
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
    }));

  const articleIds = new Set(currentArticles.map((a) => a.id));
  const additionalArticles = keywordArticles
    .filter((a) => !articleIds.has(a.id))
    .map((a) => ({
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
    }));

  return {
    services: [...currentServices, ...additionalServices].slice(0, limit),
    articles: [...currentArticles, ...additionalArticles].slice(0, limit),
  };
}

/**
 * 段階的コンテキスト取得（SSE 進捗ステータスを emit しながら検索する）。
 * `emit` が省略された場合は emit なしで通常実行する。
 */
export async function retrieveChatContext(
  query: string,
  limit = 4,
  emit?: ActivityEmit
): Promise<{
  services: ChatContextItem[];
  articles: ChatContextItem[];
  knowledge: ChatContextItem[];
}> {
  const e: ActivityEmit = emit ?? (() => {});

  try {
    // ── Step 1: 分析開始 ──────────────────────────────────────────────────────
    e({ type: "status", id: "analyze", phase: "analyze",
      message: "ご質問の内容を分析し、AIUEO BASE内の関連情報を探しています…",
      status: "active" });
    e({ type: "status_update", id: "analyze", status: "done" });

    // ── Step 2: サイト内セマンティック検索 ──────────────────────────────────
    e({ type: "status", id: "site-search", phase: "site_search",
      message: "登録されているサービス・記事をセマンティック検索しています…",
      submessage: "意味が近いコンテンツをベクトル検索で探索中",
      status: "active" });

    const appContent = await searchAppContent(query, limit * 2);
    const appServices = appContent.filter((c) => c.type === "service");
    const appArticles = appContent.filter((c) => c.type === "article");
    let services = appServices.slice(0, limit);
    let articles = appArticles.slice(0, limit);

    // ヒット件数の上位 5 件を1件ずつ表示
    const sitePreview = [...services.slice(0, 3), ...articles.slice(0, 2)].slice(0, 5);
    for (const item of sitePreview) {
      const label = item.type === "service" ? "サービス" : "記事";
      e({ type: "status", id: `site-item-${item.id}`, phase: "site_item",
        message: `${label}「${item.title}」の内容を閲覧して情報を取得中…`,
        status: "active" });
      e({ type: "status_update", id: `site-item-${item.id}`, status: "done" });
    }
    if (sitePreview.length < appContent.length) {
      const extra = appContent.length - sitePreview.length;
      e({ type: "status", id: "site-extra", phase: "site_item",
        message: `他 ${extra} 件のコンテンツも確認しています…`,
        status: "active" });
      e({ type: "status_update", id: "site-extra", status: "done" });
    }

    // ── Step 3: キーワードフォールバック ────────────────────────────────────
    const needFallback = services.length < limit || articles.length < limit;
    if (needFallback) {
      e({ type: "status", id: "keyword-fallback", phase: "keyword_fallback",
        message: "キーワード検索で追加候補を探索しています…",
        submessage: "タイトル・概要・カテゴリで絞り込み中",
        status: "active" });
      const fb = await keywordFallbackSearch(query, services, articles, limit);
      services = fb.services;
      articles = fb.articles;
      e({ type: "status_update", id: "keyword-fallback",
        message: "キーワード検索で追加候補を確認しました",
        status: "done" });
    }

    e({ type: "status_update", id: "site-search", status: "done" });

    // ── サイト検索サマリー ───────────────────────────────────────────────────
    const totalSite = services.length + articles.length;
    if (totalSite > 0) {
      e({ type: "status", id: "site-done", phase: "site_done",
        message: `AIUEO BASE内から ${totalSite} 件の関連情報を取得しました`,
        status: "active" });
      e({ type: "status_update", id: "site-done", status: "done" });
    } else {
      e({ type: "status", id: "site-empty", phase: "site_empty",
        message: "該当するサービス・記事は見つかりませんでした。公的文書の参照に進みます…",
        status: "active" });
      e({ type: "status_update", id: "site-empty", status: "done" });
    }

    // ── Step 4: 公的文書 RAG ────────────────────────────────────────────────
    e({ type: "status", id: "rag-search", phase: "rag_search",
      message: "登録済みの公的文書データベースを参照しています…",
      status: "active" });
    e({ type: "status", id: "rag-detail", phase: "rag_search",
      message: "学習指導要領・文科省資料・OECD 資料などから関連箇所をベクトル検索しています…",
      submessage: "pgvector セマンティック検索中",
      status: "active" });

    const knowledge = await searchKnowledgeChunks(query);

    e({ type: "status_update", id: "rag-detail", status: "done" });

    // ヒット件数の上位 5 件を1件ずつ表示
    const ragPreview = knowledge.slice(0, 5);
    for (let i = 0; i < ragPreview.length; i++) {
      const item = ragPreview[i];
      e({ type: "status", id: `rag-item-${i}`, phase: "rag_item",
        message: `「${item.title}」を閲覧して情報を取得中…`,
        status: "active" });
      e({ type: "status_update", id: `rag-item-${i}`, status: "done" });
    }
    if (knowledge.length > 5) {
      e({ type: "status", id: "rag-extra", phase: "rag_item",
        message: `他 ${knowledge.length - 5} 件の公的文書も参照しています…`,
        status: "active" });
      e({ type: "status_update", id: "rag-extra", status: "done" });
    }

    e({ type: "status_update", id: "rag-search", status: "done" });

    // ── RAG サマリー ─────────────────────────────────────────────────────────
    if (knowledge.length > 0) {
      e({ type: "status", id: "rag-done", phase: "rag_done",
        message: `公的文書から ${knowledge.length} 件の根拠情報を取得しました`,
        status: "active" });
      e({ type: "status_update", id: "rag-done", status: "done" });
    } else {
      e({ type: "status", id: "rag-empty", phase: "rag_empty",
        message: "登録済みの公的文書で直接一致する情報はありませんでした",
        status: "active" });
      e({ type: "status_update", id: "rag-empty", status: "done" });
    }

    return {
      services: services.slice(0, limit),
      articles: articles.slice(0, limit),
      knowledge,
    };
  } catch (error) {
    console.error("retrieveChatContext error:", error);
    return { services: [], articles: [], knowledge: [] };
  }
}

/**
 * ユーザーの発話でサービス・記事を検索し、あわせて公的文書（RAG）を常に取得する
 * （後方互換ラッパー。内部で retrieveChatContext を使用）
 */
export async function searchRelevantContent(
  query: string,
  limit = 4
): Promise<{
  services: ChatContextItem[];
  articles: ChatContextItem[];
  knowledge: ChatContextItem[];
}> {
  return retrieveChatContext(query, limit);
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
