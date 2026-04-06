import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { Resend } from 'resend'

async function sendCertificateEmail(
  email: string,
  displayName: string,
  certificateId: string,
  score: number,
  shareSlug: string,
  siteUrl: string
) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return

  const resend = new Resend(apiKey)
  const fromRaw = process.env.RESEND_FROM_EMAIL?.trim()
  const from = fromRaw
    ? fromRaw.includes('<') ? fromRaw : `エデュマッチ <${fromRaw}>`
    : 'エデュマッチ <onboarding@resend.dev>'

  const certUrl = `${siteUrl}/ai-kentei/c/${shareSlug}`

  await resend.emails.send({
    from,
    to: email,
    subject: `【AI検定】合格認定証を発行しました - ${displayName}さん`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #4f46e5; font-size: 24px; margin-bottom: 16px;">合格おめでとうございます！</h1>
        <p style="font-size: 16px; color: #374151; margin-bottom: 8px;">
          ${displayName} 様
        </p>
        <p style="font-size: 15px; color: #6b7280; margin-bottom: 24px;">
          生成AI活用ガイドライン検定（教育AI活用ビギナー部門）に合格しました。
        </p>

        <div style="background: #f3f4f6; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <p style="font-size: 14px; color: #374151; margin: 0 0 8px 0;"><strong>認定証番号：</strong> ${certificateId}</p>
          <p style="font-size: 14px; color: #374151; margin: 0;"><strong>スコア：</strong> ${score} / 25 問正解</p>
        </div>

        <a
          href="${certUrl}"
          style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600; margin-bottom: 24px;"
        >
          認定証を確認する
        </a>

        <p style="font-size: 13px; color: #9ca3af; margin-top: 32px;">
          このメールはエデュマッチから自動送信されています。
        </p>
      </div>
    `,
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sessionId, displayName, photoUrl, nameType } = body

    if (!sessionId || !displayName) {
      return NextResponse.json(
        { error: '必須項目が不足しています' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // ログインユーザー情報取得
    const { data: { user } } = await supabase.auth.getUser()

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

    if (!session.passed) {
      return NextResponse.json(
        { error: '合格者のみ認定証を発行できます' },
        { status: 400 }
      )
    }

    // 既存の認定証を確認
    const { data: existingCert } = await supabase
      .from('ai_kentei_certificates')
      .select('*')
      .eq('exam_session_id', session.id)
      .single()

    if (existingCert) {
      return NextResponse.json({
        certificateId: existingCert.certificate_id,
        shareSlug: existingCert.share_slug,
      })
    }

    const certificateId = `CERT-${nanoid(8).toUpperCase()}`
    const shareSlug = nanoid(10)

    const { error: createError } = await supabase
      .from('ai_kentei_certificates')
      .insert({
        certificate_id: certificateId,
        exam_session_id: session.id,
        user_id: user?.id ?? null,
        public_display_name: displayName,
        name_type: nameType ?? 'custom',
        photo_url: photoUrl || null,
        score: session.score,
        share_slug: shareSlug,
      })

    if (createError) {
      console.error('Error creating certificate:', createError)
      return NextResponse.json(
        { error: '認定証の発行に失敗しました' },
        { status: 500 }
      )
    }

    // メール送信（ログインユーザーのみ）
    if (user?.email) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://edu-match.com'
      try {
        await sendCertificateEmail(
          user.email,
          displayName,
          certificateId,
          session.score,
          shareSlug,
          siteUrl
        )
        // email_sent フラグを更新
        await supabase
          .from('ai_kentei_certificates')
          .update({ email_sent: true })
          .eq('certificate_id', certificateId)
      } catch (emailError) {
        console.error('Failed to send certificate email:', emailError)
        // メール送信失敗は致命的エラーとしない
      }
    }

    return NextResponse.json({ certificateId, shareSlug })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
