import { getAiKenteiDb } from '@/lib/ai-kentei-db'
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auth = await createClient()
    const {
      data: { user },
    } = await auth.auth.getUser()

    if (!user) {
      return NextResponse.json({ certificates: [] })
    }

    const db = await getAiKenteiDb()
    const { data, error } = await db
      .from('ai_kentei_certificates')
      .select(
        'id, certificate_id, public_display_name, score, passed_at, share_slug, is_public'
      )
      .eq('user_id', user.id)
      .order('passed_at', { ascending: false })
      .limit(5)

    if (error) {
      console.error('ai-kentei certificates GET:', error)
      return NextResponse.json(
        { error: '認定証の取得に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ certificates: data ?? [] })
  } catch (e) {
    console.error('ai-kentei certificates GET unexpected:', e)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}

