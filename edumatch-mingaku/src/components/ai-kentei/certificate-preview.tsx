'use client'

import { certificateMincho } from '@/lib/fonts/certificate-mincho'

interface CertificatePreviewProps {
  name: string
  photoUrl: string | null
  score: number
  totalQuestions: number
  date: Date
  certificateId?: string | null
}

export function CertificatePreview({
  name,
  photoUrl,
  score,
  totalQuestions,
  date,
  certificateId,
}: CertificatePreviewProps) {
  const formatDate = (d: Date) =>
    new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d)
  const toFullWidthDigits = (value: string) =>
    value.replace(/\d/g, (digit) => String.fromCharCode(digit.charCodeAt(0) + 0xfee0))

  void photoUrl
  void certificateId

  const verticalStyle = {
    writingMode: 'vertical-rl' as const,
    textOrientation: 'upright' as const,
  }

  return (
    <div
      className={`relative w-full aspect-video overflow-hidden rounded-lg shadow-2xl [container-type:inline-size] ${certificateMincho.className}`}
      lang="ja"
    >
      <img src="/ai-kentei/certificate-template.png" alt="" className="absolute inset-0 h-full w-full object-cover" />

      {/* 氏名のみ（テンプレの「殿」直上になるよう下げ、本文列から離すためやや右へ） */}
      <div
        className="absolute right-[30.2%] top-[29%] max-h-[40%] overflow-hidden text-[#4a2d12]"
        style={verticalStyle}
      >
        <span
          className="font-semibold tracking-[0.03em]"
          style={{ fontSize: 'clamp(0.78rem, 2.15cqi, 1.28rem)', lineHeight: 1.06 }}
        >
          {name || '受験者名'}
        </span>
      </div>

      {/* スコア値（日付列と離すため中央寄り＝ right を小さく） */}
      <div
        className="absolute right-[59.5%] top-[35.5%] text-[#4a2d12]"
        style={verticalStyle}
      >
        <span className="font-semibold" style={{ fontSize: 'clamp(0.72rem, 1.85cqi, 1.15rem)', lineHeight: 1.15 }}>
          {toFullWidthDigits(`${score}`)}／{toFullWidthDigits(`${totalQuestions}`)}
        </span>
      </div>

      {/* 認定日値（ラベル「認定日」と重ならないよう下げ、左端に寄りすぎないよう right を下げる） */}
      <div
        className="absolute right-[74.8%] top-[39.5%] text-[#4a2d12]"
        style={verticalStyle}
      >
        <span style={{ fontSize: 'clamp(0.68rem, 1.65cqi, 1.05rem)', lineHeight: 1.38 }}>
          {toFullWidthDigits(formatDate(date))}
        </span>
      </div>
    </div>
  )
}
