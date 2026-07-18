import { Suspense } from "react";
import type { Metadata } from "next";
import { ForumMapMode } from "@/components/interop/forum-map-mode";
import { getInteropSettings } from "@/lib/interop-settings.server";
import { fetchInteropInitialActivity } from "@/lib/interop-explorer.server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AIUEO 教育のひろば | AIUEO BASE",
  description:
    "教育に関わるすべての人が、テーマ別の部屋でざっくばらんに語り合うコミュニティ。教員・専門家・保護者・企業、立場を超えてつながりましょう。",
};

export default async function ForumPage() {
  const [settings, initialActivity] = await Promise.all([
    getInteropSettings(),
    fetchInteropInitialActivity(),
  ]);

  return (
    <main className="relative h-[calc(100dvh-4rem-2.75rem)] w-full overflow-hidden bg-[#e3f2fd] text-foreground dark:bg-[#0c1a3a] dark:text-white">
      <Suspense fallback={<div className="absolute inset-0 bg-[#e3f2fd] dark:bg-[#0c1a3a]" />}>
        <ForumMapMode
          themeMode={settings.themeMode}
          guideText="中央のハブをタップして話題へ · 周囲の◎トピックをタップしてひろばへ"
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
