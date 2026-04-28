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

async function getRoomFromDb(id: string): Promise<ForumRoom | null> {
  try {
    const room = await prisma.forumRoom.findUnique({ where: { id } });
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

    return {
      id: room.id,
      name: room.name,
      description: room.description,
      emoji: room.emoji,
      weeklyTopic: room.weekly_topic,
      aiDiscussion: room.ai_discussion,
      postCount,
      participantCount: distinctAuthors.length,
      lastPostedAt: latestPost?.created_at.toISOString() ?? room.created_at.toISOString(),
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
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const room = await getRoomFromDb(id);
  if (!room) notFound();

  return <ForumRoomClientDynamic room={room} />;
}
