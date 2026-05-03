"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";

export type ActivityAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "APPROVE"
  | "REJECT"
  | "SUBMIT"
  | "HIDE"
  | "SHOW";

export type ActivityTargetType =
  | "POST"
  | "SERVICE"
  | "SITE_PAGE"
  | "EVENT"
  | "SITE_UPDATE"
  | "FORUM_POST";

export interface ActivityLogEntry {
  id: string;
  actor_id: string | null;
  actor_name: string;
  action: ActivityAction;
  target_type: ActivityTargetType;
  target_id: string;
  target_title: string;
  detail: string | null;
  created_at: Date;
}

export interface LogActivityInput {
  actorId?: string | null;
  actorName: string;
  action: ActivityAction;
  targetType: ActivityTargetType;
  targetId: string;
  targetTitle: string;
  detail?: string | null;
}

export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        actor_id: input.actorId ?? null,
        actor_name: input.actorName,
        action: input.action,
        target_type: input.targetType,
        target_id: input.targetId,
        target_title: input.targetTitle.slice(0, 200),
        detail: input.detail?.slice(0, 500) ?? null,
      },
    });
  } catch (e) {
    // ログ失敗はメイン処理をブロックしない
    console.error("[ActivityLog] Failed to write log:", e);
  }
}

export async function getActivityLogs(options?: {
  limit?: number;
  offset?: number;
  targetType?: ActivityTargetType;
  action?: ActivityAction;
  includeCommentCount?: boolean;
}): Promise<{ logs: (ActivityLogEntry & { commentCount?: number })[]; total: number }> {
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const where: Record<string, unknown> = {};
  if (options?.targetType) where.target_type = options.targetType;
  if (options?.action) where.action = options.action;

  try {
    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { created_at: "desc" },
        take: limit,
        skip: offset,
        include: options?.includeCommentCount ? { _count: { select: { comments: true } } } : undefined,
      }),
      prisma.activityLog.count({ where }),
    ]);

    return {
      logs: logs.map((l) => {
        const { _count, ...rest } = l as typeof l & { _count?: { comments: number } };
        return { ...rest, commentCount: _count?.comments } as ActivityLogEntry & { commentCount?: number };
      }),
      total,
    };
  } catch (e) {
    console.error("[ActivityLog] Failed to fetch logs:", e);
    return { logs: [], total: 0 };
  }
}

export interface ActivityComment {
  id: string;
  log_id: string;
  author_id: string | null;
  author_name: string;
  body: string;
  created_at: Date;
}

export async function getActivityComments(logId: string): Promise<ActivityComment[]> {
  try {
    const comments = await prisma.activityLogComment.findMany({
      where: { log_id: logId },
      orderBy: { created_at: "asc" },
    });
    return comments as unknown as ActivityComment[];
  } catch (e) {
    console.error("[ActivityLog] Failed to fetch comments:", e);
    return [];
  }
}

export async function addActivityComment(logId: string, body: string): Promise<{ success: boolean; comment?: ActivityComment; error?: string }> {
  const profile = await getCurrentProfile();
  if (!profile) return { success: false, error: "ログインが必要です" };
  const trimmed = body.trim().slice(0, 500);
  if (!trimmed) return { success: false, error: "コメント内容を入力してください" };
  try {
    const comment = await prisma.activityLogComment.create({
      data: {
        log_id: logId,
        author_id: profile.id,
        author_name: profile.name,
        body: trimmed,
      },
    });
    return { success: true, comment: comment as unknown as ActivityComment };
  } catch (e) {
    console.error("[ActivityLog] Failed to add comment:", e);
    return { success: false, error: "コメントの投稿に失敗しました" };
  }
}

export async function deleteActivityComment(commentId: string): Promise<{ success: boolean; error?: string }> {
  const profile = await getCurrentProfile();
  if (!profile) return { success: false, error: "ログインが必要です" };
  try {
    const comment = await prisma.activityLogComment.findUnique({ where: { id: commentId } });
    if (!comment) return { success: false, error: "コメントが見つかりません" };
    if (comment.author_id !== profile.id && profile.role !== "ADMIN") {
      return { success: false, error: "削除権限がありません" };
    }
    await prisma.activityLogComment.delete({ where: { id: commentId } });
    return { success: true };
  } catch (e) {
    console.error("[ActivityLog] Failed to delete comment:", e);
    return { success: false, error: "削除に失敗しました" };
  }
}
