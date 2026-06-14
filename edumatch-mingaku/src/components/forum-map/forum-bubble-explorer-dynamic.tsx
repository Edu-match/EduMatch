'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import { ForumBackdrop } from '@/components/forum-map/forum-backdrop'

const ForumBubbleExplorer = dynamic(
  () =>
    import('@/components/forum-map/forum-bubble-explorer').then(
      (mod) => mod.ForumBubbleExplorer
    ),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center">
        <ForumBackdrop />
        <Loader2 className="relative z-10 h-8 w-8 animate-spin text-white/60" />
      </div>
    ),
  }
)

export function ForumBubbleExplorerDynamic() {
  return <ForumBubbleExplorer />
}
