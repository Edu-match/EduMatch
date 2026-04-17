'use client'

import type { CSSProperties } from 'react'
import { certificateMincho } from '@/lib/fonts/certificate-mincho'

interface CertificatePreviewProps {
  name: string
  photoUrl: string | null
  score: number
  totalQuestions: number
  date: Date
  certificateId?: string | null
}

/**
 * 背景画像 `public/ai-kentei/certificate-template.png` 上の可変テキスト位置。
 * 氏名・スコア・認定日は互いに無関係。ここだけを画像に合わせて調整する。
 *
 * `right` はコンテナ右端からの距離。値を大きくするとブロック全体が左へ寄る。
 */
const OVERLAY = {
  name: {
    right: '32.3%',
    top: '38%',
    maxHeight: '38%',
    fontSize: 'clamp(0.78rem, 2.15cqi, 1.28rem)',
  },
  score: {
    right: '68%',
    top: '36%',
    fontSize: 'clamp(0.72rem, 1.85cqi, 1.15rem)',
  },
  date: {
    right: '85%',
    top: '50%',
    fontSize: 'clamp(0.68rem, 1.65cqi, 1.05rem)',
  },
} as const

const verticalTategaki: CSSProperties = {
  writingMode: 'vertical-rl',
  textOrientation: 'upright',
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

  return (
    <div
      className={`relative w-full aspect-video overflow-hidden rounded-lg shadow-2xl [container-type:inline-size] ${certificateMincho.className}`}
      lang="ja"
    >
      <img src="/ai-kentei/certificate-template.png" alt="" className="absolute inset-0 h-full w-full object-cover" />

      {/* ① 氏名（テンプレの「殿」との位置は画像側が正。ここは名前のみ） */}
      <div
        className="absolute overflow-hidden text-[#4a2d12]"
        style={{
          ...verticalTategaki,
          right: OVERLAY.name.right,
          top: OVERLAY.name.top,
          maxHeight: OVERLAY.name.maxHeight,
        }}
      >
        <span className="font-semibold tracking-[0.03em]" style={{ fontSize: OVERLAY.name.fontSize, lineHeight: 1.06 }}>
          {name || '受験者名'}
        </span>
      </div>

      {/* ② スコア数値のみ（ラベル「スコア」は背景） */}
      <div
        className="absolute text-[#4a2d12]"
        style={{
          ...verticalTategaki,
          right: OVERLAY.score.right,
          top: OVERLAY.score.top,
        }}
      >
        <span className="font-semibold" style={{ fontSize: OVERLAY.score.fontSize, lineHeight: 1.15 }}>
          {toFullWidthDigits(String(score))}／{toFullWidthDigits(String(totalQuestions))}
        </span>
      </div>

      {/* ③ 認定日の値のみ（ラベル「認定日」は背景） */}
      <div
        className="absolute text-[#4a2d12]"
        style={{
          ...verticalTategaki,
          right: OVERLAY.date.right,
          top: OVERLAY.date.top,
        }}
      >
        <span style={{ fontSize: OVERLAY.date.fontSize, lineHeight: 1.38 }}>
          {toFullWidthDigits(formatDate(date))}
        </span>
      </div>
    </div>
  )
}
