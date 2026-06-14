import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import { Zen_Kaku_Gothic_New } from "next/font/google";
import { CalendarDays, GraduationCap, ChevronRight } from "lucide-react";
import { InteropBackdrop } from "@/components/interop/interop-backdrop";
import { KaikanHub } from "@/components/kaikan/kaikan-hub";

const zenKaku = Zen_Kaku_Gothic_New({
  weight: ["700"],
  subsets: ["latin"],
  display: "swap",
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "教育AIサミット＠衆議院第一議員会館 | EduMatch",
  description:
    "教育AIサミット＠衆議院第一議員会館。インフォメーション・AIチャンピオンシップ・ご意見要望を一枚に集約した特設ページ。",
};

export default function KaikanPage() {
  return (
    <main className="relative min-h-[100dvh] w-full overflow-hidden bg-[#070a1c] text-white">
      {/* 時間帯で変わる宇宙背景（interop と同系統） */}
      <Suspense fallback={<div className="absolute inset-0 bg-[#070a1c]" />}>
        <InteropBackdrop themeMode="auto" />
      </Suspense>

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-4xl flex-col px-4 py-10 sm:px-6">
        {/* ヘッダー */}
        <header className="mb-8 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex shrink-0 items-center rounded-lg bg-white px-2.5 py-1.5 shadow-lg shadow-black/30">
              <Image
                src="/interop-logo.png"
                alt="教育AIサミット"
                width={113}
                height={40}
                priority
                className="h-7 w-auto sm:h-9"
              />
            </div>
            <a
              href="https://preview.edu-match.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-bold text-white/90 shadow-sm backdrop-blur transition-colors hover:bg-white/[0.18] hover:text-white"
            >
              <GraduationCap className="h-3 w-3 shrink-0 text-indigo-200" />
              エデュマッチ
              <ChevronRight className="h-3 w-3 shrink-0 opacity-70" />
            </a>
          </div>

          <div>
            <h1
              className={`${zenKaku.className} text-[clamp(1.4rem,5vw,2.4rem)] font-bold leading-tight tracking-tight text-white [word-break:keep-all]`}
              style={{ textShadow: "0 0 18px rgba(120,150,255,0.4)" }}
            >
              教育AIサミット
              <br className="sm:hidden" />
              <span className="text-indigo-200/90">＠衆議院第一議員会館</span>
            </h1>
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white/85 backdrop-blur sm:text-xs">
              <CalendarDays className="h-3.5 w-3.5 text-indigo-200" />
              衆議院第一議員会館
            </p>
          </div>
        </header>

        {/* 3コンテンツ */}
        <KaikanHub />

        {/* フッター */}
        <div className="mt-auto pt-10 text-center text-[11px] text-white/45">
          <a
            href="mailto:info@edu-match.com"
            className="underline-offset-2 hover:text-white/80 hover:underline"
          >
            お問い合わせ
          </a>
        </div>
      </div>
    </main>
  );
}
