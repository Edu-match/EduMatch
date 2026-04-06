import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { nanoid } from 'nanoid'

export async function POST() {
  try {
    const supabase = await createClient()

    // ログインユーザーのIDを取得（任意）
    const { data: { user } } = await supabase.auth.getUser()

    // 公開済み問題IDを最大50件取得
    const { data: questions, error: questionsError } = await supabase
      .from('ai_kentei_questions')
      .select('id')
      .eq('status', 'published')
      .limit(50)

    if (questionsError || !questions || questions.length < 25) {
      console.error('Error fetching questions:', questionsError)
      return NextResponse.json(
        { error: '問題の取得に失敗しました。問題が不足しています。' },
        { status: 500 }
      )
    }

    // シャッフルして25問選択
    const shuffled = questions.sort(() => Math.random() - 0.5)
    const selectedQuestionIds = shuffled.slice(0, 25).map((q) => q.id)

    const sessionId = nanoid(12)

    const { error: sessionError } = await supabase
      .from('ai_kentei_exam_sessions')
      .insert({
        session_id: sessionId,
        user_id: user?.id ?? null,
        selected_question_ids: selectedQuestionIds,
        answers: {},
      })

    if (sessionError) {
      console.error('Error creating session:', sessionError)
      return NextResponse.json(
        { error: 'セッションの作成に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ sessionId })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
