import { NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { getCurrentUser, getCurrentProfile } from '@/lib/auth'
import { createServiceRoleClient } from '@/utils/supabase/server-admin'

/**
 * ADMIN専用：問題なしで合格済みセッションを作成する（テスト・動作確認用）
 * 問題バンクが空でも動作します（DBテーブルが存在し、サービスロールキーが設定されていることが前提）。
 */
export async function POST() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'ADMIN権限が必要です' },
      { status: 403 }
    )
  }

  let supabase
  try {
    supabase = createServiceRoleClient()
  } catch (e) {
    console.error('Service role client:', e)
    return NextResponse.json(
      { error: 'サーバー設定（SUPABASE_SERVICE_ROLE_KEY）が不足しています' },
      { status: 500 }
    )
  }

  const sessionId = nanoid(12)
  console.log('Test API - creating session:', { sessionId, userId: user.id })

  const { error: sessionError } = await supabase.from('ai_kentei_exam_sessions').insert({
    session_id: sessionId,
    user_id: user.id,
    selected_question_ids: [],
    answers: {},
    score: 25,
    passed: true,
  })

  console.log('Test API - insert result:', { sessionError })

  if (sessionError) {
    console.error('Test session error:', sessionError)
    const isTableMissing =
      sessionError.message?.includes('does not exist') || sessionError.code === '42P01'
    return NextResponse.json(
      {
        error: isTableMissing
          ? 'ai_kentei_exam_sessions テーブルがありません。Supabase のマイグレーションを実行してください。'
          : `セッション作成エラー: ${sessionError.message}`,
        code: sessionError.code,
      },
      { status: 500 }
    )
  }

  console.log('Test API - success, returning:', { sessionId })
  return NextResponse.json({ sessionId })
}
