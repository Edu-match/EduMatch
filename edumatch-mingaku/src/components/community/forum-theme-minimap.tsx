"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { INTEROP_PRIORITY_TOPICS } from "@/lib/interop-priority-topics";

/**
 * 井戸端の「大きな6テーマ」ミニマップ。
 * 28トピックを詰め込む重量級マップ(InteropPuyoBubbleMap)の代わりに、議論の大テーマ6つだけを
 * 大きなバブルで見せる軽量版。トップページ埋め込み・サイドバーで再利用する。
 * 玉タップ → /forum?group=<major> でそのテーマにフォーカスして井戸端を開く。
 */

// A〜F の表示名（MAJOR_METAの正式名は長いので短縮）とアクセント色（グロー用の濃いめ）。
const THEMES: Array<{ key: string; label: string; glow: string }> = [
  { key: "A", label: "AI・テク活用", glow: "#3a90f0" },
  { key: "B", label: "評価・学力", glow: "#38c038" },
  { key: "C", label: "子どもの権利", glow: "#e83030" },
  { key: "D", label: "多様性・公正", glow: "#9030e0" },
  { key: "E", label: "教師・学校", glow: "#e0a010" },
  { key: "F", label: "教科の指導", glow: "#4860d8" },
];

type RoomActivity = { id: string; postCount?: number };

export function ForumThemeMinimap({
  variant = "embedded",
}: {
  variant?: "embedded" | "sidebar";
}) {
  const router = useRouter();
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    fetch("/api/forum/rooms?communityThemes=true")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const rooms: RoomActivity[] = Array.isArray(d.rooms) ? d.rooms : [];
        const byRoom = new Map(rooms.map((r) => [r.id, r.postCount ?? 0]));
        const acc: Record<string, number> = {};
        for (const t of INTEROP_PRIORITY_TOPICS) {
          acc[t.major] = (acc[t.major] ?? 0) + (byRoom.get(t.roomId) ?? 0);
        }
        setCounts(acc);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const themes = useMemo(
    () =>
      THEMES.map((t) => ({
        ...t,
        count: counts[t.key] ?? 0,
        rooms: INTEROP_PRIORITY_TOPICS.filter((x) => x.major === t.key).length,
      })),
    [counts],
  );

  const isSidebar = variant === "sidebar";
  const size = isSidebar ? 84 : 134;

  return (
    <div
      className={`relative flex h-full w-full flex-wrap content-center items-center justify-center overflow-hidden ${
        isSidebar ? "gap-2.5 p-3" : "gap-4 p-5"
      }`}
      style={{
        background:
          "radial-gradient(120% 90% at 50% 30%, #0e1640 0%, #070a1c 70%, #05060f 100%)",
      }}
    >
      {themes.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => router.push(`/forum?group=${t.key}`)}
          className="group relative flex shrink-0 flex-col items-center justify-center rounded-full text-center transition-transform duration-200 hover:scale-[1.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          style={{
            width: size,
            height: size,
            background: `radial-gradient(circle at 35% 28%, rgba(255,255,255,0.5) 0%, ${t.glow}33 52%, rgba(10,20,60,0.32) 100%)`,
            border: `1.5px solid ${t.glow}99`,
            boxShadow: `0 0 18px ${t.glow}55, inset 0 0 12px rgba(255,255,255,0.22)`,
          }}
          aria-label={`${t.label}の井戸端を見る（${t.count}件の投稿）`}
        >
          <span
            className="px-2 font-bold leading-tight text-white [word-break:keep-all]"
            style={{
              fontSize: isSidebar ? 11 : 14,
              textShadow: "0 1px 5px rgba(0,0,0,0.55)",
            }}
          >
            {t.label}
          </span>
          <span
            className="mt-1 rounded-full bg-black/35 font-bold text-white/90"
            style={{ fontSize: isSidebar ? 9 : 10, padding: isSidebar ? "1px 6px" : "2px 8px" }}
          >
            {t.count}件
          </span>
        </button>
      ))}
    </div>
  );
}
