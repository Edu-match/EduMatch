'use client'

import dynamic from 'next/dynamic'
import type { ForumRoom } from '@/lib/mock-forum'

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

export function ForumRoomClientDynamic({ room }: { room: ForumRoom }) {
  return <ForumRoomClient room={room} />
}
