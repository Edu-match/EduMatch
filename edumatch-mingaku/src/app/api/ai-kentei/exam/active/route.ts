import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getIncompleteAiKenteiExamSessionId } from '@/lib/ai-kentei-exam-guard'

export const dynamic = 'force-dynamic'

/** ログインユーザーに未完了の AI 検定セッションがあるか */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ active: false })
  }

  const sessionId = await getIncompleteAiKenteiExamSessionId(user.id)
  return NextResponse.json({
    active: sessionId !== null,
    sessionId: sessionId ?? undefined,
  })
}
