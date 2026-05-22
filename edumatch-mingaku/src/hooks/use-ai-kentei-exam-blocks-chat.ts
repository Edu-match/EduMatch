'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { isAiKenteiExamInProgressPath } from '@/lib/ai-kentei-exam-guard-shared'

const EXAM_SESSION_PATH = /^\/ai-kentei\/exam\/([^/]+)$/

function abandonExamSession(sessionId: string): void {
  fetch(`/api/ai-kentei/exam/${sessionId}/abandon`, {
    method: 'POST',
    credentials: 'include',
    keepalive: true,
  }).catch(() => undefined)
}

/**
 * AI検定の受験画面にいる間だけ true（チャット不可）。
 * 受験画面を離れたら abandon して未完了セッションを破棄する。
 */
export function useAiKenteiExamBlocksChat(): boolean {
  const pathname = usePathname()
  const onExamPage = isAiKenteiExamInProgressPath(pathname)
  const prevPathRef = useRef(pathname)

  useEffect(() => {
    const prev = prevPathRef.current
    prevPathRef.current = pathname

    if (!isAiKenteiExamInProgressPath(prev) || isAiKenteiExamInProgressPath(pathname)) {
      return
    }

    const match = prev.match(EXAM_SESSION_PATH)
    if (match?.[1]) {
      abandonExamSession(match[1])
    }
  }, [pathname])

  return onExamPage
}
