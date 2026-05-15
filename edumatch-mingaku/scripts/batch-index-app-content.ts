/**
 * アプリ内コンテンツ全体をチャンク化＆ベクトル化してRAG対応させるバッチスクリプト
 *
 * Usage:
 *   npm run index:app-content
 *   or
 *   npx tsx scripts/batch-index-app-content.ts
 */

import dotenv from "dotenv";
import path from "path";

// 環境変数ファイルを指定可能に（デフォルト: .env.local）
const envFile = process.argv[2] || ".env.local";
const envPath = path.resolve(__dirname, `../${envFile}`);
console.log(`Loading environment from: ${envPath}`);
dotenv.config({ path: envPath });

import { prisma } from "@/lib/prisma";
import { cleanAndChunk, chunksFromMultipleFields, truncate } from "@/lib/chunking-utils";
import OpenAI from "openai";
import { createServiceRoleClient } from "@/utils/supabase/server-admin";
import type { Database } from "@/lib/database.types";

const BATCH_SIZE = 50; // OpenAI API バッチサイズ
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMS = 1536;
const RATE_LIMIT_DELAY = 500; // ms

interface IndexChunk {
  source_table: string;
  source_id: string;
  source_title: string;
  source_category?: string | null;
  source_type_label: string;
  author_id?: string | null;
  chunk_index: number;
  content: string;
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

/**
 * Services をチャンク化
 */
async function indexServices(): Promise<IndexChunk[]> {
  console.log("Indexing Services...");

  const services = await prisma.service.findMany({
    where: {
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

  console.log(`  Found ${services.length} services`);

  const chunks: IndexChunk[] = [];

  for (const service of services) {
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
  }

  console.log(`  Created ${chunks.length} chunks`);
  return chunks;
}

/**
 * Posts（記事）をチャンク化
 */
async function indexPosts(): Promise<IndexChunk[]> {
  console.log("Indexing Posts...");

  const posts = await prisma.post.findMany({
    where: {
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

  console.log(`  Found ${posts.length} posts`);

  const chunks: IndexChunk[] = [];

  for (const post of posts) {
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
  }

  console.log(`  Created ${chunks.length} chunks`);
  return chunks;
}

/**
 * Reviews をチャンク化
 */
async function indexReviews(): Promise<IndexChunk[]> {
  console.log("Indexing Reviews...");

  const reviews = await prisma.review.findMany({
    where: {
      is_approved: true,
    },
    select: {
      id: true,
      service_id: true,
      body: true,
      user_id: true,
      service: { select: { title: true, category: true } },
    },
  });

  console.log(`  Found ${reviews.length} reviews`);

  const chunks: IndexChunk[] = [];

  for (const review of reviews) {
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
  }

  console.log(`  Created ${chunks.length} chunks`);
  return chunks;
}

/**
 * Forum Posts をチャンク化
 */
async function indexForumPosts(): Promise<IndexChunk[]> {
  console.log("Indexing Forum Posts...");

  const forumPosts = await prisma.forumPost.findMany({
    select: {
      id: true,
      body: true,
      topic_id: true,
      author_id: true,
    },
  });

  console.log(`  Found ${forumPosts.length} forum posts`);

  const chunks: IndexChunk[] = [];

  for (const post of forumPosts) {
    const combined = chunksFromMultipleFields([post.body]);
    // タイトルは最初の100文字から生成
    const postTitle = post.body.slice(0, 100).replace(/\n+/g, " ") + (post.body.length > 100 ? "..." : "");

    for (let i = 0; i < combined.length; i++) {
      chunks.push({
        source_table: "forum_post",
        source_id: post.id,
        source_title: postTitle,
        source_category: post.topic_id,
        source_type_label: "フォーラム投稿",
        author_id: post.author_id,
        chunk_index: i,
        content: truncate(combined[i], 2500),
      });
    }
  }

  console.log(`  Created ${chunks.length} chunks`);
  return chunks;
}

/**
 * Seminar Events をチャンク化
 */
async function indexSeminarEvents(): Promise<IndexChunk[]> {
  console.log("Indexing Seminar Events...");

  const events = await prisma.seminarEvent.findMany({
    select: {
      id: true,
      title: true,
      description: true,
      venue: true,
      company: true,
    },
  });

  console.log(`  Found ${events.length} seminar events`);

  const chunks: IndexChunk[] = [];

  for (const event of events) {
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
  }

  console.log(`  Created ${chunks.length} chunks`);
  return chunks;
}

/**
 * Site Updates をチャンク化
 */
async function indexSiteUpdates(): Promise<IndexChunk[]> {
  console.log("Indexing Site Updates...");

  const updates = await prisma.siteUpdate.findMany({
    where: {
      published_at: { lte: new Date() }, // 公開済み
    },
    select: {
      id: true,
      title: true,
      body: true,
      category: true,
    },
  });

  console.log(`  Found ${updates.length} site updates`);

  const chunks: IndexChunk[] = [];

  for (const update of updates) {
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
  }

  console.log(`  Created ${chunks.length} chunks`);
  return chunks;
}

/**
 * テキスト配列をバッチでEmbedding生成
 */
async function batchEmbedTexts(
  texts: string[],
  openai: OpenAI
): Promise<number[][]> {
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    console.log(
      `  Generating embeddings: ${i + 1}/${texts.length} (batch of ${batch.length})`
    );

    try {
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: batch,
        dimensions: EMBEDDING_DIMS,
      });

      // Index順に並び替え
      const sorted = response.data.sort((a, b) => a.index - b.index);
      embeddings.push(...sorted.map((d) => d.embedding as number[]));

      // レート制限対策
      if (i + BATCH_SIZE < texts.length) {
        await sleep(RATE_LIMIT_DELAY);
      }
    } catch (error) {
      console.error(`  Embedding error at index ${i}:`, error);
      throw error;
    }
  }

  return embeddings;
}

/**
 * チャンクをSupabaseのapp_content_chunksテーブルに挿入
 */
async function insertChunksToSupabase(
  chunks: IndexChunk[],
  embeddings: number[][]
): Promise<void> {
  console.log(`Inserting ${chunks.length} chunks to Supabase...`);

  const supabase = await createServiceRoleClient();

  // チャンクと埋め込みをペアにしてバッチ挿入（1000行ずつ）
  const INSERT_BATCH = 1000;

  for (let i = 0; i < chunks.length; i += INSERT_BATCH) {
    const chunksBatch = chunks.slice(i, i + INSERT_BATCH);
    const embeddingsBatch = embeddings.slice(i, i + INSERT_BATCH);

    const rows = chunksBatch.map((chunk, idx) => ({
      source_table: chunk.source_table,
      source_id: chunk.source_id,
      source_title: chunk.source_title,
      source_category: chunk.source_category ?? null,
      source_type_label: chunk.source_type_label,
      author_id: chunk.author_id ?? null,
      chunk_index: chunk.chunk_index,
      content: chunk.content,
      embedding: embeddingsBatch[idx], // vector型
      is_published: true,
    }));

    const { error } = await supabase
      .from("app_content_chunks")
      .upsert(rows, { onConflict: "source_table,source_id,chunk_index" });

    if (error) {
      console.error(`  Insert error at batch ${i / INSERT_BATCH + 1}:`, error);
      throw error;
    }

    console.log(`  Inserted ${Math.min(i + INSERT_BATCH, chunks.length)}/${chunks.length}`);
  }

  console.log(`Successfully inserted all chunks`);
}

/**
 * メイン処理
 */
async function main(): Promise<void> {
  console.log("=== Starting App Content RAG Indexing ===\n");

  try {
    // 1. 全てのコンテンツをチャンク化（優先度順）
    console.log("Phase 1: Chunking all content types...\n");

    const allChunks: IndexChunk[] = [];

    // 優先度1：高
    allChunks.push(...(await indexServices()));
    allChunks.push(...(await indexPosts()));
    allChunks.push(...(await indexReviews()));

    // 優先度2：中
    allChunks.push(...(await indexForumPosts()));
    allChunks.push(...(await indexSeminarEvents()));

    // 優先度3：低
    allChunks.push(...(await indexSiteUpdates()));

    console.log(`\nTotal chunks created: ${allChunks.length}\n`);

    // 2. Embedding生成
    console.log("Phase 2: Generating embeddings...\n");
    const openai = await getOpenAIClient();
    const texts = allChunks.map((c) => c.content);
    const embeddings = await batchEmbedTexts(texts, openai);

    if (embeddings.length !== allChunks.length) {
      throw new Error(
        `Embedding count mismatch: ${embeddings.length} vs ${allChunks.length}`
      );
    }

    console.log("\n");

    // 3. Supabaseに挿入
    console.log("Phase 3: Uploading to Supabase...\n");
    await insertChunksToSupabase(allChunks, embeddings);

    console.log("\n=== Indexing Complete ===");
    console.log(`Total chunks indexed: ${allChunks.length}`);
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
