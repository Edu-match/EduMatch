/**
 * リアルタイム再インデックス API
 * Prisma middleware からのリインデックスリクエストを処理
 * 既存チャンクを削除＆新しいチャンクを生成＆Embedding を付与
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { cleanAndChunk, chunksFromMultipleFields, truncate } from "@/lib/chunking-utils";
import OpenAI from "openai";
import { createServiceRoleClient } from "@/utils/supabase/server-admin";

const REINDEX_TOKEN = process.env.REINDEX_API_TOKEN || "development-token";

interface ReindexRequest {
  table: string;
  id: string;
  action: "upsert" | "delete";
  timestamp: string;
}

function toStorageTarget(table: string, id: string): { sourceTable: string; sourceId: string } {
  if (table === "sitePage") {
    return { sourceTable: "site_update", sourceId: `site-page:${id}` };
  }
  return { sourceTable: table, sourceId: id };
}

async function getOpenAIClient(): Promise<OpenAI> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not set");
  }
  return new OpenAI({ apiKey });
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: NextRequest) {
  try {
    // Token 検証
    const token = req.headers.get("X-Reindex-Token");
    if (token !== REINDEX_TOKEN) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const body: ReindexRequest = await req.json();
    const { table, id, action } = body;
    const storageTarget = toStorageTarget(table, id);

    if (!table || !id || !action) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: table, id, action" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = await createServiceRoleClient();

    // 1. 既存チャンクを削除
    const { error: deleteError } = await supabase
      .from("app_content_chunks")
      .delete()
      .eq("source_table", storageTarget.sourceTable)
      .eq("source_id", storageTarget.sourceId);

    if (deleteError) {
      console.error(`Failed to delete chunks for ${table}:${id}:`, deleteError);
      // 削除エラーは非致命的（続行）
    }

    // 2. DELETE アクションの場合はここで終了
    if (action === "delete") {
      return new Response(
        JSON.stringify({ success: true, action: "delete", deleted: true }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. UPSERT アクション：新しいチャンクを生成
    const chunks = await generateChunksForContent(table, id);
    if (chunks.length === 0) {
      // コンテンツが見つからないか、非公開
      return new Response(
        JSON.stringify({
          success: true,
          action: "upsert",
          chunks: 0,
          reason: "No publishable content found",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Embedding 生成
    const texts = chunks.map((c) => c.content);
    const openai = await getOpenAIClient();
    const embeddings = await batchEmbedTexts(texts, openai);

    if (embeddings.length !== chunks.length) {
      throw new Error(`Embedding count mismatch: ${embeddings.length} vs ${chunks.length}`);
    }

    // 5. Supabase に挿入
    const rows = chunks.map((chunk, idx) => ({
      source_table: chunk.source_table,
      source_id: chunk.source_id,
      source_title: chunk.source_title,
      source_category: chunk.source_category ?? null,
      source_type_label: chunk.source_type_label,
      author_id: chunk.author_id ?? null,
      chunk_index: chunk.chunk_index,
      content: chunk.content,
      embedding: embeddings[idx],
      is_published: true,
    }));

    const { error: insertError } = await supabase
      .from("app_content_chunks")
      .insert(rows);

    if (insertError) {
      console.error(`Failed to insert chunks for ${table}:${id}:`, insertError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to insert chunks",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        action: "upsert",
        chunks: chunks.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Reindex error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// ─── Helper Functions ───

interface ContentChunk {
  source_table: string;
  source_id: string;
  source_title: string;
  source_category?: string | null;
  source_type_label: string;
  author_id?: string | null;
  chunk_index: number;
  content: string;
}

async function generateChunksForContent(
  table: string,
  id: string
): Promise<ContentChunk[]> {
  const chunks: ContentChunk[] = [];

  try {
    if (table === "service") {
      const service = await prisma.service.findFirst({
        where: {
          id,
          OR: [{ status: "APPROVED" }, { is_published: true }],
          rejected_at: null,
        },
        select: {
          id: true,
          title: true,
          description: true,
          content: true,
          category: true,
          provider_id: true,
        },
      });

      if (!service) return [];

      const combined = chunksFromMultipleFields([
        service.title,
        service.description,
        service.content,
      ]);

      for (let i = 0; i < combined.length; i++) {
        chunks.push({
          source_table: "service",
          source_id: service.id,
          source_title: service.title,
          source_category: service.category,
          source_type_label: "サービス",
          author_id: service.provider_id,
          chunk_index: i,
          content: truncate(combined[i], 2500),
        });
      }
    } else if (table === "post") {
      const post = await prisma.post.findFirst({
        where: {
          id,
          OR: [{ status: "APPROVED" }, { is_published: true }],
        },
        select: {
          id: true,
          title: true,
          content: true,
          summary: true,
          category: true,
          provider_id: true,
        },
      });

      if (!post) return [];

      const combined = chunksFromMultipleFields([
        post.title,
        post.summary,
        post.content,
      ]);

      for (let i = 0; i < combined.length; i++) {
        chunks.push({
          source_table: "post",
          source_id: post.id,
          source_title: post.title,
          source_category: post.category,
          source_type_label: "記事",
          author_id: post.provider_id,
          chunk_index: i,
          content: truncate(combined[i], 2500),
        });
      }
    } else if (table === "review") {
      const review = await prisma.review.findFirst({
        where: { id, is_approved: true },
        select: {
          id: true,
          service_id: true,
          body: true,
          user_id: true,
          service: { select: { title: true, category: true } },
        },
      });

      if (!review) return [];

      const combined = chunksFromMultipleFields([
        `Review of ${review.service.title}`,
        review.body,
      ]);

      for (let i = 0; i < combined.length; i++) {
        chunks.push({
          source_table: "review",
          source_id: review.id,
          source_title: `${review.service.title} のレビュー`,
          source_category: review.service.category,
          source_type_label: "レビュー",
          author_id: review.user_id,
          chunk_index: i,
          content: truncate(combined[i], 2500),
        });
      }
    } else if (table === "forum_post") {
      const forumPost = await prisma.forumPost.findFirst({
        where: { id },
        select: {
          id: true,
          body: true,
          topic_id: true,
          author_id: true,
          replies: {
            select: {
              author_name: true,
              body: true,
            },
            orderBy: { created_at: "asc" },
          },
        },
      });

      if (!forumPost) return [];

      const replyContext =
        forumPost.replies.length > 0
          ? forumPost.replies
              .slice(0, 20)
              .map((r) => `返信（${r.author_name}）: ${r.body}`)
              .join("\n")
          : "";
      const combined = chunksFromMultipleFields([
        forumPost.body,
        replyContext ? `この投稿への返信文脈:\n${replyContext}` : "",
      ]);
      // タイトルは最初の100文字から生成
      const postTitle = forumPost.body.slice(0, 100).replace(/\n+/g, " ") + (forumPost.body.length > 100 ? "..." : "");

      for (let i = 0; i < combined.length; i++) {
        chunks.push({
          source_table: "forum_post",
          source_id: forumPost.id,
          source_title: postTitle,
          source_category: forumPost.topic_id,
          source_type_label: "フォーラム投稿",
          author_id: forumPost.author_id,
          chunk_index: i,
          content: truncate(combined[i], 2500),
        });
      }
    } else if (table === "seminar_event") {
      const event = await prisma.seminarEvent.findFirst({
        where: { id },
        select: {
          id: true,
          title: true,
          description: true,
          venue: true,
          company: true,
        },
      });

      if (!event) return [];

      const combined = chunksFromMultipleFields([
        event.title,
        event.description,
        event.venue,
        event.company,
      ]);

      for (let i = 0; i < combined.length; i++) {
        chunks.push({
          source_table: "seminar_event",
          source_id: event.id,
          source_title: event.title,
          source_category: event.company,
          source_type_label: "セミナー・イベント",
          chunk_index: i,
          content: truncate(combined[i], 2500),
        });
      }
    } else if (table === "site_update") {
      const update = await prisma.siteUpdate.findFirst({
        where: {
          id,
          published_at: { lte: new Date() }, // 公開済み
        },
        select: {
          id: true,
          title: true,
          body: true,
          category: true,
        },
      });

      if (!update) return [];

      const combined = chunksFromMultipleFields([update.title, update.body]);

      for (let i = 0; i < combined.length; i++) {
        chunks.push({
          source_table: "site_update",
          source_id: update.id,
          source_title: update.title,
          source_category: update.category,
          source_type_label: "更新情報",
          chunk_index: i,
          content: truncate(combined[i], 2500),
        });
      }
    } else if (table === "sitePage") {
      const page = await prisma.sitePage.findFirst({
        where: { id },
        select: {
          id: true,
          key: true,
          title: true,
          body: true,
        },
      });

      if (!page) return [];

      const combined = chunksFromMultipleFields([
        page.title,
        page.body,
      ]);
      const sourceId = `site-page:${page.id}`;
      const sourceTitle = page.title?.trim() || `固定ページ (${page.key})`;
      for (let i = 0; i < combined.length; i++) {
        chunks.push({
          source_table: "site_update",
          source_id: sourceId,
          source_title: sourceTitle,
          source_category: page.key,
          source_type_label: "固定ページ",
          chunk_index: i,
          content: truncate(combined[i], 2500),
        });
      }
    }
  } catch (error) {
    console.error(`Error generating chunks for ${table}:${id}:`, error);
  }

  return chunks;
}

async function batchEmbedTexts(texts: string[], openai: OpenAI): Promise<number[][]> {
  const embeddings: number[][] = [];
  const BATCH_SIZE = 50;

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    try {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-large",
        input: batch,
        dimensions: 1536,
      });

      const sorted = response.data.sort((a, b) => a.index - b.index);
      embeddings.push(...sorted.map((d) => d.embedding as number[]));

      if (i + BATCH_SIZE < texts.length) {
        await sleep(500);
      }
    } catch (error) {
      console.error(`Embedding error at index ${i}:`, error);
      throw error;
    }
  }

  return embeddings;
}
