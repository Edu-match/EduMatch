import { createClient } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/server-admin'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    console.log('Result API - fetching session:', sessionId)

    // まず通常クライアントで試す
    let supabase = await createClient()
    let session
    let sessionError

    const response1 = await supabase
      .from('ai_kentei_exam_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single()

    session = response1.data
    sessionError = response1.error

    // RLSで見えない場合、サービスロールキーで試す
    if (sessionError?.code === '42501' || !session) {
      console.log('Result API - RLS denied or not found, trying service role')
      try {
        supabase = createServiceRoleClient()
        const response2 = await supabase
          .from('ai_kentei_exam_sessions')
          .select('*')
          .eq('session_id', sessionId)
          .single()

        session = response2.data
        sessionError = response2.error
      } catch (e) {
        console.error('Service role client error:', e)
      }
    }

    console.log('Result API - session query:', { session, sessionError })

    if (sessionError || !session) {
      console.error('Session not found:', sessionError?.message)
      return NextResponse.json(
        { error: 'セッションが見つかりません' },
        { status: 404 }
      )
    }

    if (session.score === null) {
      console.error('Session not completed:', { sessionId })
      return NextResponse.json(
        { error: 'この試験はまだ完了していません' },
        { status: 400 }
      )
    }

    const questionIds = session.selected_question_ids as string[]
    console.log('Result API - question IDs:', questionIds)

    // テストセッションは問題なし
    let orderedQuestions: unknown[] = []
    if (questionIds.length > 0) {
      const { data: questions, error: questionsError } = await supabase
        .from('ai_kentei_questions')
        .select('id, question_text, options, correct_answer, explanation, tag')
        .in('id', questionIds)

      console.log('Result API - questions query:', { count: questions?.length, questionsError })

      if (questionsError || !questions) {
        console.error('Questions fetch error:', questionsError?.message)
        return NextResponse.json(
          { error: '問題の取得に失敗しました' },
          { status: 500 }
        )
      }

      orderedQuestions = questionIds
        .map((id) => questions.find((q) => q.id === id))
        .filter(Boolean)
    }

    const response = {
      session: {
        sessionId: session.session_id,
        answers: session.answers,
        score: session.score,
        passed: session.passed,
      },
      questions: orderedQuestions,
    }
    console.log('Result API - returning:', { sessionId, score: session.score, passed: session.passed, questionCount: orderedQuestions.length })
    return NextResponse.json(response)
  } catch (error) {
    console.error('Unexpected error in result API:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
