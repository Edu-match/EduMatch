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

      {/* 氏名（テンプレ側の「殿」と組み合わせて ○○ 殿 にする） */}
      <div
        className="absolute right-[38.1%] top-[15.2%] text-[#4a2d12]"
        style={verticalStyle}
      >
        <span
          className="font-semibold tracking-[0.02em]"
          style={{ fontSize: 'clamp(1.15rem, 3.35cqi, 2.25rem)', lineHeight: 1.08 }}
        >
          {name || '受験者名'}
        </span>
      </div>

      {/* スコア値 */}
      <div
        className="absolute right-[68.9%] top-[31.8%] text-[#4a2d12]"
        style={verticalStyle}
      >
        <span className="font-semibold" style={{ fontSize: 'clamp(0.85rem, 2.1cqi, 1.4rem)', lineHeight: 1.18 }}>
          {toFullWidthDigits(`${score}`)}／{toFullWidthDigits(`${totalQuestions}`)}
        </span>
      </div>

      {/* 認定日値 */}
      <div
        className="absolute right-[82.1%] top-[27.4%] text-[#4a2d12]"
        style={verticalStyle}
      >
        <span style={{ fontSize: 'clamp(0.72rem, 1.72cqi, 1.12rem)', lineHeight: 1.42 }}>
          {toFullWidthDigits(formatDate(date))}
        </span>
      </div>
    </div>
  )
}
