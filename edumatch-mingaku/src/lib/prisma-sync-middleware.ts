/**
 * Prisma middleware for syncing app_content_chunks when content is created/updated/deleted
 * Triggers re-indexing of modified content
 */

import type { PrismaClient } from "@prisma/client";

interface ReindexJob {
  table: string;
  id: string;
  action: "upsert" | "delete";
  timestamp: string;
}

// In-memory queue for reindexing (簡易版)
// Production では Bull キューや Supabase pg_cron を使用すること
const reindexQueue: ReindexJob[] = [];
let processingQueue = false;

/**
 * キューに登録されたジョブを処理する
 */
async function processReindexQueue(): Promise<void> {
  if (processingQueue || reindexQueue.length === 0) return;

  processingQueue = true;
  const jobs = [...reindexQueue];
  reindexQueue.length = 0; // キューをクリア

  try {
    for (const job of jobs) {
      await triggerReindexViaApi(job);
    }
  } catch (error) {
    console.error("Error processing reindex queue:", error);
  } finally {
    processingQueue = false;
  }
}

/**
 * APIエンドポイント経由でリインデックスをトリガー
 */
async function triggerReindexViaApi(job: ReindexJob): Promise<void> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/admin/reindex-content`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Reindex-Token": process.env.REINDEX_API_TOKEN || "development-token",
      },
      body: JSON.stringify(job),
    });

    if (!response.ok) {
      console.error(`Reindex failed for ${job.table}:${job.id}:`, response.statusText);
    }
  } catch (error) {
    console.error("Error triggering reindex API:", error);
  }
}

/**
 * Prisma middleware を設定
 * 注意：CREATE/UPDATE/DELETE 時にキューに登録するだけで、実際の処理はAPIで行う
 */
export function installPrismaSyncMiddleware(prisma: PrismaClient): void {
  prisma.$use(async (params, next) => {
    let forumReplyPostIdForDelete: string | null = null;
    if (
      params.model === "forumReply" &&
      params.action === "delete" &&
      params.args?.where?.id
    ) {
      try {
        const beforeDelete = await prisma.forumReply.findUnique({
          where: { id: params.args.where.id },
          select: { post_id: true },
        });
        forumReplyPostIdForDelete = beforeDelete?.post_id ?? null;
      } catch {
        forumReplyPostIdForDelete = null;
      }
    }

    const result = await next(params);

    // 監視対象のテーブルと操作
    const watchedTables = ["service", "post", "review", "forumPost", "forumReply", "seminarEvent", "siteUpdate", "sitePage"];
    const watchedActions = ["create", "update", "delete", "deleteMany", "updateMany"];

    if (
      watchedTables.includes(params.model || "") &&
      watchedActions.includes(params.action)
    ) {
      // リインデックスジョブをキューに追加
      const sourceTable = mapPrismaTableToSourceTable(params.model || "");

      if (params.model === "forumReply") {
        if (params.action === "create" || params.action === "update") {
          if (result?.post_id) {
            reindexQueue.push({
              table: "forum_post",
              id: result.post_id,
              action: "upsert",
              timestamp: new Date().toISOString(),
            });
          }
        } else if (params.action === "delete" && forumReplyPostIdForDelete) {
          reindexQueue.push({
            table: "forum_post",
            id: forumReplyPostIdForDelete,
            action: "upsert",
            timestamp: new Date().toISOString(),
          });
        }
        setImmediate(() => processReindexQueue());
        return result;
      }

      if (params.action === "delete" && params.args?.where?.id) {
        reindexQueue.push({
          table: sourceTable,
          id: params.args.where.id,
          action: "delete",
          timestamp: new Date().toISOString(),
        });
      } else if (
        ["create", "update"].includes(params.action) &&
        result?.id
      ) {
        reindexQueue.push({
          table: sourceTable,
          id: result.id,
          action: "upsert",
          timestamp: new Date().toISOString(),
        });
      } else if (params.action === "deleteMany") {
        // deleteMany は複数削除なので、スキップ（バッチ処理推奨）
        console.warn("deleteMany detected - consider using batch reindex instead");
      } else if (params.action === "updateMany") {
        // updateMany は複数更新なので、スキップ
        console.warn("updateMany detected - consider using batch reindex instead");
      }

      // 非同期処理開始（ブロッキングなし）
      setImmediate(() => processReindexQueue());
    }

    return result;
  });
}

/**
 * Prisma テーブル名を source_table 名にマップ
 */
function mapPrismaTableToSourceTable(prismaTable: string): string {
  const mapping: Record<string, string> = {
    service: "service",
    post: "post",
    review: "review",
    forumPost: "forum_post",
    seminarEvent: "seminar_event",
    siteUpdate: "site_update",
    sitePage: "sitePage",
  };
  return mapping[prismaTable] || prismaTable;
}

/**
 * キューの状態を確認（デバッグ用）
 */
export function getReindexQueueStatus(): {
  queueLength: number;
  processing: boolean;
} {
  return {
    queueLength: reindexQueue.length,
    processing: processingQueue,
  };
}
