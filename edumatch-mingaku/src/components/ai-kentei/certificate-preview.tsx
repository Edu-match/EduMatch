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
    <div className={`relative w-full aspect-video overflow-hidden rounded-lg shadow-2xl ${certificateMincho.className}`} lang="ja">
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
        <div
          className="absolute bottom-[5%] right-[24%] top-[5%] w-px bg-[#c7ab73]/70"
        />

        <div
          className="absolute right-[6.5%] top-1/2 -translate-y-1/2 text-[#4a2d12]"
          style={verticalColumnStyle}
        >
          <span
            className="font-semibold tracking-[0.06em]"
            style={{ fontSize: 'clamp(2.9rem, 8vw, 5.7rem)', lineHeight: 1.02 }}
          >
            認定証
          </span>
        </div>

        <div
          className="absolute right-[14.2%] top-[9%] text-[#6a4c24]"
          style={verticalColumnStyle}
        >
          <span style={{ fontSize: 'clamp(1.4rem, 3.2vw, 2.3rem)', lineHeight: 1.35 }}>
            生成AI活用ガイドライン検定（教育AI
          </span>
        </div>

        <div
          className="absolute right-[19.4%] top-[14%] text-[#6a4c24]"
          style={verticalColumnStyle}
        >
          <span style={{ fontSize: 'clamp(1.2rem, 2.8vw, 2rem)', lineHeight: 1.35 }}>
            活用ビギナー部門）
          </span>
        </div>

        <div
          className="absolute right-[32.5%] top-[9%] text-[#4a2d12]"
          style={verticalColumnStyle}
        >
          <span
            className="font-semibold tracking-[0.04em]"
            style={{ fontSize: 'clamp(1.8rem, 4.8vw, 3.6rem)', lineHeight: 1.2 }}
          >
            {name || '受験者名'}
          </span>
        </div>

        <div
          className="absolute right-[38.4%] top-[34%] text-[#6a4c24]"
          style={verticalColumnStyle}
        >
          <span style={{ fontSize: 'clamp(1.4rem, 3vw, 2.2rem)', lineHeight: 1.2 }}>殿</span>
        </div>

        <div
          className="absolute right-[43.5%] top-[15%] text-[#5b4528]"
          style={verticalColumnStyle}
        >
          <span style={{ fontSize: 'clamp(1rem, 2.3vw, 1.65rem)', lineHeight: 1.55 }}>
            学校における生成AI活用ガイドライン
          </span>
        </div>

        <div
          className="absolute right-[49.2%] top-[8%] text-[#5b4528]"
          style={verticalColumnStyle}
        >
          <span style={{ fontSize: 'clamp(1rem, 2.3vw, 1.65rem)', lineHeight: 1.55 }}>
            について十分な理解を有することを認
          </span>
        </div>

        <div
          className="absolute right-[54.8%] top-[27%] text-[#5b4528]"
          style={verticalColumnStyle}
        >
          <span style={{ fontSize: 'clamp(1rem, 2.3vw, 1.65rem)', lineHeight: 1.55 }}>
            定します
          </span>
        </div>

        <div
          className="absolute right-[66.5%] top-[39%] text-[#6a4c24]"
          style={verticalColumnStyle}
        >
          <span
            className="font-semibold tracking-[0.04em]"
            style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2.5rem)', lineHeight: 1.25 }}
          >
            スコア
          </span>
        </div>

        <div
          className="absolute right-[72.3%] top-[31%] text-[#4a2d12]"
          style={verticalColumnStyle}
        >
          <span
            className="font-semibold"
            style={{ fontSize: 'clamp(1.1rem, 2.8vw, 2rem)', lineHeight: 1.3 }}
          >
            {score}／{totalQuestions}
          </span>
        </div>

        <div
          className="absolute right-[79.8%] top-[38%] text-[#6a4c24]"
          style={verticalColumnStyle}
        >
          <span
            className="font-semibold tracking-[0.04em]"
            style={{ fontSize: 'clamp(1.25rem, 3.1vw, 2.2rem)', lineHeight: 1.25 }}
          >
            認定日
          </span>
        </div>

        <div
          className="absolute right-[84.9%] top-[27%] text-[#4a2d12]"
          style={verticalColumnStyle}
        >
          <span style={{ fontSize: 'clamp(0.95rem, 2.25vw, 1.55rem)', lineHeight: 1.45 }}>
            {formatDate(date)}
          </span>
        </div>

        <div
          className="absolute left-[3.5%] top-[18%] text-[#5b4528]"
          style={verticalColumnStyle}
        >
          <span style={{ fontSize: 'clamp(0.95rem, 2.1vw, 1.45rem)', lineHeight: 1.6 }}>
            一般社団法人　教育AI活用協会
          </span>
        </div>
      </div>
    </div>
  )
}
