"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Mic, MessagesSquare, Newspaper, type LucideIcon } from "lucide-react";
import { InteropBackdrop } from "@/components/interop/interop-backdrop";
import { InteropChatWidget } from "@/components/interop/interop-chat-widget";
import { InteropSubOrbit } from "@/components/interop/interop-sub-orbit";
import type { InteropThemeMode } from "@/lib/interop-settings";

export type SelectableTopic = {
  id: string;
  name: string;
  description: string;
  postCount: number;
};

const SATELLITE_META: Record<string, { color: string; icon: LucideIcon }> = {
  "interop-latest-news": { color: "#7dd4fc", icon: Newspaper },
  "interop-speaker-qa": { color: "#fcd34d", icon: Mic },
  "interop-opinion-box": { color: "#86efac", icon: MessagesSquare },
};

function resolveSatelliteMeta(slug: string, name: string, fallbackAccent: string) {
  if (SATELLITE_META[slug]) return SATELLITE_META[slug];
  if (name.includes("最新ニュース") || name.includes("ニュース")) return SATELLITE_META["interop-latest-news"];
  if (name.includes("登壇") || name.includes("質問")) return SATELLITE_META["interop-speaker-qa"];
  if (name.includes("ご意見") || name.includes("意見")) return SATELLITE_META["interop-opinion-box"];
  return { color: fallbackAccent, icon: MessageCircle };
}

/** トピックが設定されたサブカテゴリの入口：軌道玉UIでトピックを選んでから投稿ページへ。 */
export function InteropTopicSelect({
  sub,
  topics,
  accent,
  themeMode = "auto",
}: {
  sub: { id: string; name: string; slug: string; description: string; categoryName: string; categorySlug?: string };
  topics: SelectableTopic[];
  accent: string;
  themeMode?: InteropThemeMode;
}) {
  const router = useRouter();
  const meta = useMemo(() => resolveSatelliteMeta(sub.slug, sub.name, accent), [sub.slug, sub.name, accent]);
  const centerHint =
    sub.description.trim() ||
    `${topics.length}つのトピック · 盛り上がるほどぷよぷよ大きく`;

  return (
    <main className="relative min-h-[100dvh] w-full overflow-hidden bg-[#070a1c] text-white">
      <InteropBackdrop themeMode={themeMode} />

      <InteropSubOrbit
        centerLabel={sub.name}
        centerIcon={meta.icon}
        centerHint={centerHint}
        accent={meta.color}
        items={topics.map((t) => ({
          id: t.id,
          name: t.name,
          icon: MessageCircle,
          accentColor: meta.color,
          topicOrb: true,
          stats: { postCount: t.postCount, participantCount: 0 },
          onActivate: () => router.push(`/interop/t/${sub.id}/topic/${t.id}`),
        }))}
        backLabel="マップに戻る"
        onBack={() => router.push("/interop")}
      />

      <InteropChatWidget context={`${sub.categoryName}｜${sub.name}（トピック一覧）`} />
    </main>
  );
}
