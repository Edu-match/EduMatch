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

/** テンプレート原寸 1024×723px */
const TEMPLATE = { w: 1024, h: 723 } as const

const pct = (x: number, axis: 'w' | 'h') =>
  `${(x / TEMPLATE[axis]) * 100}%`

/**
 * 背景 `certificate-template.jpg` 上の可変テキスト位置。
 * ラベル（認定日・認定番号）と「様」は背景画像に含まれる。
 */
const OVERLAY = {
  /** 金線（y≈348）の上・「様」（x≈620）の左 */
  name: {
    left: pct(390, 'w'),
    right: pct(1024 - 618, 'w'),
    top: pct(334, 'h'),
    fontSize: 'clamp(0.9rem, 3.2cqi, 1.55rem)',
  },
  /** 「認定日：」コロン直後（y≈410） */
  date: {
    left: pct(512, 'w'),
    top: pct(410, 'h'),
    fontSize: 'clamp(0.6rem, 1.7cqi, 0.9rem)',
  },
  /** 「認定番号：」コロン直後（y≈466、装飾金線 y≈452 の下） */
  certificateId: {
    left: pct(512, 'w'),
    top: pct(466, 'h'),
    fontSize: 'clamp(0.55rem, 1.55cqi, 0.85rem)',
  },
} as const

const overlayText: CSSProperties = {
  color: '#1a1a1a',
  letterSpacing: '0.03em',
  lineHeight: 1.2,
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
      <img
        src="/ai-kentei/certificate-template.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-fill"
        width={TEMPLATE.w}
        height={TEMPLATE.h}
      />

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
          className="absolute max-w-[32%] whitespace-nowrap"
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
