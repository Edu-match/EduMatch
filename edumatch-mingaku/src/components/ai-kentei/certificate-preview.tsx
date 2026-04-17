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
      <div className="absolute inset-2 rounded-xl border-2 border-[#b08d57]/60 md:inset-3" />
      <div className="absolute inset-3 rounded-lg border border-[#b08d57]/30 md:inset-4" />
      <div className="absolute inset-4 rounded-md border border-[#b08d57]/15 md:inset-5" />

      {/* Corner ornaments */}
      <div className="absolute left-2 top-2 h-5 w-5 rounded-tl-lg border-l-2 border-t-2 border-[#b08d57]/70 md:left-3 md:top-3 md:h-7 md:w-7" />
      <div className="absolute right-2 top-2 h-5 w-5 rounded-tr-lg border-r-2 border-t-2 border-[#b08d57]/70 md:right-3 md:top-3 md:h-7 md:w-7" />
      <div className="absolute bottom-2 left-2 h-5 w-5 rounded-bl-lg border-b-2 border-l-2 border-[#b08d57]/70 md:bottom-3 md:left-3 md:h-7 md:w-7" />
      <div className="absolute bottom-2 right-2 h-5 w-5 rounded-br-lg border-b-2 border-r-2 border-[#b08d57]/70 md:bottom-3 md:right-3 md:h-7 md:w-7" />

      {/* Content: grid で列を固定し重なりを防止。狭い高さでは縦スクロール */}
      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-2 [scrollbar-width:thin] sm:px-4 sm:py-3 md:px-6 md:py-4 lg:px-8 lg:py-5">
          <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-12 md:gap-x-4 md:gap-y-0 lg:gap-x-6">
            {/* 左：写真・印 */}
            <div className="flex flex-shrink-0 flex-row items-center justify-center gap-3 md:col-span-2 md:flex-col md:gap-3">
              {photoUrl ? (
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-[#b08d57]/50 bg-white/70 shadow-sm md:h-[4.5rem] md:w-[4.5rem]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoUrl} alt="" className="h-full w-full object-cover" />
                </div>
              ) : null}
              <div className="relative h-12 w-12 shrink-0 md:h-14 md:w-14">
                <div className="absolute inset-0 rounded-full border border-[#c81e1e]/30 bg-[#c81e1e]/10" />
                <div className="absolute inset-0 rounded-full border-2 border-[#c81e1e]/50" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] font-bold tracking-[0.15em] text-[#c81e1e]/75 md:text-xs">
                    認定
                  </span>
                </div>
              </div>
            </div>

            {/* 中央：タイトル・氏名 */}
            <div className="min-w-0 md:col-span-5">
              <div className="flex justify-center text-[#7c5d2b] md:justify-start">
                <div className="flex max-w-full items-center gap-2">
                  <div className="hidden h-px w-6 shrink-0 bg-[#b08d57]/50 sm:block md:w-8" />
                  <div className="inline-flex items-center gap-1.5">
                    <Award className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                    <span className="text-[9px] font-semibold tracking-[0.2em] sm:text-[10px] sm:tracking-[0.28em]">
                      CERTIFICATE
                    </span>
                    <Award className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                  </div>
                  <div className="hidden h-px w-6 shrink-0 bg-[#b08d57]/50 sm:block md:w-8" />
                </div>
              </div>
              <h2 className="mt-1 whitespace-nowrap text-center text-2xl font-semibold tracking-[0.12em] text-[#3b2a14] sm:text-3xl md:text-left md:text-4xl">
                認定証
              </h2>
              <p className="mt-1 text-center text-[10px] font-medium leading-snug text-[#6b4e26] sm:text-xs md:text-left md:text-sm">
                生成AI活用ガイドライン検定
                <br />
                （教育AI活用ビギナー部門）
              </p>
              <p className="mt-2 break-words text-center text-xl font-semibold leading-tight tracking-wide text-[#2a1c0c] sm:text-2xl md:text-left md:text-3xl">
                {name}
              </p>
              <p className="mt-0.5 text-center text-xs text-[#6b4e26] sm:text-sm md:text-left">殿</p>
            </div>

            {/* 右：認定文・スコア */}
            <div className="min-w-0 md:col-span-5">
              <div className="rounded-lg border border-[#b08d57]/25 bg-white/60 px-2.5 py-2 sm:px-3 sm:py-2.5 md:rounded-xl">
                <p className="text-[10px] font-medium leading-snug text-[#2a1c0c] text-balance sm:text-xs md:text-sm">
                  学校における生成AI活用ガイドラインについて十分な理解を有することを認定します
                </p>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 sm:gap-x-6 md:justify-start">
                <div className="text-center md:text-left">
                  <p className="text-[10px] text-[#6b4e26]">スコア</p>
                  <p className="text-lg font-semibold tabular-nums text-[#2a1c0c] sm:text-xl">
                    {score} / {totalQuestions}
                  </p>
                </div>
                <div className="hidden h-8 w-px bg-[#b08d57]/35 sm:block" />
                <div className="text-center md:text-left">
                  <p className="text-[10px] text-[#6b4e26]">認定日</p>
                  <p className="text-xs font-medium text-[#2a1c0c] sm:text-sm">{formatDate(date)}</p>
                </div>
              </div>
              <div className="mt-2 text-center md:text-left">
                <p className="text-xs font-medium text-[#2a1c0c] sm:text-sm">一般社団法人 教育AI活用協会</p>
                {certificateId ? (
                  <p className="mt-1 break-all font-mono text-[9px] tracking-wider text-[#6b4e26]">
                    Certificate ID: {certificateId}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
