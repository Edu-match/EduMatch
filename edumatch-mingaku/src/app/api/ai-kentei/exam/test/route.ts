import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { getCurrentUser, getCurrentProfile } from '@/lib/auth'

/**
 * ADMIN専用：問題なしで合格済みセッションを作成する（テスト・動作確認用）
 */
export async function POST() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const profile = await getCurrentProfile()
  if (profile?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'ADMIN権限が必要です' }, { status: 403 })
  }

  const supabase = await createClient()
  const sessionId = nanoid(12)

  const { error: sessionError } = await supabase
    .from('ai_kentei_exam_sessions')
    .insert({
      session_id: sessionId,
      user_id: user.id,
      selected_question_ids: [],
      answers: {},
      score: 25,
      passed: true,
    })

  if (sessionError) {
    console.error('Error creating test session:', sessionError)
    return NextResponse.json(
      { error: 'テストセッションの作成に失敗しました' },
      { status: 500 }
    )
  }

  return NextResponse.json({ sessionId })
}
