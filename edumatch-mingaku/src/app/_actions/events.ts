"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserRole } from "@/app/_actions/user";

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

const CALENDAR_MAX = 500;

/**
 * カレンダー表示用：今日以降・検索条件一致のイベントを日付順で最大 CALENDAR_MAX 件取得。件数は別途 total で返す。
 */
export async function getUpcomingEventsForCalendar(search?: string): Promise<{
  events: SeminarEventData[];
  total: number;
}> {
  const q = search?.trim() ?? "";
  const today = todayString();

  const baseWhere = {
    event_date: { not: null, gte: today },
  };
  const searchWhere = q
    ? {
        OR: [
          { title: { contains: q, mode: "insensitive" as const } },
          { description: { contains: q, mode: "insensitive" as const } },
          { company: { contains: q, mode: "insensitive" as const } },
          { venue: { contains: q, mode: "insensitive" as const } },
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
      take: CALENDAR_MAX,
    }),
    prisma.seminarEvent.count({ where }),
  ]);

  return { events, total };
}

export type UpcomingEventItem = {
  id: string;
  title: string;
  dateLabel: string;
};

/** サイドバー用：直近のイベントを取得 */
export async function getUpcomingEvents(limit: number = 5): Promise<UpcomingEventItem[]> {
  try {
    const today = todayString();
    const events = await prisma.seminarEvent.findMany({
      where: { event_date: { not: null, gte: today } },
      select: { id: true, title: true, event_date: true },
      orderBy: { event_date: "asc" },
      take: limit,
    });
    return events.map((e) => ({
      id: e.id,
      title: e.title,
      dateLabel: e.event_date ?? "",
    }));
  } catch {
    return [];
  }
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

// ─── ADMIN 専用 CRUD ────────────────────────────────────────────────────────

/** 管理画面用：全イベント取得（日付順） */
export async function getEventsForAdmin(limit: number = 200): Promise<SeminarEventData[]> {
  const role = await getCurrentUserRole();
  if (role !== "ADMIN") return [];
  return prisma.seminarEvent.findMany({
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
    orderBy: [{ event_date: "desc" }, { created_at: "desc" }],
    take: limit,
  });
}

export type EventInput = {
  title: string;
  description?: string;
  event_date?: string;
  venue?: string;
  company?: string;
  external_url?: string;
};

export type EventMutationResult = { success: boolean; id?: string; error?: string };

/** イベントを新規作成（ADMIN のみ） */
export async function createEvent(input: EventInput): Promise<EventMutationResult> {
  const role = await getCurrentUserRole();
  if (role !== "ADMIN") return { success: false, error: "管理者権限が必要です" };
  try {
    const row = await prisma.seminarEvent.create({
      data: {
        title: input.title.trim(),
        description: input.description?.trim() ?? "",
        event_date: input.event_date?.trim() || null,
        venue: input.venue?.trim() || null,
        company: input.company?.trim() || null,
        external_url: input.external_url?.trim() || null,
      },
    });
    revalidatePath("/events");
    revalidatePath("/admin/events");
    return { success: true, id: row.id };
  } catch (error) {
    console.error("createEvent error:", error);
    return { success: false, error: "作成に失敗しました" };
  }
}

/** イベントを更新（ADMIN のみ） */
export async function updateEvent(id: string, input: EventInput): Promise<EventMutationResult> {
  const role = await getCurrentUserRole();
  if (role !== "ADMIN") return { success: false, error: "管理者権限が必要です" };
  try {
    await prisma.seminarEvent.update({
      where: { id },
      data: {
        title: input.title.trim(),
        description: input.description?.trim() ?? "",
        event_date: input.event_date?.trim() || null,
        venue: input.venue?.trim() || null,
        company: input.company?.trim() || null,
        external_url: input.external_url?.trim() || null,
      },
    });
    revalidatePath("/events");
    revalidatePath(`/events/${id}`);
    revalidatePath("/admin/events");
    return { success: true, id };
  } catch (error) {
    console.error("updateEvent error:", error);
    return { success: false, error: "更新に失敗しました" };
  }
}

/** イベントを削除（ADMIN のみ） */
export async function deleteEvent(id: string): Promise<EventMutationResult> {
  const role = await getCurrentUserRole();
  if (role !== "ADMIN") return { success: false, error: "管理者権限が必要です" };
  try {
    await prisma.seminarEvent.delete({ where: { id } });
    revalidatePath("/events");
    revalidatePath("/admin/events");
    return { success: true };
  } catch (error) {
    console.error("deleteEvent error:", error);
    return { success: false, error: "削除に失敗しました" };
  }
}

/** フォーム用：イベントを削除してからリダイレクト */
export async function deleteEventAction(formData: FormData) {
  const id = formData.get("id") as string | null;
  if (!id) return;
  const result = await deleteEvent(id);
  if (result.success) redirect("/admin/events");
}
