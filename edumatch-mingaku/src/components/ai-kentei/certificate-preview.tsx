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

  void photoUrl
  void certificateId

  const verticalStyle = {
    writingMode: 'vertical-rl' as const,
    textOrientation: 'mixed' as const,
  }

  return (
    <div
      className={`relative w-full aspect-video overflow-hidden rounded-lg shadow-2xl [container-type:inline-size] ${certificateMincho.className}`}
      lang="ja"
    >
      <img src="/ai-kentei/certificate-template.png" alt="" className="absolute inset-0 h-full w-full object-cover" />

      {/* 氏名（テンプレ側の「殿」と組み合わせて ○○ 殿 にする） */}
      <div
        className="absolute right-[36.4%] top-[17%] text-[#4a2d12]"
        style={verticalStyle}
      >
        <span className="font-semibold tracking-[0.04em]" style={{ fontSize: 'clamp(1.35rem, 4.1cqi, 2.75rem)', lineHeight: 1.12 }}>
          {name || '受験者名'}
        </span>
      </div>

      {/* スコア値 */}
      <div
        className="absolute right-[70.6%] top-[30.5%] text-[#4a2d12]"
        style={verticalStyle}
      >
        <span className="font-semibold" style={{ fontSize: 'clamp(1rem, 2.6cqi, 1.8rem)', lineHeight: 1.2 }}>
          {score}／{totalQuestions}
        </span>
      </div>

      {/* 認定日値 */}
      <div
        className="absolute right-[82.3%] top-[27.5%] text-[#4a2d12]"
        style={verticalStyle}
      >
        <span style={{ fontSize: 'clamp(0.85rem, 2cqi, 1.35rem)', lineHeight: 1.45 }}>
          {formatDate(date)}
        </span>
      </div>
    </div>
  )
}
