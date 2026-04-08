import { getAiKenteiDb } from '@/lib/ai-kentei-db'
import { NextResponse } from 'next/server'
import { getCurrentUser, getCurrentProfile } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }
  const profile = await getCurrentProfile()
  if (profile?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'ADMIN権限が必要です' }, { status: 403 })
  }

  const { id } = await params
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON が不正です' }, { status: 400 })
  }

  const supabase = await getAiKenteiDb()

  const update: Record<string, unknown> = {}

  if (typeof body.question_text === 'string') update.question_text = body.question_text.trim()
  if (Array.isArray(body.options)) {
    const opts = body.options.map((o) => String(o).trim()).filter(Boolean)
    if (opts.length >= 2) update.options = opts
  }
  if (typeof body.correct_answer === 'string') update.correct_answer = body.correct_answer.trim()
  if (body.explanation === null || typeof body.explanation === 'string') {
    update.explanation = body.explanation === null ? null : String(body.explanation).trim() || null
  }
  if (body.tag === null || typeof body.tag === 'string') {
    update.tag = body.tag === null ? null : String(body.tag).trim() || null
  }
  if (typeof body.difficulty === 'string' && ['easy', 'medium', 'hard'].includes(body.difficulty)) {
    update.difficulty = body.difficulty
  }
  if (typeof body.status === 'string' && (body.status === 'draft' || body.status === 'published')) {
    update.status = body.status
  }
  if (typeof body.polarity === 'string' && (body.polarity === 'normal' || body.polarity === 'reverse')) {
    update.polarity = body.polarity
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: '更新項目がありません' }, { status: 400 })
  }

  // 正解が選択肢に含まれるか（両方送られた場合）
  const finalOpts = update.options as string[] | undefined
  const finalCorrect = update.correct_answer as string | undefined
  if (finalOpts && finalCorrect && !finalOpts.includes(finalCorrect)) {
    return NextResponse.json({ error: '正解は選択肢のいずれかと一致する必要があります' }, { status: 400 })
  }

  const { data: row, error } = await supabase
    .from('ai_kentei_questions')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('admin ai-kentei questions PATCH:', error)
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }

  if (!row) {
    return NextResponse.json({ error: '問題が見つかりません' }, { status: 404 })
  }

  return NextResponse.json({ question: row })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }
  const profile = await getCurrentProfile()
  if (profile?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'ADMIN権限が必要です' }, { status: 403 })
  }

  const { id } = await params
  const supabase = await getAiKenteiDb()

  const { error } = await supabase.from('ai_kentei_questions').delete().eq('id', id)

  if (error) {
    console.error('admin ai-kentei questions DELETE:', error)
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
