'use client'

import dynamic from 'next/dynamic'
import type { ForumRoom } from '@/lib/mock-forum'
import type { ForumCategoryContext } from '@/components/community/forum-room-client'

const ForumRoomClient = dynamic(
  () =>
    import('@/components/community/forum-room-client').then(
      (mod) => mod.ForumRoomClient
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        読み込み中…
      </div>
    ),
  }
)

export function ForumRoomClientDynamic({
  room,
  highlightFromNotify = false,
  categoryContext,
  interopTopicUrl,
}: {
  room: ForumRoom;
  highlightFromNotify?: boolean;
  categoryContext?: ForumCategoryContext;
  interopTopicUrl?: string;
}) {
  return (
    <ForumRoomClient
      room={room}
      highlightFromNotify={highlightFromNotify}
      categoryContext={categoryContext}
      interopTopicUrl={interopTopicUrl}
    />
  )
}
