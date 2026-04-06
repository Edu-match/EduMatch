import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { requireAuth, getCurrentProfile } from '@/lib/auth'

export async function GET() {
  try {
    await requireAuth()
    const profile = await getCurrentProfile()
    if (profile?.role !== 'ADMIN') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    const supabase = await createClient()
    const { data: questions, error } = await supabase
      .from('ai_kentei_questions')
      .select('*')
      .order('question_number', { ascending: true })

    if (error) {
      return NextResponse.json({ error: '問題の取得に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ questions })
  } catch {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }
}

export async function POST(request: Request) {
  try {
    await requireAuth()
    const profile = await getCurrentProfile()
    if (profile?.role !== 'ADMIN') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    const body = await request.json()
    const supabase = await createClient()

    const { data: lastQuestion } = await supabase
      .from('ai_kentei_questions')
      .select('question_number')
      .order('question_number', { ascending: false })
      .limit(1)
      .single()

    const nextNumber = (lastQuestion?.question_number || 0) + 1

    const { data: question, error } = await supabase
      .from('ai_kentei_questions')
      .insert({
        ...body,
        question_number: nextNumber,
        polarity: 'normal',
        created_by_ai: false,
        reviewed_by_human: true,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: '問題の作成に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ question })
  } catch {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }
}
