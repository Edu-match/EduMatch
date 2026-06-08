import type { Metadata } from "next";
import { Bebas_Neue, Zen_Kaku_Gothic_New } from "next/font/google";
import { CalendarDays, Building2, Mail, ChevronRight } from "lucide-react";
import { InteropExplorer } from "@/components/interop/interop-explorer";

const bebas   = Bebas_Neue({ weight: "400", subsets: ["latin"], display: "swap" });
const zenKaku = Zen_Kaku_Gothic_New({ weight: ["700"], subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "教育AIサミット | Interop Tokyo 2026",
  description:
    "Interop Tokyo 2026 教育AIサミット。議員会館・AI検定・エデュマッチ・AI部の展示・登壇・セミナー情報。会場：幕張メッセ。",
};

export default function InteropPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">

      {/* ══════════════════════════════════════════
          HERO — 流体波グラデーション + 2カラム
      ══════════════════════════════════════════ */}
      <section
        className="relative flex min-h-screen items-center overflow-hidden"
        style={{
          background: [
            "radial-gradient(ellipse 90% 70% at 15% 25%, rgba(0,210,255,0.32) 0%, transparent 55%)",
            "radial-gradient(ellipse 70% 60% at 85% 15%, rgba(220,60,220,0.28) 0%, transparent 55%)",
            "radial-gradient(ellipse 60% 50% at 70% 80%, rgba(130,0,240,0.22) 0%, transparent 55%)",
            "radial-gradient(ellipse 80% 90% at 40% 60%, rgba(0,80,200,0.18) 0%, transparent 65%)",
            "linear-gradient(160deg, #02051a 0%, #060a38 35%, #0a1258 65%, #0d1870 100%)",
          ].join(", "),
        }}
      >
        {/* 流体波 SVG */}
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full"
          preserveAspectRatio="xMidYMid slice"
          viewBox="0 0 1440 900"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="waveBlur"><feGaussianBlur stdDeviation="18" /></filter>
          </defs>
          <path d="M-100 350 Q200 180 500 300 Q800 420 1100 200 Q1300 100 1600 280"
            fill="none" stroke="rgba(0,220,255,0.55)" strokeWidth="90" filter="url(#waveBlur)" />
          <path d="M-100 400 Q250 240 520 340 Q820 460 1120 250 Q1350 140 1600 330"
            fill="none" stroke="rgba(60,180,255,0.28)" strokeWidth="40" filter="url(#waveBlur)" />
          <path d="M700 -50 Q900 200 1000 400 Q1100 600 900 800 Q1100 700 1440 600"
            fill="none" stroke="rgba(220,60,200,0.45)" strokeWidth="80" filter="url(#waveBlur)" />
          <path d="M750 -80 Q950 180 1040 380 Q1140 580 940 780"
            fill="none" stroke="rgba(180,40,255,0.22)" strokeWidth="35" filter="url(#waveBlur)" />
          {([
            [320,280],[480,420],[200,560],[620,200],[150,380],
            [540,480],[700,300],[380,640],[900,500],[260,200],
          ] as [number,number][]).map(([cx,cy],i) => (
            <circle key={i} cx={cx} cy={cy} r="3" fill="rgba(150,220,255,0.6)" />
          ))}
        </svg>

        {/* コンテンツ */}
        <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-20 sm:px-10">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-12">

            {/* ── 左：テキスト ── */}
            <div className="flex-1">
              <p className={`${bebas.className} mb-4 text-[clamp(0.9rem,2vw,1.2rem)] tracking-[0.35em] text-cyan-300/80`}>
                Education AI Summit 2026
              </p>
              <h1 className={`${zenKaku.className} text-[clamp(3.2rem,9vw,7.5rem)] font-bold leading-[1.0] tracking-tight text-white`}>
                教育AI<wbr />サミット
              </h1>
              <p className={`${zenKaku.className} mt-3 text-[clamp(1.4rem,3.5vw,2.8rem)] font-bold leading-snug text-white/75`}>
                in Interop Tokyo 2026。
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-5 text-sm text-white/45">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" /> 2026年6月10日–12日
                </span>
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" /> 幕張メッセ
                </span>
              </div>
            </div>

            {/* ── 右：イベントカード ── */}
            <div className="w-full max-w-sm lg:w-80 lg:shrink-0">
              <div
                className="relative overflow-hidden rounded-2xl border border-white/15"
                style={{
                  background: "linear-gradient(160deg, rgba(5,10,50,0.92) 0%, rgba(10,20,80,0.88) 100%)",
                  backdropFilter: "blur(12px)",
                }}
              >
                {/* Interop ロゴ風ヘッダー */}
                <div className="border-b border-white/10 px-6 py-5">
                  <div className="flex items-baseline gap-1">
                    <span className={`${bebas.className} text-[2.8rem] leading-none tracking-wide text-white`}>
                      Interop
                    </span>
                    <span className={`${bebas.className} text-[3.5rem] leading-none text-cyan-300`}>
                      26
                    </span>
                  </div>
                  <p className={`${bebas.className} text-[1.4rem] leading-none tracking-widest text-white/70`}>
                    Tokyo
                  </p>
                  <p className="mt-1 text-[10px] font-semibold tracking-widest text-white/40">
                    JUNE 10–12 · MAKUHARI MESSE, JAPAN
                  </p>
                </div>

                {/* 日程 */}
                <div className="px-6 py-5">
                  <div className={`${zenKaku.className} text-[1.7rem] font-bold leading-tight text-white`}>
                    6月10日<span className="mx-1 text-sm font-normal text-white/50">水</span>–
                    12日<span className="ml-1 text-sm font-normal text-white/50">金</span>
                  </div>
                  <p className="mt-1 text-[12px] text-white/55">@幕張メッセ &nbsp;·&nbsp; 展示・講演</p>
                  <div className="mt-5 inline-flex items-center rounded-full border border-yellow-400/60 bg-yellow-400/10 px-4 py-1.5 text-[13px] font-bold text-yellow-300">
                    来場登録制・無料
                  </div>
                </div>

                {/* CTA */}
                <a
                  href="https://www.interop.jp/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between border-t border-white/10 px-6 py-4 text-sm font-bold text-white/60 transition-colors hover:bg-white/5 hover:text-white"
                >
                  詳細はこちらへ <ChevronRight className="h-4 w-4" />
                </a>
              </div>
            </div>

          </div>
        </div>

        {/* 下端の斜めカット */}
        <div
          aria-hidden
          className="absolute bottom-0 left-0 right-0"
          style={{ height: "72px", background: "white", clipPath: "polygon(0 100%, 100% 0, 100% 100%)" }}
        />
      </section>

      {/* ══════════════════════════════════════════
          インフォメーション・マップ
      ══════════════════════════════════════════ */}
      <section
        id="map"
        className="relative overflow-hidden px-6 py-20 sm:px-14 sm:py-24"
        style={{ background: "linear-gradient(160deg, #01081c 0%, #040f38 50%, #071d70 100%)" }}
      >
        <div aria-hidden className="absolute left-0 right-0 top-0"
          style={{ height: "72px", background: "white", clipPath: "polygon(0 0, 100% 0, 0 100%)" }} />
        <div aria-hidden className="absolute bottom-0 left-0 right-0"
          style={{ height: "72px", background: "white", clipPath: "polygon(0 100%, 100% 0, 100% 100%)" }} />
        <div aria-hidden className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(rgba(120,180,255,0.2) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
            maskImage: "radial-gradient(ellipse 75% 65% at 50% 50%, #000 30%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 75% 65% at 50% 50%, #000 30%, transparent 100%)",
          }}
        />
        <div className="relative z-10 mx-auto max-w-5xl pt-6">
          <div className="mb-12">
            <p className={`${bebas.className} mb-1 text-[clamp(0.7rem,1.5vw,0.85rem)] tracking-[0.35em] text-blue-400`}>
              Information Map
            </p>
            <h2 className={`${zenKaku.className} text-[clamp(1.8rem,4vw,3rem)] font-bold tracking-tight text-white`}>
              インフォメーション・マップ
            </h2>
            <p className="mt-2 text-sm text-white/40">
              カテゴリを選択 → サブカテゴリ → 案内・タイムテーブルへ
            </p>
          </div>
          <InteropExplorer />
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CONTACT
      ══════════════════════════════════════════ */}
      <section className="bg-white px-6 py-20 sm:px-14">
        <div className="mx-auto max-w-4xl">
          <h2 className={`${zenKaku.className} mb-2 text-[clamp(1.6rem,3.5vw,2.5rem)] font-bold tracking-tight text-gray-900`}>
            お問い合わせ
          </h2>
          <p className="mb-8 text-sm text-gray-400">取材・協賛・登壇ご依頼はお気軽にどうぞ。</p>
          <div className="flex flex-wrap gap-3">
            <a
              href="mailto:info@edu-match.com"
              className="inline-flex items-center gap-2 border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-900 hover:text-gray-900"
            >
              <Mail className="h-4 w-4" /> info@edu-match.com
            </a>
            <a
              href="https://edu-match.com/contact"
              className="inline-flex items-center gap-2 bg-gray-900 px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-80"
            >
              お問い合わせフォーム <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-6 py-10" style={{ background: "#01081c" }}>
        <div className="mx-auto max-w-6xl flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className={`${bebas.className} text-xl tracking-widest text-white/70`}>Interop Tokyo 2026</p>
            <p className={`${zenKaku.className} text-[11px] font-bold text-white/40`}>教育AIサミット</p>
          </div>
          <p className="text-[11px] text-white/25">
            青楓館高等学院 / みんがく / AI検定協会 / AI部 &nbsp;© 2026
          </p>
        </div>
      </footer>
    </main>
  );
}
