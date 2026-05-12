'use client'

import dynamic from 'next/dynamic'

const ForumListClient = dynamic(
  () =>
    import('@/components/community/forum-list-client').then(
      (mod) => mod.ForumListClient
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

export function ForumListClientDynamic() {
  return <ForumListClient />
}
