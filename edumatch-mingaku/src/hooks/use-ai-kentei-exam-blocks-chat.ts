'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { isAiKenteiExamInProgressPath } from '@/lib/ai-kentei-exam-guard'

/**
 * AI検定の受験中は true。
 * - 受験画面のパス
 * - サーバー上の未完了セッション（別タブ・他ページからのチャット防止）
 */
export function useAiKenteiExamBlocksChat(): boolean {
  const pathname = usePathname()
  const onExamPage = isAiKenteiExamInProgressPath(pathname)
  const [hasIncompleteSession, setHasIncompleteSession] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/ai-kentei/exam/active', { credentials: 'include' })
      .then((r) => r.json())
      .then((d: { active?: boolean }) => {
        if (!cancelled) setHasIncompleteSession(!!d.active)
      })
      .catch(() => {
        if (!cancelled) setHasIncompleteSession(false)
      })
    return () => {
      cancelled = true
    }
  }, [pathname])

  return onExamPage || hasIncompleteSession
}
