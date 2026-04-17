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

  void photoUrl
  void certificateId

  const verticalColumnStyle = {
    writingMode: 'vertical-rl' as const,
    textOrientation: 'mixed' as const,
  }

  return (
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

      <div className="absolute inset-[5%]">
        <div className="flex h-full flex-row-reverse items-stretch gap-[1.2%] overflow-hidden">
          <div
            className="flex w-[15%] shrink-0 items-center justify-center overflow-hidden text-[#4a2d12]"
            style={verticalColumnStyle}
          >
            <span
              className="font-semibold tracking-[0.04em]"
              style={{ fontSize: 'clamp(2rem, 5.6cqi, 3.8rem)', lineHeight: 1.02 }}
            >
              認定証
            </span>
          </div>

          <div className="h-full w-px shrink-0 bg-[#c7ab73]/80" />

          <div className="w-[4.8%] shrink-0 overflow-hidden pt-[8%] text-[#6a4c24]" style={verticalColumnStyle}>
            <span style={{ fontSize: 'clamp(0.8rem, 2.1cqi, 1.45rem)', lineHeight: 1.35 }}>
              生成AI活用ガイドライン検定
            </span>
          </div>
          <div className="w-[4.8%] shrink-0 overflow-hidden pt-[14%] text-[#6a4c24]" style={verticalColumnStyle}>
            <span style={{ fontSize: 'clamp(0.8rem, 2cqi, 1.4rem)', lineHeight: 1.35 }}>
              （教育AI活用ビギナー部門）
            </span>
          </div>

          <div className="w-[6.2%] shrink-0 overflow-hidden pt-[7%] text-[#4a2d12]" style={verticalColumnStyle}>
            <span
              className="font-semibold tracking-[0.02em]"
              style={{ fontSize: 'clamp(1.25rem, 3.6cqi, 2.5rem)', lineHeight: 1.15 }}
            >
              {name || '受験者名'}
            </span>
          </div>
          <div className="w-[2.5%] shrink-0 overflow-hidden pt-[36%] text-[#6a4c24]" style={verticalColumnStyle}>
            <span style={{ fontSize: 'clamp(0.9rem, 2.2cqi, 1.5rem)', lineHeight: 1.1 }}>殿</span>
          </div>

          <div className="w-[4.8%] shrink-0 overflow-hidden pt-[13%] text-[#5b4528]" style={verticalColumnStyle}>
            <span style={{ fontSize: 'clamp(0.75rem, 1.85cqi, 1.2rem)', lineHeight: 1.55 }}>
              学校における生成AI活用ガイドライン
            </span>
          </div>
          <div className="w-[4.8%] shrink-0 overflow-hidden pt-[8%] text-[#5b4528]" style={verticalColumnStyle}>
            <span style={{ fontSize: 'clamp(0.75rem, 1.85cqi, 1.2rem)', lineHeight: 1.55 }}>
              について十分な理解を有することを認
            </span>
          </div>
          <div className="w-[4.8%] shrink-0 overflow-hidden pt-[25%] text-[#5b4528]" style={verticalColumnStyle}>
            <span style={{ fontSize: 'clamp(0.75rem, 1.85cqi, 1.2rem)', lineHeight: 1.55 }}>定します</span>
          </div>

          <div className="w-[3.8%] shrink-0 overflow-hidden pt-[40%] text-[#6a4c24]" style={verticalColumnStyle}>
            <span
              className="font-semibold tracking-[0.03em]"
              style={{ fontSize: 'clamp(0.9rem, 2.3cqi, 1.55rem)', lineHeight: 1.2 }}
            >
              スコア
            </span>
          </div>
          <div className="w-[3.8%] shrink-0 overflow-hidden pt-[31%] text-[#4a2d12]" style={verticalColumnStyle}>
            <span
              className="font-semibold"
              style={{ fontSize: 'clamp(0.9rem, 2.25cqi, 1.5rem)', lineHeight: 1.25 }}
            >
              {score}／{totalQuestions}
            </span>
          </div>

          <div className="w-[3.8%] shrink-0 overflow-hidden pt-[40%] text-[#6a4c24]" style={verticalColumnStyle}>
            <span
              className="font-semibold tracking-[0.03em]"
              style={{ fontSize: 'clamp(0.85rem, 2.15cqi, 1.45rem)', lineHeight: 1.2 }}
            >
              認定日
            </span>
          </div>
          <div className="w-[4.2%] shrink-0 overflow-hidden pt-[29%] text-[#4a2d12]" style={verticalColumnStyle}>
            <span style={{ fontSize: 'clamp(0.7rem, 1.75cqi, 1.15rem)', lineHeight: 1.45 }}>
              {formatDate(date)}
            </span>
          </div>

          <div className="w-[5.2%] shrink-0 overflow-hidden pt-[18%] text-[#5b4528]" style={verticalColumnStyle}>
            <span style={{ fontSize: 'clamp(0.7rem, 1.75cqi, 1.15rem)', lineHeight: 1.6 }}>
              一般社団法人　教育AI活用協会
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
