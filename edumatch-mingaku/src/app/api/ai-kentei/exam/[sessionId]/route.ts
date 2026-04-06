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

    const questionIds = session.selected_question_ids as string[]
    const { data: questions, error: questionsError } = await supabase
      .from('ai_kentei_questions')
      .select('id, question_text, options, tag, difficulty, polarity')
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
        isCompleted: session.score !== null,
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const body = await request.json()
    const { answers } = body

    const supabase = await createClient()

    const { error } = await supabase
      .from('ai_kentei_exam_sessions')
      .update({ answers })
      .eq('session_id', sessionId)

    if (error) {
      return NextResponse.json(
        { error: '回答の保存に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
