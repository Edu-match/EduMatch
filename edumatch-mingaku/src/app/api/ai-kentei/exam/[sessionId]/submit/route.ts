import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const body = await request.json()
    const { answers } = body

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

    if (session.score !== null) {
      return NextResponse.json(
        { error: 'この試験は既に提出されています' },
        { status: 400 }
      )
    }

    const questionIds = session.selected_question_ids as string[]
    const { data: questions, error: questionsError } = await supabase
      .from('ai_kentei_questions')
      .select('id, correct_answer')
      .in('id', questionIds)

    if (questionsError || !questions) {
      return NextResponse.json(
        { error: '問題の取得に失敗しました' },
        { status: 500 }
      )
    }

    let correctCount = 0
    const answerRecord = answers as Record<string, string>

    for (const question of questions) {
      if (answerRecord[question.id] === question.correct_answer) {
        correctCount++
      }
    }

    const score = correctCount
    const passed = score >= 20

    const { error: updateError } = await supabase
      .from('ai_kentei_exam_sessions')
      .update({ answers: answerRecord, score, passed })
      .eq('session_id', sessionId)

    if (updateError) {
      return NextResponse.json(
        { error: '結果の保存に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ score, totalQuestions: 25, passed, correctCount })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
