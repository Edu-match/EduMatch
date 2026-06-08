import type { Metadata } from "next";
import { Suspense } from "react";
import { Bebas_Neue, Zen_Kaku_Gothic_New } from "next/font/google";
import { CalendarDays, ChevronRight } from "lucide-react";
import { InteropExplorer } from "@/components/interop/interop-explorer";
import { getInteropSettings } from "@/lib/interop-settings";

const bebas   = Bebas_Neue({ weight: "400", subsets: ["latin"], display: "swap" });
const zenKaku = Zen_Kaku_Gothic_New({ weight: ["700"], subsets: ["latin"], display: "swap" });

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "教育AIサミット | Interop Tokyo 2026",
  description:
    "Interop Tokyo 2026 教育AIサミット。議員会館・AI検定・エデュマッチ・AI部の展示・登壇・セミナー情報。会場：幕張メッセ。",
};

export default async function InteropPage() {
  const settings = await getInteropSettings();

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-[#070a1c] text-white">
      {/* ════════ 全画面マップ（背景として配置） ════════ */}
      <Suspense fallback={<div className="absolute inset-0 bg-[#070a1c]" />}>
        <InteropExplorer themeMode={settings.themeMode} guideText={settings.guideText} />
      </Suspense>

      {/* ════════ 上部ヘッダー（マップに重ねるガラスバー） ════════ */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-40">
        <div
          className="pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 sm:px-6"
          style={{
            background: "linear-gradient(180deg, rgba(7,2,31,0.92) 0%, rgba(7,2,31,0.55) 70%, transparent 100%)",
          }}
        >
          {/* 左：ロゴバッジ + タイトル */}
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-lg bg-white px-3 py-1.5 shadow-lg shadow-black/30 sm:inline-flex">
              <div className="flex items-center gap-1">
                <div className="flex flex-col items-end leading-[1.05]">
                  <span className="text-[7px] font-black tracking-wider text-gray-800">Education</span>
                  <span className="text-[7px] font-black tracking-wider text-gray-800">Summit</span>
                </div>
                <span className={`${bebas.className} text-[1.7rem] leading-none text-gray-900`}>AI</span>
              </div>
              <span className="text-sm font-bold text-gray-400">×</span>
              <div className="flex items-end gap-0.5 leading-none">
                <span className={`${bebas.className} text-[1.05rem] tracking-wide text-[#1a3070]`}>Interop</span>
                <span className={`${bebas.className} text-[1.5rem] leading-none text-[#1a3070]`}>26</span>
                <span className="mb-0.5 self-end text-[7px] font-black text-[#1a3070]">Tokyo</span>
              </div>
            </div>
            <div>
              <h1
                className={`${zenKaku.className} text-[clamp(1.2rem,3.4vw,1.9rem)] font-bold leading-none tracking-tight text-white`}
                style={{ textShadow: "0 0 18px rgba(120,150,255,0.4)" }}
              >
                {settings.title}
              </h1>
              <p className={`${zenKaku.className} mt-0.5 text-[10px] font-bold text-indigo-200/80 sm:text-xs`}>
                {settings.subtitle}
              </p>
            </div>
          </div>

          {/* 右：開催情報 + リンク */}
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white/85 backdrop-blur md:inline-flex">
              <CalendarDays className="h-3.5 w-3.5 text-indigo-200" /> {settings.dateVenue}
            </span>
            <a
              href={settings.registerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-400 to-violet-500 px-3.5 py-1.5 text-[11px] font-bold text-white shadow-lg shadow-violet-500/25 transition-transform hover:scale-105 sm:text-xs"
            >
              {settings.registerLabel} <ChevronRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* ════════ 下部のお問い合わせ（控えめに重ねる） ════════ */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30">
        <div className="pointer-events-auto flex items-center justify-center gap-4 px-4 py-2 text-[10px] text-white/45 sm:text-[11px]">
          <span className="hidden sm:inline">{settings.footerCredit}</span>
          <a href="mailto:info@edu-match.com" className="underline-offset-2 hover:text-white/80 hover:underline">
            お問い合わせ
          </a>
        </div>
      </div>
    </main>
  );
}
