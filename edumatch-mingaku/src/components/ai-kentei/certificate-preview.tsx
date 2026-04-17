'use client'

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
  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date)

  return (
    <div
      className={`relative w-full aspect-video overflow-hidden rounded-lg shadow-2xl ${certificateMincho.className}`}
      lang="ja"
    >
      {/* 和紙地 */}
      <div className="absolute inset-0 bg-[#faf6ef]" />
      <div className="absolute inset-0 opacity-[0.05] [background-image:repeating-linear-gradient(135deg,#5c4030_0px,transparent_1px,transparent_12px)]" />

      {/* 外枠 二重 */}
      <div className="absolute inset-[6px] border-2 border-[#8b6914]/70 md:inset-[9px]" />
      <div className="absolute inset-[11px] border border-[#b08d57]/50 md:inset-[14px]" />

      {/* 四隅 */}
      <div className="absolute left-[14px] top-[14px] h-5 w-5 border-l-2 border-t-2 border-[#8b6914] md:left-[18px] md:top-[18px] md:h-7 md:w-7" />
      <div className="absolute right-[14px] top-[14px] h-5 w-5 border-r-2 border-t-2 border-[#8b6914] md:right-[18px] md:top-[18px] md:h-7 md:w-7" />
      <div className="absolute bottom-[14px] left-[14px] h-5 w-5 border-b-2 border-l-2 border-[#8b6914] md:bottom-[18px] md:left-[18px] md:h-7 md:w-7" />
      <div className="absolute bottom-[14px] right-[14px] h-5 w-5 border-b-2 border-r-2 border-[#8b6914] md:bottom-[18px] md:right-[18px] md:h-7 md:w-7" />

      {/*
        ポイント:
        ・flex コンテナには writing-mode を付けない（付けると軸が変わって崩れる）
        ・flex-row-reverse で DOM 先頭が右端に来る（日本語縦書きの右→左の列順）
        ・各列に個別に writing-mode: vertical-rl を付ける
        ・align-items: stretch（デフォルト）で各列の高さがコンテナ高に揃う
      */}
      <div className="absolute inset-[18px] flex flex-row-reverse items-stretch gap-[6px] overflow-hidden md:inset-[22px] md:gap-[10px]">

        {/* ① 認定証タイトル（右端） */}
        <div
          className="flex shrink-0 flex-col items-center justify-center gap-1"
          style={{ writingMode: 'vertical-rl' }}
        >
          <span
            className="mb-1 text-[7px] font-semibold tracking-[0.35em] text-[#7c5d2b] sm:text-[9px]"
            style={{ writingMode: 'horizontal-tb' }}
          >
            CERTIFICATE
          </span>
          <span className="text-[1.4rem] font-semibold tracking-[0.15em] text-[#3b2a14] sm:text-[1.8rem] md:text-[2.2rem]">
            認定証
          </span>
        </div>

        {/* 細い仕切り線 */}
        <div className="shrink-0 self-stretch border-r border-[#b08d57]/40" />

        {/* ② 検定名 */}
        <div
          className="shrink-0 overflow-hidden text-[8px] leading-[1.9] text-[#4a3720] sm:text-[10px] md:text-xs"
          style={{ writingMode: 'vertical-rl' }}
        >
          生成AI活用ガイドライン検定（教育AI活用ビギナー部門）
        </div>

        {/* 細い仕切り線 */}
        <div className="shrink-0 self-stretch border-r border-[#b08d57]/25" />

        {/* ③ 氏名 + 殿 */}
        <div
          className="shrink-0 overflow-hidden"
          style={{ writingMode: 'vertical-rl' }}
        >
          <span className="text-[1rem] font-bold tracking-wide text-[#1a1008] sm:text-[1.2rem] md:text-[1.5rem]">
            {name}
          </span>
          <span className="ml-[0.4em] text-[0.65em] text-[#5c4030]">殿</span>
        </div>

        {/* 細い仕切り線 */}
        <div className="shrink-0 self-stretch border-r border-[#b08d57]/25" />

        {/* ④ 認定本文（文字が多いので overflow-hidden で収める） */}
        <div
          className="shrink-0 overflow-hidden rounded-sm border border-[#b08d57]/30 bg-white/55 px-[4px] sm:px-[6px]"
          style={{ writingMode: 'vertical-rl' }}
        >
          <span className="text-[7px] leading-[1.9] text-[#2a1c0c] sm:text-[9px] md:text-[11px]">
            学校における生成AI活用ガイドラインについて十分な理解を有することを認定します
          </span>
        </div>

        {/* 細い仕切り線 */}
        <div className="shrink-0 self-stretch border-r border-[#b08d57]/25" />

        {/* ⑤ スコア・認定日・発行元（残りスペースを使用） */}
        <div
          className="min-w-0 flex-1 overflow-hidden text-[#2a1c0c]"
          style={{ writingMode: 'vertical-rl' }}
        >
          <span className="text-[6px] text-[#6b4e26] sm:text-[8px]">スコア</span>
          <span
            className="ml-[0.3em] text-[0.85rem] font-semibold tabular-nums sm:text-[1rem]"
            style={{ writingMode: 'horizontal-tb' }}
          >
            {score}&nbsp;/&nbsp;{totalQuestions}
          </span>
          <span className="ml-[1em] text-[6px] text-[#6b4e26] sm:text-[8px]">認定日</span>
          <span className="ml-[0.3em] text-[7px] leading-[1.9] sm:text-[9px]">{formatDate(date)}</span>
          <span className="ml-[1em] text-[7px] font-medium leading-[1.85] sm:text-[9px] md:text-[11px]">
            一般社団法人 教育AI活用協会
          </span>
          {certificateId ? (
            <span
              className="ml-[0.5em] break-all font-mono text-[6px] text-[#6b4e26]"
              style={{ writingMode: 'horizontal-tb' }}
            >
              ID:&nbsp;{certificateId}
            </span>
          ) : null}
        </div>

        {/* ⑥ 写真 + 認定印（左端） */}
        <div className="flex shrink-0 flex-col items-center justify-end gap-2 pb-1">
          {photoUrl ? (
            <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-[#b08d57]/55 bg-white/80 sm:h-12 sm:w-12">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt="" className="h-full w-full object-cover" />
            </div>
          ) : null}
          <div className="relative h-10 w-10 border-2 border-[#c81e1e]/55 sm:h-12 sm:w-12">
            <div className="absolute inset-0 bg-[#c81e1e]/07" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[9px] font-bold tracking-[0.1em] text-[#b91c1c] sm:text-[11px]">
                認定
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
