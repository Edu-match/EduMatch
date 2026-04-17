'use client'

import { Award } from 'lucide-react'
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
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date)
  }

  return (
    <div
      className={`relative w-full max-w-full aspect-video overflow-hidden rounded-2xl shadow-2xl bg-[radial-gradient(1200px_circle_at_top,#fff7ed,transparent)] ${certificateMincho.className}`}
    >
      {/* Parchment */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#fff8e7] via-[#fffdf7] to-[#f7efe0]" />
      <div className="absolute inset-0 opacity-[0.08] [background-image:repeating-linear-gradient(135deg,#000,transparent_2px,transparent_10px)]" />

      {/* Frame */}
      <div className="absolute inset-2 rounded-xl border-2 border-[#b08d57]/60 sm:inset-2.5 md:inset-3" />
      <div className="absolute inset-3 rounded-lg border border-[#b08d57]/30 sm:inset-4 md:inset-5" />
      <div className="absolute inset-4 rounded-md border border-[#b08d57]/15 sm:inset-5 md:inset-6" />

      {/* Corner ornaments */}
      <div className="absolute left-2.5 top-2.5 h-6 w-6 rounded-tl-lg border-l-2 border-t-2 border-[#b08d57]/70 sm:left-3 sm:top-3 sm:h-8 sm:w-8" />
      <div className="absolute right-2.5 top-2.5 h-6 w-6 rounded-tr-lg border-r-2 border-t-2 border-[#b08d57]/70 sm:right-3 sm:top-3 sm:h-8 sm:w-8" />
      <div className="absolute bottom-2.5 left-2.5 h-6 w-6 rounded-bl-lg border-b-2 border-l-2 border-[#b08d57]/70 sm:bottom-3 sm:left-3 sm:h-8 sm:w-8" />
      <div className="absolute bottom-2.5 right-2.5 h-6 w-6 rounded-br-lg border-b-2 border-r-2 border-[#b08d57]/70 sm:bottom-3 sm:right-3 sm:h-8 sm:w-8" />

      {/* Content — 16:9 横向き用に横並び主体 */}
      <div className="relative z-10 flex h-full min-h-0 flex-col justify-center px-2 py-1.5 sm:px-4 sm:py-2 md:px-6 md:py-3 lg:px-8 lg:py-4">
        <div className="flex min-h-0 flex-1 flex-col items-stretch gap-1.5 md:flex-row md:items-center md:gap-3 lg:gap-5">
          {/* 左：写真・印 */}
          <div className="flex flex-shrink-0 flex-row items-center justify-center gap-2 md:w-[18%] md:flex-col md:justify-center md:gap-2">
            {photoUrl ? (
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-[#b08d57]/50 bg-white/70 shadow-sm sm:h-14 sm:w-14 md:h-16 md:w-16">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl} alt={name} className="h-full w-full object-cover" />
              </div>
            ) : null}
            <div className="relative h-11 w-11 shrink-0 sm:h-12 sm:w-12 md:h-14 md:w-14">
              <div className="absolute inset-0 rounded-full border border-[#c81e1e]/30 bg-[#c81e1e]/10" />
              <div className="absolute inset-0 rounded-full border-2 border-[#c81e1e]/50" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[9px] font-bold tracking-[0.2em] text-[#c81e1e]/75 sm:text-[10px]">
                  認定
                </span>
              </div>
            </div>
          </div>

          {/* 中央：タイトル・氏名 */}
          <div className="min-w-0 flex-1 space-y-0.5 text-center md:space-y-1 md:text-left">
            <div className="flex items-center justify-center gap-2 text-[#7c5d2b] md:justify-start">
              <div className="h-px w-6 bg-[#b08d57]/50 sm:w-8" />
              <div className="inline-flex items-center gap-1">
                <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="text-[9px] font-semibold tracking-[0.25em] sm:text-[10px] sm:tracking-[0.3em]">
                  CERTIFICATE
                </span>
                <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
              <div className="h-px w-6 bg-[#b08d57]/50 sm:w-8" />
            </div>
            <h2 className="text-xl font-semibold tracking-[0.15em] text-[#3b2a14] sm:text-2xl md:text-3xl lg:text-4xl">
              認 定 証
            </h2>
            <p className="text-[10px] font-medium leading-snug text-[#6b4e26] sm:text-xs md:text-sm">
              生成AI活用ガイドライン検定
              <br />
              （教育AI活用ビギナー部門）
            </p>
            <p className="pt-0.5 text-lg font-semibold tracking-wide text-[#2a1c0c] sm:text-xl md:text-2xl lg:text-3xl">
              {name}
            </p>
            <p className="text-xs text-[#6b4e26] sm:text-sm">殿</p>
          </div>

          {/* 右：認定文・スコア・発行元 */}
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 md:w-[40%] md:flex-none md:gap-2 lg:w-[38%]">
            <div className="rounded-lg border border-[#b08d57]/25 bg-white/60 px-2 py-1.5 sm:px-3 sm:py-2 md:rounded-xl md:px-3 md:py-2.5">
              <p className="text-[9px] font-medium leading-snug text-[#2a1c0c] text-balance sm:text-[10px] md:text-xs lg:text-sm">
                学校における生成AI活用ガイドラインについて十分な理解を有することを認定します
              </p>
            </div>
            <div className="flex items-center justify-center gap-4 sm:gap-5 md:justify-start">
              <div className="text-center md:text-left">
                <p className="text-[9px] text-[#6b4e26] sm:text-[10px]">スコア</p>
                <p className="text-base font-semibold tabular-nums text-[#2a1c0c] sm:text-lg md:text-xl">
                  {score} / {totalQuestions}
                </p>
              </div>
              <div className="h-8 w-px bg-[#b08d57]/35 sm:h-9" />
              <div className="text-center md:text-left">
                <p className="text-[9px] text-[#6b4e26] sm:text-[10px]">認定日</p>
                <p className="text-[10px] font-medium text-[#2a1c0c] sm:text-xs md:text-sm">{formatDate(date)}</p>
              </div>
            </div>
            <div className="text-center md:text-left">
              <p className="text-[10px] font-medium text-[#2a1c0c] sm:text-xs md:text-sm">
                一般社団法人 教育AI活用協会
              </p>
              {certificateId ? (
                <p className="mt-0.5 font-mono text-[8px] tracking-wider text-[#6b4e26] sm:text-[9px]">
                  Certificate ID: {certificateId}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
