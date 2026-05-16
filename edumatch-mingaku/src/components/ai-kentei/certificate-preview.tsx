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

      {/*
        viewBox でテンプレートと同一座標系（% 指定よりズレにくい）
        座標は certificate-template.jpg 上で合成テスト済み
      */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        aria-hidden
        style={{ fontFamily: certificateMincho.style.fontFamily }}
      >
        <text
          x={595}
          y={335}
          textAnchor="end"
          fill="#1a1a1a"
          fontSize={24}
          fontWeight={600}
          letterSpacing="0.04em"
        >
          {name || '受験者名'}
        </text>

        <text x={505} y={494} textAnchor="start" fill="#1a1a1a" fontSize={15} letterSpacing="0.03em">
          {formatDate(date)}
        </text>

        {certificateId ? (
          <text x={505} y={512} textAnchor="start" fill="#1a1a1a" fontSize={14} letterSpacing="0.02em">
            {certificateId}
          </text>
        ) : null}
      </svg>
    </div>
  )
}
