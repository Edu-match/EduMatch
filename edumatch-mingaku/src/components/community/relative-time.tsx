'use client'

import { useEffect, useState } from 'react'

/** Node / ブラウザで同じ結果になるよう timeZone 固定 */
function formatJstShort(iso: string): string {
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Tokyo',
  }).format(new Date(iso))
}

function formatRelative(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'たった今'
  if (diff < 3600) return `${Math.floor(diff / 60)}分前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}日前`
  return formatJstShort(iso)
}

export function RelativeTime({ iso }: { iso: string }) {
  const [label, setLabel] = useState(() => formatJstShort(iso))

  useEffect(() => {
    setLabel(formatRelative(iso))
    const id = setInterval(() => setLabel(formatRelative(iso)), 60_000)
    return () => clearInterval(id)
  }, [iso])

  return (
    <span suppressHydrationWarning>{label}</span>
  )
}
