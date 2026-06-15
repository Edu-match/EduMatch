import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth";
import { createAiWeeklyTopicForRoom } from "@/lib/forum-weekly-topic-ai";
import { logActivity } from "@/app/_actions/activity-log";
import { communityUserRoomIdPrefix, generateForumRoomId } from "@/lib/forum-room-id";
import {
  createForumRoomSafe,
  forumRoomCreateErrorMessage,
} from "@/lib/forum-room-create";
import { isPrismaMissingColumn } from "@/lib/prisma-schema-fallback";

export const dynamic = "force-dynamic";

/** 部屋一覧取得（投稿数・参加者数を集計して返す） */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const includeHidden = url.searchParams.get("includeHidden") === "true";
    const subCategoryId = url.searchParams.get("subCategoryId") ?? undefined;
    const categoryId = url.searchParams.get("categoryId") ?? undefined;
    const categorySlug = url.searchParams.get("categorySlug") ?? undefined;
    const subSlug = url.searchParams.get("subSlug") ?? undefined;
    let isAdmin = false;
    if (includeHidden) {
      const profile = await getCurrentProfile();
      isAdmin = profile?.role === "ADMIN";
    }

    let roomsWithCounts: Awaited<
      ReturnType<typeof prisma.forumRoom.findMany<{ include: { _count: { select: { posts: true } } } }>>
    >;

    if (categoryId && categorySlug && subSlug) {
      const prefix = communityUserRoomIdPrefix(categorySlug, subSlug);
      try {
        roomsWithCounts = await prisma.forumRoom.findMany({
          where: {
            category_id: categoryId,
            id: { startsWith: prefix },
          },
          orderBy: { created_at: "desc" },
          include: {
            _count: { select: { posts: { where: { is_hidden: false } } } },
          },
        });
      } catch (err) {
        if (!isPrismaMissingColumn(err)) throw err;
        roomsWithCounts = await prisma.forumRoom.findMany({
          where: { id: { startsWith: prefix } },
          orderBy: { created_at: "desc" },
          include: {
            _count: { select: { posts: { where: { is_hidden: false } } } },
          },
        });
      }
    } else if (subCategoryId) {
      try {
        roomsWithCounts = await prisma.forumRoom.findMany({
          where: { sub_category_id: subCategoryId },
          orderBy: { created_at: "asc" },
          include: {
            _count: { select: { posts: { where: { is_hidden: false } } } },
          },
        });
      } catch (err) {
        if (!isPrismaMissingColumn(err)) throw err;
        roomsWithCounts = [];
      }
    } else {
      roomsWithCounts = await prisma.forumRoom.findMany({
        orderBy: { created_at: "asc" },
        include: {
          _count: { select: { posts: { where: { is_hidden: false } } } },
        },
      });
    }
    const rooms =
      includeHidden && isAdmin
        ? roomsWithCounts
        : roomsWithCounts.filter((r: { is_hidden?: boolean }) => !r.is_hidden);

    // 参加者数(ユニークauthor_id) と 最終投稿日 を、部屋ごとの個別クエリ(N+1)ではなく
    // 各1本のGROUP BYで一括集計する。以前は部屋数×2回(数百クエリ)でSSRの主要遅延だった。
    const roomIds = rooms.map((r) => r.id);
    let participantMap: Record<string, number> = {};
    let lastPostedMap: Record<string, string | null> = {};
    if (roomIds.length > 0) {
      const idList = Prisma.join(roomIds);
      const [participantRows, lastRows] = await Promise.all([
        prisma.$queryRaw<Array<{ room_id: string; c: number }>>`
          SELECT room_id, COUNT(DISTINCT author_id)::int AS c
          FROM forum_posts
          WHERE is_hidden = false AND author_id IS NOT NULL AND room_id IN (${idList})
          GROUP BY room_id`,
        prisma.$queryRaw<Array<{ room_id: string; at: Date | null }>>`
          SELECT room_id, MAX(created_at) AS at
          FROM forum_posts
          WHERE is_hidden = false AND room_id IN (${idList})
          GROUP BY room_id`,
      ]);
      participantMap = Object.fromEntries(participantRows.map((r) => [r.room_id, Number(r.c)]));
      lastPostedMap = Object.fromEntries(
        lastRows.map((r) => [r.room_id, r.at ? new Date(r.at).toISOString() : null]),
      );
    }

    const result = rooms.map((room) => ({
      id: room.id,
      name: room.name,
      description: room.description,
      emoji: room.emoji,
      weeklyTopic: room.weekly_topic,
      aiDiscussion: room.ai_discussion,
      aiWeeklyTopicEnabled: room.ai_weekly_topic_enabled,
      postCount: room._count.posts,
      participantCount: participantMap[room.id] ?? 0,
      lastPostedAt: lastPostedMap[room.id] ?? room.created_at.toISOString(),
      isHidden: room.is_hidden ?? false,
    }));

    return NextResponse.json({ rooms: result });
  } catch (err) {
    console.error("[forum/rooms GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** 部屋作成（ログイン必須） */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      description,
      weeklyTopic,
      aiDiscussion,
      emoji,
      aiWeeklyTopicEnabled,
      categoryId,
      subCategoryId,
      categorySlug,
      subCategorySlug,
    } = body as {
      name: string;
      description?: string;
      weeklyTopic: string;
      aiDiscussion?: boolean;
      emoji?: string;
      aiWeeklyTopicEnabled?: boolean;
      categoryId?: string;
      subCategoryId?: string;
      categorySlug?: string;
      subCategorySlug?: string;
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: "部屋名を入力してください" }, { status: 400 });
    }

    const id = generateForumRoomId(name, {
      categorySlug: categorySlug ?? undefined,
      subSlug: subCategorySlug ?? undefined,
    });

    const aiWeekly = aiWeeklyTopicEnabled ?? true;

    // コミュニティのメインルームが (category_id, sub_category_id) を占有しているため、
    // ユーザー作成ルームでは sub_category_id を付けない
    let linkSubCategoryId = subCategoryId;
    if (categoryId && subCategoryId) {
      try {
        const occupied = await prisma.forumRoom.findFirst({
          where: { category_id: categoryId, sub_category_id: subCategoryId },
          select: { id: true },
        });
        if (occupied) linkSubCategoryId = undefined;
      } catch (err) {
        if (!isPrismaMissingColumn(err)) throw err;
        linkSubCategoryId = undefined;
      }
    }

    const room = await createForumRoomSafe({
      id,
      name: name.trim(),
      description: description?.trim() ?? "",
      weeklyTopic: aiWeekly ? "" : weeklyTopic?.trim() ?? "",
      aiDiscussion: aiDiscussion ?? true,
      aiWeeklyTopicEnabled: aiWeeklyTopicEnabled ?? true,
      emoji: emoji ?? "",
      createdBy: profile.id,
      categoryId: categoryId ?? undefined,
      subCategoryId: linkSubCategoryId,
    });

    if (aiWeekly) {
      try {
        await createAiWeeklyTopicForRoom(room.id);
      } catch (e) {
        console.error("[forum/rooms POST] createAiWeeklyTopicForRoom", e);
      }
    }

    const refreshed = await prisma.forumRoom.findUnique({ where: { id: room.id } });
    const weekly = refreshed?.weekly_topic ?? room.weekly_topic;

    if (profile.role === "ADMIN") {
      void logActivity({
        actorId: profile.id,
        actorName: profile.name,
        action: "CREATE",
        targetType: "FORUM_ROOM",
        targetId: room.id,
        targetTitle: room.name,
      });
    }

    return NextResponse.json({
      room: {
        id: room.id,
        name: room.name,
        description: room.description,
        emoji: room.emoji,
        weeklyTopic: weekly,
        aiDiscussion: room.ai_discussion,
        aiWeeklyTopicEnabled: refreshed?.ai_weekly_topic_enabled ?? (aiWeeklyTopicEnabled ?? true),
        postCount: 0,
        participantCount: 0,
        lastPostedAt: room.created_at.toISOString(),
      },
    }, { status: 201 });
  } catch (err) {
    console.error("[forum/rooms POST]", err);
    const hint = forumRoomCreateErrorMessage(err);
    return NextResponse.json(
      { error: hint ?? "部屋の作成に失敗しました。しばらくしてから再度お試しください。" },
      { status: 500 }
    );
  }
}
