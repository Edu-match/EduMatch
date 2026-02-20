"use server";

import { prisma } from "@/lib/prisma";

export type SeminarEventData = {
  id: string;
  title: string;
  description: string;
  event_date: string | null;
  venue: string | null;
  company: string | null;
  external_url: string | null;
  wp_post_id: number | null;
};

const PER_PAGE = 20;

/** 今日の日付 YYYY-MM-DD（サーバータイムゾーン） */
function todayString(): string {
  const now = new Date();
  return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
}

/**
 * 開催日が今日以降のイベントのみ取得（終了・未定は非表示）。開催日が近い順、ページネーション付き。
 */
export async function getEvents(options?: {
  page?: number;
  perPage?: number;
  search?: string;
}): Promise<{ events: SeminarEventData[]; total: number; perPage: number }> {
  const page = Math.max(1, options?.page ?? 1);
  const perPage = options?.perPage ?? PER_PAGE;
  const search = options?.search?.trim() ?? "";
  const skip = (page - 1) * perPage;
  const today = todayString();

  const baseWhere = {
    event_date: { not: null, gte: today },
  };
  const searchWhere = search
    ? {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
          { company: { contains: search, mode: "insensitive" as const } },
          { venue: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : undefined;
  const where = searchWhere ? { AND: [baseWhere, searchWhere] } : baseWhere;

  const [events, total] = await Promise.all([
    prisma.seminarEvent.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        event_date: true,
        venue: true,
        company: true,
        external_url: true,
        wp_post_id: true,
      },
      orderBy: { event_date: "asc" },
      skip,
      take: perPage,
    }),
    prisma.seminarEvent.count({ where }),
  ]);

  return { events, total, perPage };
}

/** IDでイベントを1件取得 */
export async function getEventById(id: string): Promise<SeminarEventData | null> {
  return prisma.seminarEvent.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      event_date: true,
      venue: true,
      company: true,
      external_url: true,
      wp_post_id: true,
    },
  });
}
