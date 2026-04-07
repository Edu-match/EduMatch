import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { getCurrentUser, getCurrentProfile } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }
  const profile = await getCurrentProfile()
  if (profile?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'ADMIN権限が必要です' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: questions, error } = await supabase
    .from('ai_kentei_questions')
    .select('*')
    .order('question_number', { ascending: true })

  if (error) {
    console.error('admin ai-kentei questions GET:', error)
    return NextResponse.json({ error: '問題の取得に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ questions: questions ?? [] })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }
  const profile = await getCurrentProfile()
  if (profile?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'ADMIN権限が必要です' }, { status: 403 })
  }

  let body: {
    question_text?: string
    options?: string[]
    correct_answer?: string
    explanation?: string | null
    tag?: string | null
    difficulty?: string
    status?: string
    polarity?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON が不正です' }, { status: 400 })
  }

  const { question_text, options, correct_answer, explanation, tag, difficulty, status, polarity } = body

  if (!question_text?.trim() || !Array.isArray(options) || options.length < 2) {
    return NextResponse.json(
      { error: '問題文と選択肢（2つ以上）が必要です' },
      { status: 400 }
    )
  }

  const trimmedOptions = options.map((o) => String(o).trim()).filter(Boolean)
  if (trimmedOptions.length < 2) {
    return NextResponse.json({ error: '有効な選択肢が2つ以上必要です' }, { status: 400 })
  }

  if (!correct_answer || !trimmedOptions.includes(correct_answer.trim())) {
    return NextResponse.json(
      { error: '正解は選択肢のいずれかと完全一致する文字列にしてください' },
      { status: 400 }
    )
  }

  const statusVal = status === 'published' || status === 'draft' ? status : 'draft'
  const diff = ['easy', 'medium', 'hard'].includes(difficulty ?? '') ? difficulty! : 'medium'

  const supabase = await createClient()

  const { data: row, error } = await supabase
    .from('ai_kentei_questions')
    .insert({
      question_text: question_text.trim(),
      options: trimmedOptions,
      correct_answer: correct_answer.trim(),
      explanation: explanation?.trim() || null,
      tag: tag?.trim() || null,
      difficulty: diff,
      polarity: polarity === 'reverse' ? 'reverse' : 'normal',
      status: statusVal,
      created_by_ai: false,
      reviewed_by_human: true,
    })
    .select()
    .single()

  if (error) {
    console.error('admin ai-kentei questions POST:', error)
    return NextResponse.json({ error: '作成に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ question: row })
}
