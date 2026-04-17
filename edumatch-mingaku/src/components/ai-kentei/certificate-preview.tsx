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

      <div className="absolute inset-[4.5%]">
        <div className="absolute bottom-[6%] right-[23.5%] top-[6%] w-px bg-[#c7ab73]/80" />

        <div
          className="absolute bottom-[12%] right-[4.8%] top-[12%] flex w-[14%] items-center justify-center text-[#4a2d12]"
          style={verticalColumnStyle}
        >
          <span
            className="font-semibold tracking-[0.04em]"
            style={{ fontSize: 'clamp(2rem, 6.2cqi, 4.2rem)', lineHeight: 1.02 }}
          >
            認定証
          </span>
        </div>

        <div
          className="absolute right-[12.8%] top-[10%] w-[4.6%] overflow-hidden text-[#6a4c24]"
          style={verticalColumnStyle}
        >
          <span style={{ fontSize: 'clamp(0.9rem, 2.4cqi, 1.7rem)', lineHeight: 1.35 }}>
            生成AI活用ガイドライン検定
          </span>
        </div>

        <div
          className="absolute right-[17.5%] top-[16%] w-[4.4%] overflow-hidden text-[#6a4c24]"
          style={verticalColumnStyle}
        >
          <span style={{ fontSize: 'clamp(0.85rem, 2.2cqi, 1.55rem)', lineHeight: 1.35 }}>
            （教育AI活用ビギナー部門）
          </span>
        </div>

        <div
          className="absolute right-[30.2%] top-[7.5%] w-[5.4%] overflow-hidden text-[#4a2d12]"
          style={verticalColumnStyle}
        >
          <span
            className="font-semibold tracking-[0.02em]"
            style={{ fontSize: 'clamp(1.35rem, 4cqi, 2.8rem)', lineHeight: 1.15 }}
          >
            {name || '受験者名'}
          </span>
        </div>

        <div
          className="absolute right-[35.9%] top-[34%] w-[2.8%] overflow-hidden text-[#6a4c24]"
          style={verticalColumnStyle}
        >
          <span style={{ fontSize: 'clamp(1rem, 2.6cqi, 1.8rem)', lineHeight: 1.1 }}>殿</span>
        </div>

        <div
          className="absolute right-[42.3%] top-[14%] w-[4.6%] overflow-hidden text-[#5b4528]"
          style={verticalColumnStyle}
        >
          <span style={{ fontSize: 'clamp(0.8rem, 2cqi, 1.35rem)', lineHeight: 1.55 }}>
            学校における生成AI活用ガイドライン
          </span>
        </div>

        <div
          className="absolute right-[47.3%] top-[8%] w-[4.6%] overflow-hidden text-[#5b4528]"
          style={verticalColumnStyle}
        >
          <span style={{ fontSize: 'clamp(0.8rem, 2cqi, 1.35rem)', lineHeight: 1.55 }}>
            について十分な理解を有することを認
          </span>
        </div>

        <div
          className="absolute right-[52.4%] top-[26%] w-[3.7%] overflow-hidden text-[#5b4528]"
          style={verticalColumnStyle}
        >
          <span style={{ fontSize: 'clamp(0.8rem, 2cqi, 1.35rem)', lineHeight: 1.55 }}>
            定します
          </span>
        </div>

        <div
          className="absolute right-[64.5%] top-[39%] w-[3.8%] overflow-hidden text-[#6a4c24]"
          style={verticalColumnStyle}
        >
          <span
            className="font-semibold tracking-[0.03em]"
            style={{ fontSize: 'clamp(1rem, 2.7cqi, 1.8rem)', lineHeight: 1.2 }}
          >
            スコア
          </span>
        </div>

        <div
          className="absolute right-[69.1%] top-[30%] w-[4.2%] overflow-hidden text-[#4a2d12]"
          style={verticalColumnStyle}
        >
          <span
            className="font-semibold"
            style={{ fontSize: 'clamp(0.95rem, 2.5cqi, 1.75rem)', lineHeight: 1.25 }}
          >
            {score}／{totalQuestions}
          </span>
        </div>

        <div
          className="absolute right-[77.1%] top-[39%] w-[3.8%] overflow-hidden text-[#6a4c24]"
          style={verticalColumnStyle}
        >
          <span
            className="font-semibold tracking-[0.03em]"
            style={{ fontSize: 'clamp(0.95rem, 2.5cqi, 1.7rem)', lineHeight: 1.2 }}
          >
            認定日
          </span>
        </div>

        <div
          className="absolute right-[81.7%] top-[28%] w-[4.2%] overflow-hidden text-[#4a2d12]"
          style={verticalColumnStyle}
        >
          <span style={{ fontSize: 'clamp(0.75rem, 1.9cqi, 1.25rem)', lineHeight: 1.45 }}>
            {formatDate(date)}
          </span>
        </div>

        <div
          className="absolute left-[2.4%] top-[18%] w-[5.2%] overflow-hidden text-[#5b4528]"
          style={verticalColumnStyle}
        >
          <span style={{ fontSize: 'clamp(0.75rem, 1.9cqi, 1.25rem)', lineHeight: 1.6 }}>
            一般社団法人　教育AI活用協会
          </span>
        </div>
      </div>
    </div>
  )
}
