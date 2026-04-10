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
      className={`relative overflow-hidden rounded-2xl shadow-2xl bg-[radial-gradient(1200px_circle_at_top,#fff7ed,transparent)] ${certificateMincho.className}`}
    >
      {/* Parchment */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#fff8e7] via-[#fffdf7] to-[#f7efe0]" />
      <div className="absolute inset-0 opacity-[0.08] [background-image:repeating-linear-gradient(135deg,#000,transparent_2px,transparent_10px)]" />

      {/* Frame */}
      <div className="absolute inset-3 rounded-xl border-2 border-[#b08d57]/60" />
      <div className="absolute inset-5 rounded-lg border border-[#b08d57]/30" />
      <div className="absolute inset-6 rounded-md border border-[#b08d57]/15" />

      {/* Corner ornaments */}
      <div className="absolute top-5 left-5 h-10 w-10 border-l-2 border-t-2 border-[#b08d57]/70 rounded-tl-lg" />
      <div className="absolute top-5 right-5 h-10 w-10 border-r-2 border-t-2 border-[#b08d57]/70 rounded-tr-lg" />
      <div className="absolute bottom-5 left-5 h-10 w-10 border-l-2 border-b-2 border-[#b08d57]/70 rounded-bl-lg" />
      <div className="absolute bottom-5 right-5 h-10 w-10 border-r-2 border-b-2 border-[#b08d57]/70 rounded-br-lg" />

      {/* Content */}
      <div className="relative z-10 px-8 py-10 md:px-12 md:py-12 text-center">
        <div className="mx-auto max-w-xl space-y-6">
          <div className="flex items-center justify-center gap-3 text-[#7c5d2b]">
            <div className="h-px w-10 bg-[#b08d57]/50" />
            <div className="inline-flex items-center gap-2">
              <Award className="h-5 w-5" />
              <span className="text-xs font-semibold tracking-[0.35em]">CERTIFICATE</span>
              <Award className="h-5 w-5" />
            </div>
            <div className="h-px w-10 bg-[#b08d57]/50" />
          </div>

          <div className="space-y-2">
            <h2 className="text-4xl md:text-5xl font-semibold tracking-[0.2em] text-[#3b2a14]">
              認 定 証
            </h2>
            <p className="text-sm md:text-base text-[#6b4e26] font-medium">
              生成AI活用ガイドライン検定（教育AI活用ビギナー部門）
            </p>
          </div>

          {photoUrl ? (
            <div className="flex justify-center pt-1">
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-[#b08d57]/50 bg-white/70 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
              </div>
            </div>
          ) : null}

          <div className="space-y-1">
            <p className="text-3xl md:text-4xl font-semibold text-[#2a1c0c] tracking-wide">
              {name}
            </p>
            <p className="text-base text-[#6b4e26]">殿</p>
          </div>

          <div className="mx-auto max-w-md rounded-xl bg-white/60 border border-[#b08d57]/25 px-6 py-5">
            <p className="text-sm md:text-base text-[#2a1c0c] leading-relaxed font-medium">
              学校における生成AI活用ガイドラインについて
              <br />
              十分な理解を有することを認定します
            </p>
          </div>

          <div className="flex items-center justify-center gap-6 pt-2">
            <div className="text-center">
              <p className="text-xs text-[#6b4e26]">スコア</p>
              <p className="text-2xl font-semibold text-[#2a1c0c]">
                {score} / {totalQuestions}
              </p>
            </div>
            <div className="h-10 w-px bg-[#b08d57]/35" />
            <div className="text-center">
              <p className="text-xs text-[#6b4e26]">認定日</p>
              <p className="text-sm font-medium text-[#2a1c0c]">{formatDate(date)}</p>
            </div>
          </div>

          <div className="pt-3">
            <p className="text-sm font-medium text-[#2a1c0c]">一般社団法人 教育AI活用協会</p>
            {certificateId ? (
              <p className="mt-2 text-[11px] text-[#6b4e26] font-mono tracking-wider">
                Certificate ID: {certificateId}
              </p>
            ) : null}
          </div>

          {/* Seal */}
          <div className="relative pt-2">
            <div className="mx-auto h-16 w-16 rounded-full bg-[#c81e1e]/10 border border-[#c81e1e]/30" />
            <div className="absolute left-1/2 top-2 -translate-x-1/2 h-16 w-16 rounded-full border-2 border-[#c81e1e]/50" />
            <div className="absolute left-1/2 top-2 -translate-x-1/2 h-16 w-16 rounded-full flex items-center justify-center">
              <span className="text-[#c81e1e]/70 text-xs font-bold tracking-[0.25em]">認定</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
