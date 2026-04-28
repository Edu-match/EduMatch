import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** 部屋一覧取得（投稿数・参加者数を集計して返す） */
export async function GET() {
  try {
    const rooms = await prisma.forumRoom.findMany({
      orderBy: { created_at: "asc" },
      include: {
        _count: { select: { posts: { where: { is_hidden: false } } } },
      },
    });

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
      postCount: room._count.posts,
      participantCount: participantMap[room.id] ?? 0,
      lastPostedAt: lastPostedMap[room.id] ?? room.created_at.toISOString(),
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
    const { name, description, weeklyTopic, aiDiscussion, emoji } = body as {
      name: string;
      description?: string;
      weeklyTopic: string;
      aiDiscussion?: boolean;
      emoji?: string;
    };

    if (!name?.trim() || !weeklyTopic?.trim()) {
      return NextResponse.json({ error: "name and weeklyTopic are required" }, { status: 400 });
    }

    const slug = name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]/g, "");

    const id = `${slug}-${Date.now()}`;

    const room = await prisma.forumRoom.create({
      data: {
        id,
        name: name.trim(),
        description: description?.trim() ?? "",
        weekly_topic: weeklyTopic.trim(),
        ai_discussion: aiDiscussion ?? false,
        emoji: emoji ?? "",
        created_by: user.id,
      },
    });

    return NextResponse.json({
      room: {
        id: room.id,
        name: room.name,
        description: room.description,
        emoji: room.emoji,
        weeklyTopic: room.weekly_topic,
        aiDiscussion: room.ai_discussion,
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
