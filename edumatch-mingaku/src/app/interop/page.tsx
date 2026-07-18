import type { Metadata } from "next";
import { Suspense } from "react";
import { headers } from "next/headers";
import { InteropExplorer } from "@/components/interop/interop-explorer";
import { InteropGeofence } from "@/components/interop/interop-geofence";
import { getInteropSettings } from "@/lib/interop-settings.server";

/** SSR: 活動量を先に取得して初回から盛り上がり演出を出す（エフェクト遅延の解消） */
async function fetchInitialActivity() {
  try {
    const h = await headers();
    const host = h.get("host");
    if (!host) return { interop: null, forum: null };
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    const origin = `${proto}://${host}`;
    const [interop, forum] = await Promise.all([
      fetch(`${origin}/api/interop/activity`, { next: { revalidate: 30 } }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${origin}/api/forum/rooms?communityThemes=true`, { next: { revalidate: 60 } }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);
    return { interop, forum };
  } catch {
    return { interop: null, forum: null };
  }
}


export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "教育AIサミット | Interop Tokyo 2026",
  description:
    "Interop Tokyo 2026（幕張メッセ）出展の教育AIサミット特設サイト。教育AIサミット2026＠衆議院第一議員会館の案内に加え、AI検定・エデュマッチ・AI部の展示・登壇・セミナー情報を掲載。",
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
          showLatestNews={settings.showLatestNews}
          showSpeakerQa={settings.showSpeakerQa}
          showOpinionBox={settings.showOpinionBox}
        />
      </Suspense>

      {/* 会場を出たときの演出（位置情報・任意） */}
      <InteropGeofence settings={settings} />

      {/* 上部ヘッダー（ロゴ／タイトル／来場登録）は撤去し、マップを全画面で見せる */}

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
