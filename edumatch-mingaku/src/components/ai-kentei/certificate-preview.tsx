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

      {/* 氏名のみ（テンプレの「殿」列と縦方向で揃える。サイズは本文より一段大きい程度に抑える） */}
      <div
        className="absolute right-[33.5%] top-[22%] max-h-[46%] overflow-hidden text-[#4a2d12]"
        style={verticalStyle}
      >
        <span
          className="font-semibold tracking-[0.03em]"
          style={{ fontSize: 'clamp(0.78rem, 2.15cqi, 1.28rem)', lineHeight: 1.06 }}
        >
          {name || '受験者名'}
        </span>
      </div>

      {/* スコア値（「スコア」ラベルの左列・やや下） */}
      <div
        className="absolute right-[67.2%] top-[34%] text-[#4a2d12]"
        style={verticalStyle}
      >
        <span className="font-semibold" style={{ fontSize: 'clamp(0.72rem, 1.85cqi, 1.15rem)', lineHeight: 1.15 }}>
          {toFullWidthDigits(`${score}`)}／{toFullWidthDigits(`${totalQuestions}`)}
        </span>
      </div>

      {/* 認定日値（「認定日」ラベルの下から開始して重なり回避） */}
      <div
        className="absolute right-[81.2%] top-[31%] text-[#4a2d12]"
        style={verticalStyle}
      >
        <span style={{ fontSize: 'clamp(0.68rem, 1.65cqi, 1.05rem)', lineHeight: 1.38 }}>
          {toFullWidthDigits(formatDate(date))}
        </span>
      </div>
    </div>
  )
}
