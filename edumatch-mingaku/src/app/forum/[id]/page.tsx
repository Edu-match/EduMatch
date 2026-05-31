import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ForumRoomClientDynamic } from "@/components/community/forum-room-client-dynamic";
import { FORUM_ROOMS } from "@/lib/mock-forum";
import type { ForumRoom } from "@/lib/mock-forum";
import { prisma } from "@/lib/prisma";

export const dynamicParams = true;

export function generateStaticParams() {
  return FORUM_ROOMS.map((room) => ({ id: room.id }));
}

/** category_id / sub_category_id は DB に未追加の可能性があるため SELECT しない */
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

async function getRoomFromDb(id: string): Promise<ForumRoom | null> {
  try {
    const room = await prisma.forumRoom.findUnique({ where: { id }, select: ROOM_DB_SELECT });
    if (!room) return null;

    const postCount = await prisma.forumPost.count({
      where: { room_id: id, is_hidden: false },
    });
    const distinctAuthors = await prisma.forumPost.findMany({
      where: { room_id: id, is_hidden: false, author_id: { not: null } },
      select: { author_id: true },
      distinct: ["author_id"],
    });
    const latestPost = await prisma.forumPost.findFirst({
      where: { room_id: id, is_hidden: false },
      orderBy: { created_at: "desc" },
      select: { created_at: true },
    });

    const latestTopic = await prisma.forumRoomTopic.findFirst({
      where: { room_id: id },
      orderBy: { period_start: "desc" },
      select: { id: true, title: true },
    });

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
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const room = await getRoomFromDb(id);
  if (!room) return {};
  return {
    title: `${room.name} | AIUEO 井戸端会議 | エデュマッチ`,
    description: room.description,
  };
}

export default async function ForumRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fromNotify?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const room = await getRoomFromDb(id);
  if (!room) notFound();

  return (
    <ForumRoomClientDynamic
      room={room}
      highlightFromNotify={sp.fromNotify === "1"}
    />
  );
}
