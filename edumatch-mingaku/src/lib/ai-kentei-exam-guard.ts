import { getAiKenteiDb } from '@/lib/ai-kentei-db'
import { AI_KENTEI_CHAT_BLOCKED_MESSAGE } from '@/lib/ai-kentei-exam-guard-shared'

export {
  AI_KENTEI_CHAT_BLOCKED_MESSAGE,
  AI_KENTEI_EXAM_IN_PROGRESS_PATH,
  isAiKenteiExamInProgressPath,
} from '@/lib/ai-kentei-exam-guard-shared'

/** 未提出（score が null）の検定セッションがあれば session_id を返す */
export async function getIncompleteAiKenteiExamSessionId(
  userId: string
): Promise<string | null> {
  try {
    const db = await getAiKenteiDb()
    const { data, error } = await db
      .from('ai_kentei_exam_sessions')
      .select('session_id')
      .eq('user_id', userId)
      .is('score', null)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.error('[ai-kentei-exam-guard] incomplete session lookup failed:', error)
      return null
    }

    const row = data?.[0] as { session_id?: string } | undefined
    return row?.session_id ?? null
  } catch (e) {
    console.error('[ai-kentei-exam-guard] unexpected error:', e)
    return null
  }
}

export async function userHasIncompleteAiKenteiExam(userId: string): Promise<boolean> {
  const sessionId = await getIncompleteAiKenteiExamSessionId(userId)
  return sessionId !== null
}

export function aiKenteiExamChatBlockedResponse(): Response {
  return new Response(
    JSON.stringify({
      error: AI_KENTEI_CHAT_BLOCKED_MESSAGE,
      code: 'AI_KENTEI_EXAM_IN_PROGRESS',
    }),
    { status: 403, headers: { 'Content-Type': 'application/json' } }
  )
}
