import { getAiKenteiDb } from '@/lib/ai-kentei-db'
import { getCurrentUser } from '@/lib/auth'
import { NextResponse } from 'next/server'

/** ページ離脱時に未完了セッションを破棄する。navigator.sendBeacon 対応のため POST。 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId } = await params
  const supabase = await getAiKenteiDb()

  const { error } = await supabase
    .from('ai_kentei_exam_sessions')
    .delete()
    .eq('session_id', sessionId)
    .eq('user_id', user.id)
    .is('score', null)

  if (error) {
    console.error('[ai-kentei/abandon] failed to delete session:', error)
    return NextResponse.json({ error: 'Failed to abandon session' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
