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
  const formatDate = (d: Date) =>
    new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d)

  return (
    <div
      className={`relative w-full aspect-video overflow-hidden rounded-lg shadow-2xl ${certificateMincho.className}`}
      lang="ja"
    >
      {/* 和紙地 */}
      <div className="absolute inset-0 bg-[#faf6ef]" />
      <div className="absolute inset-0 opacity-[0.04] [background-image:repeating-linear-gradient(135deg,#5c4030_0px,transparent_1px,transparent_12px)]" />

      {/* 外枠 二重線 */}
      <div className="absolute inset-[6px] border-2 border-[#8b6914]/70" />
      <div className="absolute inset-[10px] border border-[#b08d57]/50" />

      {/* 四隅装飾 */}
      <div className="absolute left-[13px] top-[13px] h-5 w-5 border-l-2 border-t-2 border-[#8b6914]" />
      <div className="absolute right-[13px] top-[13px] h-5 w-5 border-r-2 border-t-2 border-[#8b6914]" />
      <div className="absolute bottom-[13px] left-[13px] h-5 w-5 border-b-2 border-l-2 border-[#8b6914]" />
      <div className="absolute bottom-[13px] right-[13px] h-5 w-5 border-b-2 border-r-2 border-[#8b6914]" />

      {/*
        縦書き列レイアウト（右→左読み）
        ──────────────────────────────────
        重要ルール:
          • flex コンテナ自体には writing-mode を付けない
            （付けると flex の主軸が変わり列が縦積みになる）
          • 各列に個別に writing-mode: vertical-rl を style で付ける
          • 各列に h-full を必ず付ける
            （writing-mode: vertical-rl の要素は align-items:stretch が
              効かない場合があるため、明示的に高さを指定する）
          • flex-row-reverse で DOM 先頭が右端になる
      */}
      <div className="absolute inset-[16px] flex h-[calc(100%-32px)] flex-row-reverse overflow-hidden gap-[5px] sm:gap-[8px] md:gap-[10px]">

        {/* ① 認定証タイトル（右端） */}
        <div
          className="shrink-0 h-full overflow-hidden flex items-center justify-center"
          style={{ writingMode: 'vertical-rl' }}
        >
          <span className="text-[1.2rem] font-semibold tracking-[0.18em] text-[#3b2a14] sm:text-[1.6rem] md:text-[2rem]">
            認定証
          </span>
        </div>

        {/* 仕切り線 */}
        <div className="shrink-0 h-full w-px bg-[#b08d57]/45" />

        {/* ② 検定名 */}
        <div
          className="shrink-0 h-full overflow-hidden flex items-center justify-center text-[8px] leading-[1.85] text-[#4a3720] sm:text-[10px] md:text-[12px]"
          style={{ writingMode: 'vertical-rl' }}
        >
          生成AI活用ガイドライン検定（教育AI活用ビギナー部門）
        </div>

        {/* 仕切り線 */}
        <div className="shrink-0 h-full w-px bg-[#b08d57]/25" />

        {/* ③ 氏名 + 殿 */}
        <div
          className="shrink-0 h-full overflow-hidden flex items-center justify-center"
          style={{ writingMode: 'vertical-rl' }}
        >
          <span className="font-bold tracking-wide text-[#1a1008] text-[0.9rem] sm:text-[1.1rem] md:text-[1.4rem]">
            {name}
          </span>
          <span className="text-[0.6em] text-[#5c4030] ml-[0.3em]">殿</span>
        </div>

        {/* 仕切り線 */}
        <div className="shrink-0 h-full w-px bg-[#b08d57]/25" />

        {/* ④ 認定本文 */}
        <div
          className="shrink-0 h-full overflow-hidden flex items-center justify-center rounded-sm border border-[#b08d57]/30 bg-white/55 px-[3px] sm:px-[5px]"
          style={{ writingMode: 'vertical-rl' }}
        >
          <span className="text-[7px] leading-[1.85] text-[#2a1c0c] sm:text-[9px] md:text-[10px]">
            学校における生成AI活用ガイドラインについて十分な理解を有することを認定します
          </span>
        </div>

        {/* 仕切り線 */}
        <div className="shrink-0 h-full w-px bg-[#b08d57]/25" />

        {/* ⑤ スコア・認定日・発行元（残りスペースを使用） */}
        <div
          className="flex-1 min-w-0 h-full overflow-hidden flex items-center justify-center text-[#2a1c0c]"
          style={{ writingMode: 'vertical-rl' }}
        >
          <span className="text-[6px] text-[#6b4e26] sm:text-[8px]">スコア</span>
          <span
            className="ml-[0.2em] text-[0.8rem] font-semibold tabular-nums sm:text-[0.95rem]"
            style={{ writingMode: 'horizontal-tb', display: 'inline-block' }}
          >
            {score}&thinsp;/&thinsp;{totalQuestions}
          </span>
          <span className="ml-[0.8em] text-[6px] text-[#6b4e26] sm:text-[8px]">認定日</span>
          <span className="ml-[0.2em] text-[7px] leading-[1.85] sm:text-[9px]">{formatDate(date)}</span>
          <span className="ml-[0.8em] text-[7px] font-medium leading-[1.85] sm:text-[9px]">
            一般社団法人 教育AI活用協会
          </span>
          {certificateId ? (
            <span
              className="ml-[0.4em] text-[6px] font-mono text-[#6b4e26] break-all"
              style={{ writingMode: 'horizontal-tb', display: 'inline-block', maxWidth: '5rem' }}
            >
              ID:&nbsp;{certificateId}
            </span>
          ) : null}
        </div>

        {/* ⑥ 写真・認定印（左端） */}
        <div className="shrink-0 h-full flex flex-col items-center justify-end gap-2 pb-1">
          {photoUrl ? (
            <div className="h-9 w-9 overflow-hidden rounded-full border-2 border-[#b08d57]/55 bg-white/80 sm:h-11 sm:w-11">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt="" className="h-full w-full object-cover" />
            </div>
          ) : null}
          <div className="relative h-9 w-9 border-2 border-[#c81e1e]/55 sm:h-11 sm:w-11">
            <div className="absolute inset-0 bg-[#c81e1e]/06" />
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
