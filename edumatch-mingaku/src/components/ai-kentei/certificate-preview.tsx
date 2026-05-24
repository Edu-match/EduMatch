'use client'

import { certificateMincho } from '@/lib/fonts/certificate-mincho'
import {
  CERTIFICATE_HEIGHT,
  CERTIFICATE_TEXT_POS as POS,
  CERTIFICATE_WIDTH,
} from '@/lib/certificate-canvas'

interface CertificatePreviewProps {
  name: string
  photoUrl?: string | null
  score?: number
  totalQuestions?: number
  date: Date
  certificateId?: string | null
}

const W = CERTIFICATE_WIDTH
const H = CERTIFICATE_HEIGHT

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
