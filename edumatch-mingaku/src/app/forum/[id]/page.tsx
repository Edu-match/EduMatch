import { notFound } from "next/navigation";
import { ForumRoomClient } from "@/components/community/forum-room-client";
import { FORUM_ROOMS, getRoomById } from "@/lib/mock-forum";

export function generateStaticParams() {
  return FORUM_ROOMS.map((room) => ({ id: room.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const room = getRoomById(id);
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
  const room = getRoomById(id);
  if (!room) notFound();

  return <ForumRoomClient room={room} />;
}
