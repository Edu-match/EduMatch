'use client'

import { certificateMincho } from '@/lib/fonts/certificate-mincho'

interface CertificatePreviewProps {
  name: string
  photoUrl?: string | null
  score?: number
  totalQuestions?: number
  date: Date
  certificateId?: string | null
}

/** テンプレート原寸（certificate-template.jpg） */
const W = 1024
const H = 723

/** viewBox 座標（テンプレート上で合成確認済み） */
const POS = {
  name: { x: 660, y: 200, fontSize: 32 },
  date: { x: 450, y: 300, fontSize: 24 },
  certificateId: { x: 450, y: 320, fontSize: 24 },
} as const

export function CertificatePreview({
  name,
  photoUrl,
  score,
  totalQuestions,
  date,
  certificateId,
}: CertificatePreviewProps) {
  void photoUrl
  void score
  void totalQuestions

  const formatDate = (d: Date) =>
    new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d)

  return (
    <div
      className={`relative w-full aspect-[1024/723] overflow-hidden rounded-lg shadow-2xl ${certificateMincho.className}`}
      lang="ja"
    >
      <img
        src="/ai-kentei/certificate-template.jpg"
        alt=""
        className="absolute inset-0 h-full w-full"
        width={W}
        height={H}
        draggable={false}
      />

      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
        style={{ fontFamily: certificateMincho.style.fontFamily }}
      >
        <text
          x={POS.name.x}
          y={POS.name.y}
          textAnchor="end"
          dominantBaseline="alphabetic"
          fill="#1a1a1a"
          fontSize={POS.name.fontSize}
          fontWeight={600}
          letterSpacing="0.04em"
        >
          {name || '受験者名'}
        </text>

        <text
          x={POS.date.x}
          y={POS.date.y}
          textAnchor="start"
          dominantBaseline="alphabetic"
          fill="#1a1a1a"
          fontSize={POS.date.fontSize}
          letterSpacing="0.03em"
        >
          {formatDate(date)}
        </text>

        {certificateId ? (
          <text
            x={POS.certificateId.x}
            y={POS.certificateId.y}
            textAnchor="start"
            dominantBaseline="alphabetic"
            fill="#1a1a1a"
            fontSize={POS.certificateId.fontSize}
            letterSpacing="0.02em"
          >
            {certificateId}
          </text>
        ) : null}
      </svg>
    </div>
  )
}
