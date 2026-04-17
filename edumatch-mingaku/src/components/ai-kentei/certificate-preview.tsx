'use client'

import type { ReactNode } from 'react'
import { certificateMincho } from '@/lib/fonts/certificate-mincho'

interface CertificatePreviewProps {
  name: string
  photoUrl: string | null
  score: number
  totalQuestions: number
  date: Date
  certificateId?: string | null
}

/** 横組みの数字・英字だけを縦書き列の中で正立させる */
function HorizontalTb({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={`inline-block [writing-mode:horizontal-tb] ${className ?? ''}`}>{children}</span>
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
      className={`relative w-full max-w-full aspect-video overflow-hidden rounded-lg shadow-2xl ${certificateMincho.className}`}
    >
      {/* 和紙・罫線（賞状イメージ） */}
      <div className="absolute inset-0 bg-[#faf6ef]" />
      <div className="absolute inset-0 opacity-[0.06] [background-image:repeating-linear-gradient(135deg,#5c4030,transparent_1px,transparent_12px)]" />

      {/* 外枠（二重線） */}
      <div className="absolute inset-2 rounded-sm border-2 border-[#8b6914]/70 md:inset-2.5" />
      <div className="absolute inset-3 rounded-sm border border-[#b08d57]/50 md:inset-4" />
      <div className="absolute inset-4 rounded-sm border border-[#d4bc7a]/40 md:inset-5" />

      {/* 四隅の装飾 */}
      <div className="absolute left-3 top-3 h-6 w-6 border-l-2 border-t-2 border-[#8b6914]/80 md:left-4 md:top-4 md:h-8 md:w-8" />
      <div className="absolute right-3 top-3 h-6 w-6 border-r-2 border-t-2 border-[#8b6914]/80 md:right-4 md:top-4 md:h-8 md:w-8" />
      <div className="absolute bottom-3 left-3 h-6 w-6 border-b-2 border-l-2 border-[#8b6914]/80 md:bottom-4 md:left-4 md:h-8 md:w-8" />
      <div className="absolute bottom-3 right-3 h-6 w-6 border-b-2 border-r-2 border-[#8b6914]/80 md:bottom-4 md:right-4 md:h-8 md:w-8" />

      {/* 縦書き本文：flex の子は右から左へ並ぶ（writing-mode: vertical-rl） */}
      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-2 py-3 [scrollbar-width:thin] sm:px-3 sm:py-4 md:px-5 md:py-5">
          <div
            className="mx-auto flex h-full min-h-[8rem] flex-row items-start justify-center gap-2 text-[#2a1c0c] [text-orientation:mixed] [writing-mode:vertical-rl] sm:gap-3 md:min-h-0 md:gap-4 lg:gap-5"
            lang="ja"
          >
            {/* 右端：タイトル列 */}
            <div className="flex shrink-0 flex-col items-center">
              <HorizontalTb className="mb-2 text-center text-[8px] font-semibold tracking-[0.35em] text-[#7c5d2b] sm:text-[9px]">
                CERTIFICATE
              </HorizontalTb>
              <span className="text-2xl font-semibold tracking-[0.18em] text-[#3b2a14] sm:text-3xl md:text-4xl lg:text-[2.75rem]">
                認定証
              </span>
            </div>

            {/* 検定名 */}
            <div className="shrink-0 text-[10px] leading-[1.85] text-[#4a3720] sm:text-xs md:text-sm">
              <p>生成AI活用ガイドライン検定</p>
              <p className="mt-[0.5em]">（教育AI活用ビギナー部門）</p>
            </div>

            {/* 氏名 */}
            <div className="shrink-0 text-center">
              <p className="text-lg font-semibold tracking-wide text-[#1a1008] sm:text-xl md:text-2xl">{name}</p>
              <p className="mt-[0.35em] text-xs text-[#5c4030] sm:text-sm">殿</p>
            </div>

            {/* 認定文 */}
            <div className="shrink-0 rounded-sm border border-[#b08d57]/35 bg-white/65 px-1.5 py-2 shadow-sm sm:px-2 sm:py-2.5 md:px-2.5">
              <p className="text-[10px] leading-[1.95] text-[#2a1c0c] sm:text-xs md:text-sm">
                学校における生成AI活用ガイドラインについて十分な理解を有することを認定します
              </p>
            </div>

            {/* スコア・日付・発行元 */}
            <div className="min-w-0 shrink-0 space-y-3 text-[#2a1c0c]">
              <div>
                <p className="text-[9px] text-[#6b4e26] sm:text-[10px]">スコア</p>
                <HorizontalTb className="mt-0.5 text-base font-semibold tabular-nums sm:text-lg md:text-xl">
                  {score} / {totalQuestions}
                </HorizontalTb>
              </div>
              <div>
                <p className="text-[9px] text-[#6b4e26] sm:text-[10px]">認定日</p>
                <p className="mt-0.5 text-[10px] leading-[1.75] sm:text-xs md:text-sm">{formatDate(date)}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium leading-[1.85] sm:text-xs md:text-sm">
                  一般社団法人 教育AI活用協会
                </p>
                {certificateId ? (
                  <HorizontalTb className="mt-2 block max-w-[11rem] break-all font-mono text-[7px] leading-snug text-[#6b4e26] sm:text-[8px]">
                    ID: {certificateId}
                  </HorizontalTb>
                ) : null}
              </div>
            </div>

            {/* 写真・角印（横組み） */}
            <div className="flex shrink-0 flex-col items-center gap-2 [writing-mode:horizontal-tb]">
              {photoUrl ? (
                <div className="h-12 w-12 overflow-hidden rounded-full border-2 border-[#b08d57]/55 bg-white/80 shadow-sm sm:h-14 sm:w-14">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoUrl} alt="" className="h-full w-full object-cover" />
                </div>
              ) : null}
              <div className="relative h-11 w-11 sm:h-12 sm:w-12">
                <div className="absolute inset-0 rounded border-2 border-[#c81e1e]/45 bg-[#c81e1e]/08" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] font-bold tracking-[0.12em] text-[#b91c1c] sm:text-[11px]">認定</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
