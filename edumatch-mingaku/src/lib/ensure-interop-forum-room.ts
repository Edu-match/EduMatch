import { prisma } from "@/lib/prisma";
import type { ForumRoom } from "@/lib/mock-forum";

const ROOM_DB_SELECT = {
  id: true,
  name: true,
  description: true,
  emoji: true,
  weekly_topic: true,
  ai_discussion: true,
  ai_weekly_topic_enabled: true,
  created_by: true,
  created_at: true,
  updated_at: true,
} as const;

type RoomRow = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  weekly_topic: string;
  ai_discussion: boolean;
  ai_weekly_topic_enabled: boolean;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
};

async function mapRoomRow(id: string, room: RoomRow): Promise<ForumRoom> {
  const [postCount, distinctAuthors, latestPost, latestTopic] = await Promise.all([
    prisma.forumPost.count({ where: { room_id: id, is_hidden: false } }),
    prisma.forumPost.findMany({
      where: { room_id: id, is_hidden: false, author_id: { not: null } },
      select: { author_id: true },
      distinct: ["author_id"],
    }),
    prisma.forumPost.findFirst({
      where: { room_id: id, is_hidden: false },
      orderBy: { created_at: "desc" },
      select: { created_at: true },
    }),
    prisma.forumRoomTopic.findFirst({
      where: { room_id: id },
      orderBy: { period_start: "desc" },
      select: { id: true, title: true },
    }),
  ]);

  return {
    id: room.id,
    name: room.name,
    description: room.description,
    emoji: room.emoji,
    weeklyTopic: room.weekly_topic,
    aiDiscussion: room.ai_discussion,
    aiWeeklyTopicEnabled: room.ai_weekly_topic_enabled,
    currentTopicId: latestTopic?.id ?? null,
    currentTopicTitle: latestTopic?.title ?? null,
    postCount,
    participantCount: distinctAuthors.length,
    lastPostedAt: latestPost?.created_at.toISOString() ?? room.created_at.toISOString(),
    createdBy: room.created_by ?? null,
  };
}

/** マップの room_id に対応する井戸端ルームが無ければ interop_topics から自動作成する。 */
export async function ensureInteropForumRoom(roomId: string): Promise<ForumRoom | null> {
  try {
    const existing = await prisma.forumRoom.findUnique({
      where: { id: roomId },
      select: ROOM_DB_SELECT,
    });
    if (existing) return mapRoomRow(roomId, existing);

    const topic = await prisma.interopTopic.findFirst({
      where: { room_id: roomId, is_active: true },
      select: { name: true, topic1: true },
    });
    if (!topic) return null;

    const weekly = topic.topic1?.trim() || topic.name;
    await prisma.forumRoom.create({
      data: {
        id: roomId,
        name: topic.name,
        description: weekly,
        weekly_topic: weekly,
        emoji: "💬",
        ai_discussion: true,
      },
    });

    const created = await prisma.forumRoom.findUnique({
      where: { id: roomId },
      select: ROOM_DB_SELECT,
    });
    if (!created) return null;
    return mapRoomRow(roomId, created);
  } catch {
    return null;
  }
}
