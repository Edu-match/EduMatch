import { Suspense } from "react";
import type { Metadata } from "next";
import { InteropExplorer } from "@/components/interop/interop-explorer";
import { getInteropSettings } from "@/lib/interop-settings.server";
import { fetchInteropInitialActivity } from "@/lib/interop-explorer.server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AIUEO 井戸端会議 | エデュマッチ",
  description:
    "教育に関わるすべての人が、テーマ別の部屋でざっくばらんに語り合うコミュニティ。教員・専門家・保護者・企業、立場を超えてつながりましょう。",
};

export default async function ForumPage() {
  const [settings, initialActivity] = await Promise.all([
    getInteropSettings(),
    fetchInteropInitialActivity(),
  ]);

  return (
    <main className="relative h-[calc(100dvh-4rem)] w-full overflow-hidden bg-[#070a1c] text-white">
      <Suspense fallback={<div className="absolute inset-0 bg-[#070a1c]" />}>
        <InteropExplorer
          themeMode={settings.themeMode}
          guideText="中央のハブをタップして話題へ · 周囲の◎トピックをタップして井戸端へ"
          initialInteropActivity={initialActivity.interop}
          initialForumActivity={initialActivity.forum}
          showChat={false}
          initialScale={1.35}
          centerLabel={settings.centerLabel}
          centerHubItems={settings.centerHubItems}
          showLatestNews={settings.showLatestNews}
          showSpeakerQa={settings.showSpeakerQa}
          showOpinionBox={settings.showOpinionBox}
        />
      </Suspense>
    </main>
  );
}
