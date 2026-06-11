import type { Metadata } from "next";
import { Suspense } from "react";
import { headers } from "next/headers";
import Image from "next/image";
import { Zen_Kaku_Gothic_New } from "next/font/google";
import { CalendarDays, ChevronRight, GraduationCap } from "lucide-react";
import { InteropExplorer } from "@/components/interop/interop-explorer";
import { InteropGeofence } from "@/components/interop/interop-geofence";
import { getInteropSettings } from "@/lib/interop-settings.server";
import { ensureExternalUrl } from "@/lib/interop-settings";

/** SSR: 活動量を先に取得して初回から盛り上がり演出を出す（エフェクト遅延の解消） */
async function fetchInitialActivity() {
  try {
    const h = await headers();
    const host = h.get("host");
    if (!host) return { interop: null, forum: null };
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    const origin = `${proto}://${host}`;
    const [interop, forum] = await Promise.all([
      fetch(`${origin}/api/interop/activity`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${origin}/api/forum/rooms?communityThemes=true`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);
    return { interop, forum };
  } catch {
    return { interop: null, forum: null };
  }
}

const zenKaku = Zen_Kaku_Gothic_New({ weight: ["700"], subsets: ["latin"], display: "swap" });

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "教育AIサミット | Interop Tokyo 2026",
  description:
    "Interop Tokyo 2026 教育AIサミット。議員会館・AI検定・エデュマッチ・AI部の展示・登壇・セミナー情報。会場：幕張メッセ。",
};

export default async function InteropPage() {
  const [settings, initialActivity] = await Promise.all([
    getInteropSettings(),
    fetchInitialActivity(),
  ]);

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-[#070a1c] text-white">
      {/* ════════ 全画面マップ（背景として配置） ════════ */}
      <Suspense fallback={<div className="absolute inset-0 bg-[#070a1c]" />}>
        <InteropExplorer
          themeMode={settings.themeMode}
          guideText={settings.guideText}
          initialInteropActivity={initialActivity.interop}
          initialForumActivity={initialActivity.forum}
        />
      </Suspense>

      {/* 会場を出たときの演出（位置情報・任意） */}
      <InteropGeofence settings={settings} />

      {/* ════════ 上部ヘッダー（マップに重ねるガラスバー） ════════ */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-40">
        <div
          className="pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 sm:px-6"
          style={{
            background: "linear-gradient(180deg, rgba(7,2,31,0.92) 0%, rgba(7,2,31,0.55) 70%, transparent 100%)",
          }}
        >
          {/* 左：ロゴバッジ + エデュマッチ導線 + タイトル */}
          <div className="flex items-center gap-3">
            <div className="flex shrink-0 flex-col items-start gap-1.5">
              <div className="inline-flex items-center rounded-lg bg-white px-2.5 py-1.5 shadow-lg shadow-black/30">
                <Image
                  src="/interop-logo.png"
                  alt="AI NATIVE EXPO 2026"
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
                className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white/90 shadow-sm backdrop-blur transition-colors hover:bg-white/18 hover:text-white sm:px-3 sm:text-[11px]"
              >
                <GraduationCap className="h-3 w-3 shrink-0 text-indigo-200" />
                エデュマッチ
                <ChevronRight className="h-3 w-3 shrink-0 opacity-70" />
              </a>
            </div>
            <div>
              <h1
                className={`${zenKaku.className} text-[clamp(1.02rem,3.4vw,1.9rem)] font-bold leading-tight tracking-tight text-white [word-break:keep-all]`}
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
              href={ensureExternalUrl(settings.registerUrl, "https://www.interop.jp/")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-gradient-to-r from-indigo-400 to-violet-500 px-3.5 py-1.5 text-[11px] font-bold text-white shadow-lg shadow-violet-500/25 transition-transform hover:scale-105 sm:text-xs"
            >
              {settings.registerLabel} <ChevronRight className="h-3.5 w-3.5 shrink-0" />
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
