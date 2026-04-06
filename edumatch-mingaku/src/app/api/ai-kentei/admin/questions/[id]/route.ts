import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { requireAuth, getCurrentProfile } from '@/lib/auth'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const profile = await getCurrentProfile()
    if (profile?.role !== 'ADMIN') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const supabase = await createClient()

    const { data: question, error } = await supabase
      .from('ai_kentei_questions')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: '問題の更新に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ question })
  } catch {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const profile = await getCurrentProfile()
    if (profile?.role !== 'ADMIN') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    const { id } = await params
    const supabase = await createClient()

    const { error } = await supabase
      .from('ai_kentei_questions')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: '問題の削除に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }
}
