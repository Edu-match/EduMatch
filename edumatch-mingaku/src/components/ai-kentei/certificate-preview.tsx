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
    /*
     * container-type: inline-size → 子要素で cqi (container inline) 単位が使える
     * cqi は横幅の % → 証書のサイズに追従する responsive font
     */
    <div
      className={`relative w-full aspect-video overflow-hidden rounded-lg shadow-2xl [container-type:inline-size] ${certificateMincho.className}`}
      lang="ja"
    >
      {/* 和紙地 */}
      <div className="absolute inset-0 bg-[#faf6ef]" />
      <div className="absolute inset-0 opacity-[0.04] [background-image:repeating-linear-gradient(135deg,#5c4030_0px,transparent_1px,transparent_12px)]" />

      {/* 外枠二重線 */}
      <div className="absolute inset-[6px] border-2 border-[#8b6914]/70" />
      <div className="absolute inset-[10px] border border-[#b08d57]/50" />

      {/* 四隅装飾 */}
      <div className="absolute left-3 top-3 h-5 w-5 border-l-2 border-t-2 border-[#8b6914]" />
      <div className="absolute right-3 top-3 h-5 w-5 border-r-2 border-t-2 border-[#8b6914]" />
      <div className="absolute bottom-3 left-3 h-5 w-5 border-b-2 border-l-2 border-[#8b6914]" />
      <div className="absolute bottom-3 right-3 h-5 w-5 border-b-2 border-r-2 border-[#8b6914]" />

      {/*
       * 縦書き列レイアウト（右→左）
       *
       * ルール:
       *   • flex コンテナに writing-mode を付けない（flex 主軸が変わって崩れる）
       *   • 各列に個別に writing-mode: vertical-rl をインラインスタイルで付ける
       *   • h-full を各列に付ける（writing-mode 要素は align-items:stretch が
       *     効かないブラウザがあるため明示的に物理的高さを固定する）
       *   • flex-row-reverse → DOM 先頭が右端になる
       *   • フォントサイズは cqi 単位でコンテナ幅に追従させる
       */}
      <div
        className="absolute flex flex-row-reverse overflow-hidden"
        style={{
          inset: '5%',
          height: '90%',
          gap: '1.8%',
        }}
      >

        {/* ① 認定証（右端・超大） */}
        <div
          className="shrink-0 h-full overflow-hidden flex items-center justify-center"
          style={{
            writingMode: 'vertical-rl',
            paddingInline: '0.8%',
          }}
        >
          <span
            className="font-bold text-[#3b2a14]"
            style={{
              fontSize: 'clamp(2rem, 9cqi, 4rem)',
              letterSpacing: '0.2em',
            }}
          >
            認定証
          </span>
        </div>

        {/* 縦仕切り */}
        <div className="shrink-0 h-full w-px bg-[#b08d57]/50 self-center" />

        {/* ② 検定名（長いので自然に 2 列に折り返す） */}
        <div
          className="shrink-0 h-full overflow-hidden"
          style={{
            writingMode: 'vertical-rl',
            fontSize: 'clamp(7px, 2cqi, 12px)',
            lineHeight: 1.9,
            color: '#4a3720',
            paddingTop: '6%',
          }}
        >
          生成AI活用ガイドライン検定（教育AI活用ビギナー部門）
        </div>

        {/* ③ 氏名 ＋ 殿 */}
        <div
          className="shrink-0 h-full overflow-hidden flex items-center"
          style={{ writingMode: 'vertical-rl' }}
        >
          {name ? (
            <span
              className="font-bold text-[#1a1008]"
              style={{
                fontSize: 'clamp(0.8rem, 3cqi, 1.4rem)',
                letterSpacing: '0.08em',
              }}
            >
              {name}
              <span
                style={{ fontSize: '0.55em', color: '#5c4030', marginLeft: '0.25em' }}
              >
                殿
              </span>
            </span>
          ) : (
            <span
              style={{
                fontSize: 'clamp(0.75rem, 2.5cqi, 1.2rem)',
                color: '#5c4030',
              }}
            >
              殿
            </span>
          )}
        </div>

        {/* ④ 認定本文（残りスペースを使い、長ければ自動で複数列に折り返す） */}
        <div
          className="flex-1 h-full overflow-hidden"
          style={{
            writingMode: 'vertical-rl',
            fontSize: 'clamp(7px, 2cqi, 12px)',
            lineHeight: 1.9,
            color: '#2a1c0c',
            paddingTop: '6%',
          }}
        >
          学校における生成AI活用ガイドラインについて十分な理解を有することを認定します
        </div>

        {/* ⑤ スコア */}
        <div
          className="shrink-0 h-full overflow-hidden"
          style={{
            writingMode: 'vertical-rl',
            fontSize: 'clamp(7px, 2cqi, 12px)',
            color: '#2a1c0c',
            paddingTop: '6%',
          }}
        >
          <span style={{ color: '#6b4e26' }}>スコア</span>
          <span style={{ fontWeight: 'bold' }}>
            {'\u3000'}{score}／{totalQuestions}
          </span>
        </div>

        {/* ⑥ 認定日 */}
        <div
          className="shrink-0 h-full overflow-hidden"
          style={{
            writingMode: 'vertical-rl',
            fontSize: 'clamp(7px, 1.8cqi, 11px)',
            color: '#2a1c0c',
            paddingTop: '6%',
          }}
        >
          <span style={{ color: '#6b4e26' }}>認定日</span>
          <span>{'\u3000'}{formatDate(date)}</span>
        </div>

        {/* ⑦ 発行元 ＋ 認定印（左端） */}
        <div
          className="shrink-0 h-full flex flex-col items-center"
          style={{ paddingBlock: '6%', gap: '8%' }}
        >
          <div
            style={{
              writingMode: 'vertical-rl',
              fontSize: 'clamp(6px, 1.8cqi, 11px)',
              color: '#2a1c0c',
              lineHeight: 1.9,
            }}
          >
            一般社団法人{'\u3000'}教育AI活用協会
          </div>

          {/* 写真（設定済みの場合） */}
          {photoUrl ? (
            <div
              className="overflow-hidden rounded-full border-2 border-[#b08d57]/55 bg-white/80 mt-auto"
              style={{ width: '4cqi', height: '4cqi', minWidth: '2rem', minHeight: '2rem' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt="" className="h-full w-full object-cover" />
            </div>
          ) : null}

          {/* 認定印 */}
          <div
            className="relative border-2 border-[#c81e1e]/55 mt-auto"
            style={{ width: '4cqi', height: '4cqi', minWidth: '2rem', minHeight: '2rem' }}
          >
            <div className="absolute inset-0 bg-[#c81e1e]/06" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="font-bold text-[#b91c1c]"
                style={{ fontSize: 'clamp(7px, 1.5cqi, 10px)', letterSpacing: '0.08em' }}
              >
                認定
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
