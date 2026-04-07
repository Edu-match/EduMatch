'use client'

import { Award, Brain, CheckCircle, Sparkles, Cpu, Network } from 'lucide-react'

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
  const percentage = Math.round((score / totalQuestions) * 100)

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date)
  }

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-2xl">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900" />

      {/* Neural network pattern overlay */}
      <div className="absolute inset-0 opacity-20">
        <svg className="w-full h-full" viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="cert-nodeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="1" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="cert-lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#a78bfa" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#f472b6" stopOpacity="0.5" />
            </linearGradient>
          </defs>
          <g stroke="url(#cert-lineGradient)" strokeWidth="0.5" fill="none">
            <path d="M50,50 Q100,100 150,80 T250,120" className="animate-pulse" />
            <path d="M350,30 Q300,80 280,150 T200,200" style={{ animationDelay: '0.5s' }} className="animate-pulse" />
            <path d="M30,200 Q80,180 120,220 T200,250" style={{ animationDelay: '1s' }} className="animate-pulse" />
            <path d="M370,180 Q320,220 280,200 T180,280" style={{ animationDelay: '1.5s' }} className="animate-pulse" />
            <path d="M50,350 Q100,320 160,360 T260,340" style={{ animationDelay: '0.3s' }} className="animate-pulse" />
            <path d="M380,400 Q330,370 280,420 T180,400" style={{ animationDelay: '0.8s' }} className="animate-pulse" />
          </g>
          <g fill="url(#cert-nodeGlow)">
            <circle cx="50" cy="50" r="4" className="animate-pulse" />
            <circle cx="150" cy="80" r="3" className="animate-pulse" style={{ animationDelay: '0.2s' }} />
            <circle cx="350" cy="30" r="4" className="animate-pulse" style={{ animationDelay: '0.4s' }} />
            <circle cx="200" cy="200" r="5" className="animate-pulse" style={{ animationDelay: '0.8s' }} />
            <circle cx="120" cy="220" r="4" className="animate-pulse" style={{ animationDelay: '0.3s' }} />
          </g>
        </svg>
      </div>

      {/* Gold border frame */}
      <div className="absolute inset-3 border-2 border-amber-500/40 rounded-xl pointer-events-none" />
      <div className="absolute inset-4 border border-amber-500/20 rounded-lg pointer-events-none" />

      {/* Corner ornaments */}
      <div className="absolute top-3 left-3 w-16 h-16">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-transparent" />
        <div className="absolute top-0 left-0 h-full w-1 bg-gradient-to-b from-amber-500 to-transparent" />
        <Sparkles className="absolute top-2 left-2 h-4 w-4 text-amber-400/70" />
      </div>
      <div className="absolute top-3 right-3 w-16 h-16">
        <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-l from-amber-500 to-transparent" />
        <div className="absolute top-0 right-0 h-full w-1 bg-gradient-to-b from-amber-500 to-transparent" />
        <Network className="absolute top-2 right-2 h-4 w-4 text-amber-400/70" />
      </div>
      <div className="absolute bottom-3 left-3 w-16 h-16">
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-transparent" />
        <div className="absolute bottom-0 left-0 h-full w-1 bg-gradient-to-t from-amber-500 to-transparent" />
        <Cpu className="absolute bottom-2 left-2 h-4 w-4 text-amber-400/70" />
      </div>
      <div className="absolute bottom-3 right-3 w-16 h-16">
        <div className="absolute bottom-0 right-0 w-full h-1 bg-gradient-to-l from-amber-500 to-transparent" />
        <div className="absolute bottom-0 right-0 h-full w-1 bg-gradient-to-t from-amber-500 to-transparent" />
        <Brain className="absolute bottom-2 right-2 h-4 w-4 text-amber-400/70" />
      </div>

      {/* Main content */}
      <div className="relative z-10 p-8 md:p-10">
        <div className="text-center space-y-6">
          {/* Header badge */}
          <div className="flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent via-amber-500/50 to-amber-500" />
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30">
              <Award className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-semibold tracking-[0.2em] uppercase text-amber-400">Certificate of Achievement</span>
              <Award className="h-4 w-4 text-amber-400" />
            </div>
            <div className="h-px w-12 bg-gradient-to-l from-transparent via-amber-500/50 to-amber-500" />
          </div>

          {/* Title section */}
          <div className="space-y-2">
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent tracking-wide">
              認定証
            </h2>
            <div className="flex items-center justify-center gap-2">
              <div className="h-px w-8 bg-gradient-to-r from-transparent to-violet-500/50" />
              <p className="text-lg font-semibold text-violet-400 tracking-wider">
                教育AI活用ビギナー部門
              </p>
              <div className="h-px w-8 bg-gradient-to-l from-transparent to-violet-500/50" />
            </div>
            <p className="text-sm text-slate-400 tracking-wide">
              生成AI活用ガイドライン検定
            </p>
          </div>

          {/* Photo */}
          {photoUrl && (
            <div className="flex justify-center py-2">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 via-violet-500 to-amber-500 rounded-full blur-sm opacity-75 animate-pulse" />
                <div className="relative w-28 h-28 rounded-full border-2 border-amber-500/50 overflow-hidden bg-slate-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          )}

          {/* Name section */}
          <div className="space-y-1">
            <p className="text-sm text-slate-500 tracking-wider">上記の者は</p>
            <p className="text-3xl md:text-4xl font-bold text-white tracking-wide">
              {name}
            </p>
            <p className="text-sm text-slate-500 tracking-wider">殿</p>
          </div>

          {/* Achievement box */}
          <div className="relative mx-auto max-w-sm">
            <div className="absolute -inset-px bg-gradient-to-r from-emerald-500/50 via-teal-500/50 to-emerald-500/50 rounded-xl blur-sm" />
            <div className="relative bg-slate-900/90 border border-emerald-500/30 rounded-xl p-5">
              <div className="flex items-center justify-center gap-2 mb-3">
                <CheckCircle className="h-6 w-6 text-emerald-400" />
                <span className="text-xl font-bold text-emerald-400 tracking-wider">合格</span>
                <CheckCircle className="h-6 w-6 text-emerald-400" />
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                学校における生成AI活用ガイドラインについて
                <br />
                十分な理解を有することを認定します
              </p>
            </div>
          </div>

          {/* Score section */}
          <div className="flex justify-center gap-4 md:gap-8 py-4">
            <div className="text-center px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <p className="text-3xl font-bold text-blue-400">{score}</p>
              <p className="text-xs text-slate-500 mt-1 tracking-wider">正解数</p>
            </div>
            <div className="flex items-center text-slate-600">
              <span className="text-3xl">/</span>
            </div>
            <div className="text-center px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <p className="text-3xl font-bold text-slate-400">{totalQuestions}</p>
              <p className="text-xs text-slate-500 mt-1 tracking-wider">出題数</p>
            </div>
            <div className="text-center px-4 py-3 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-500/30">
              <p className="text-3xl font-bold text-amber-400">{percentage}%</p>
              <p className="text-xs text-amber-500/70 mt-1 tracking-wider">正答率</p>
            </div>
          </div>

          {/* Date and organization */}
          <div className="pt-4 border-t border-slate-700/50 space-y-4">
            <p className="text-sm text-slate-400 tracking-wide">
              {formatDate(date)}
            </p>
            <div className="flex items-center justify-center gap-3">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full blur-sm opacity-50" />
                <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-slate-900 border border-violet-500/50">
                  <Brain className="h-5 w-5 text-violet-400" />
                </div>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-white">一般社団法人 教育AI活用協会</p>
                <p className="text-xs text-slate-500">Education AI Utilization Association</p>
              </div>
            </div>
          </div>

          {/* Certificate ID */}
          {certificateId && (
            <div className="pt-2">
              <p className="text-xs text-slate-600 font-mono tracking-wider">
                Certificate ID: {certificateId}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
