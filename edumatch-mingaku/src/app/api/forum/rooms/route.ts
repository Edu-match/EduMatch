import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth";
import { createAiWeeklyTopicForRoom } from "@/lib/forum-weekly-topic-ai";

export const dynamic = "force-dynamic";

/** 部屋一覧取得（投稿数・参加者数を集計して返す） */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const includeHidden = url.searchParams.get("includeHidden") === "true";
    const subCategoryId = url.searchParams.get("subCategoryId") ?? undefined;
    let isAdmin = false;
    if (includeHidden) {
      const profile = await getCurrentProfile();
      isAdmin = profile?.role === "ADMIN";
    }

    // is_hidden カラムが未追加の場合に備えてフォールバック
    const roomsWithCounts = await prisma.forumRoom.findMany({
      where: subCategoryId ? { sub_category_id: subCategoryId } : undefined,
      orderBy: { created_at: "asc" },
      include: {
        _count: { select: { posts: { where: { is_hidden: false } } } },
      },
    });
    const rooms =
      includeHidden && isAdmin
        ? roomsWithCounts
        : roomsWithCounts.filter((r: { is_hidden?: boolean }) => !r.is_hidden);

    // 参加者数 = 各部屋の投稿でユニークな author_id の数（ゲスト除く）
    const participantCounts = await Promise.all(
      rooms.map(async (room) => {
        const distinct = await prisma.forumPost.findMany({
          where: { room_id: room.id, is_hidden: false, author_id: { not: null } },
          select: { author_id: true },
          distinct: ["author_id"],
        });
        return { id: room.id, count: distinct.length };
      })
    );

    const lastPostedAts = await Promise.all(
      rooms.map(async (room) => {
        const latest = await prisma.forumPost.findFirst({
          where: { room_id: room.id, is_hidden: false },
          orderBy: { created_at: "desc" },
          select: { created_at: true },
        });
        return { id: room.id, at: latest?.created_at?.toISOString() ?? null };
      })
    );

    const participantMap = Object.fromEntries(participantCounts.map((c) => [c.id, c.count]));
    const lastPostedMap = Object.fromEntries(lastPostedAts.map((l) => [l.id, l.at]));

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
    const { name, description, weeklyTopic, aiDiscussion, emoji, aiWeeklyTopicEnabled, categoryId, subCategoryId } = body as {
      name: string;
      description?: string;
      weeklyTopic: string;
      aiDiscussion?: boolean;
      emoji?: string;
      aiWeeklyTopicEnabled?: boolean;
      categoryId?: string;
      subCategoryId?: string;
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const slug = name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]/g, "");

    const id = `${slug}-${Date.now()}`;

    const aiWeekly = aiWeeklyTopicEnabled ?? true;
    const room = await prisma.forumRoom.create({
      data: {
        id,
        name: name.trim(),
        description: description?.trim() ?? "",
        weekly_topic: aiWeekly ? "" : weeklyTopic?.trim() ?? "",
        ai_discussion: aiDiscussion ?? true,
        ai_weekly_topic_enabled: aiWeeklyTopicEnabled ?? true,
        emoji: emoji ?? "",
        created_by: user.id,
        ...(categoryId ? { category_id: categoryId } : {}),
        ...(subCategoryId ? { sub_category_id: subCategoryId } : {}),
      },
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
