import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { requireAuth, getCurrentProfile } from '@/lib/auth'

/**
 * ADMIN専用：問題なしで合格済みセッションを作成する（テスト・動作確認用）
 */
export async function POST() {
  try {
    await requireAuth()
    const profile = await getCurrentProfile()
    if (profile?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'ADMIN権限が必要です' }, { status: 403 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const sessionId = nanoid(12)

    const { error: sessionError } = await supabase
      .from('ai_kentei_exam_sessions')
      .insert({
        session_id: sessionId,
        user_id: user?.id ?? null,
        selected_question_ids: [],
        answers: {},
        score: 20,
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
  } catch {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }
}
