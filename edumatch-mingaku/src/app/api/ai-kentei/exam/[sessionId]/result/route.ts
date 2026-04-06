import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const supabase = await createClient()

    const { data: session, error: sessionError } = await supabase
      .from('ai_kentei_exam_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'セッションが見つかりません' },
        { status: 404 }
      )
    }

    if (session.score === null) {
      return NextResponse.json(
        { error: 'この試験はまだ完了していません' },
        { status: 400 }
      )
    }

    const questionIds = session.selected_question_ids as string[]
    const { data: questions, error: questionsError } = await supabase
      .from('ai_kentei_questions')
      .select('id, question_text, options, correct_answer, explanation, tag')
      .in('id', questionIds)

    if (questionsError || !questions) {
      return NextResponse.json(
        { error: '問題の取得に失敗しました' },
        { status: 500 }
      )
    }

    const orderedQuestions = questionIds
      .map((id) => questions.find((q) => q.id === id))
      .filter(Boolean)

    return NextResponse.json({
      session: {
        sessionId: session.session_id,
        answers: session.answers,
        score: session.score,
        passed: session.passed,
      },
      questions: orderedQuestions,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
