"use server";

import { prisma } from "@/lib/prisma";

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
}): Promise<{ logs: ActivityLogEntry[]; total: number }> {
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
      }),
      prisma.activityLog.count({ where }),
    ]);

    return {
      logs: logs as unknown as ActivityLogEntry[],
      total,
    };
  } catch (e) {
    console.error("[ActivityLog] Failed to fetch logs:", e);
    return { logs: [], total: 0 };
  }
}
