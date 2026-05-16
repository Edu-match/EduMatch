'use client'

import type { CSSProperties } from 'react'
import { certificateMincho } from '@/lib/fonts/certificate-mincho'

interface CertificatePreviewProps {
  name: string
  photoUrl?: string | null
  score?: number
  totalQuestions?: number
  date: Date
  certificateId?: string | null
}

/**
 * 背景画像 `public/ai-kentei/certificate-template.png` 上の可変テキスト位置。
 * 氏名・認定日・認定番号のみオーバーレイ（ラベルと「様」は背景）。
 */
const OVERLAY = {
  name: {
    left: '36%',
    right: '11%',
    top: '43.2%',
    fontSize: 'clamp(0.95rem, 3.4cqi, 1.65rem)',
  },
  date: {
    left: '49.5%',
    top: '54.6%',
    fontSize: 'clamp(0.62rem, 1.75cqi, 0.92rem)',
  },
  certificateId: {
    left: '49.5%',
    top: '60.5%',
    fontSize: 'clamp(0.62rem, 1.75cqi, 0.92rem)',
  },
} as const

const overlayText: CSSProperties = {
  color: '#1a1a1a',
  letterSpacing: '0.04em',
}

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
      className={`relative w-full aspect-[1024/723] overflow-hidden rounded-lg shadow-2xl [container-type:inline-size] ${certificateMincho.className}`}
      lang="ja"
    >
      <img src="/ai-kentei/certificate-template.png" alt="" className="absolute inset-0 h-full w-full object-cover" />

      <div
        className="absolute overflow-hidden whitespace-nowrap text-right font-semibold"
        style={{
          ...overlayText,
          left: OVERLAY.name.left,
          right: OVERLAY.name.right,
          top: OVERLAY.name.top,
          fontSize: OVERLAY.name.fontSize,
        }}
      >
        {name || '受験者名'}
      </div>

      <div
        className="absolute whitespace-nowrap"
        style={{
          ...overlayText,
          left: OVERLAY.date.left,
          top: OVERLAY.date.top,
          fontSize: OVERLAY.date.fontSize,
        }}
      >
        {formatDate(date)}
      </div>

      {certificateId ? (
        <div
          className="absolute whitespace-nowrap"
          style={{
            ...overlayText,
            left: OVERLAY.certificateId.left,
            top: OVERLAY.certificateId.top,
            fontSize: OVERLAY.certificateId.fontSize,
          }}
        >
          {certificateId}
        </div>
      ) : null}
    </div>
  )
}
