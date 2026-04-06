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

    const [
      { count: totalQuestions },
      { count: publishedQuestions },
      { count: draftQuestions },
      { count: totalExams },
      { count: passedExams },
      { count: totalCertificates },
    ] = await Promise.all([
      supabase.from('ai_kentei_questions').select('*', { count: 'exact', head: true }),
      supabase.from('ai_kentei_questions').select('*', { count: 'exact', head: true }).eq('status', 'published'),
      supabase.from('ai_kentei_questions').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
      supabase.from('ai_kentei_exam_sessions').select('*', { count: 'exact', head: true }).not('score', 'is', null),
      supabase.from('ai_kentei_exam_sessions').select('*', { count: 'exact', head: true }).eq('passed', true),
      supabase.from('ai_kentei_certificates').select('*', { count: 'exact', head: true }),
    ])

    return NextResponse.json({
      totalQuestions: totalQuestions || 0,
      publishedQuestions: publishedQuestions || 0,
      draftQuestions: draftQuestions || 0,
      totalExams: totalExams || 0,
      passedExams: passedExams || 0,
      totalCertificates: totalCertificates || 0,
    })
  } catch {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }
}
