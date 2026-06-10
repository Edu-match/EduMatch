"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageCircle, type LucideIcon } from "lucide-react";
import { ForumHotFlame } from "@/components/community/forum-hot-flame";
import {
  computeSubOrbDiameter,
  formatActivityHint,
  isInteropHot,
  type InteropActivityStats,
} from "@/lib/interop-activity";
import {
  computePuyoIntensity,
  getOrbitContainerSize,
  getOrbitRadiusPercent,
  INTEROP_PUYO_CSS,
  puyoAnimationStyle,
} from "@/lib/interop-puyopuyo";
import type { InteropCategory } from "@/components/interop/interop-category-bubble-map";

export type InteropSubCategory = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
};

const FX_CSS = `
  @keyframes itmOrbitPulse {
    0%,100% { opacity: 0.28; transform: translate(-50%, -50%) scale(1); }
    50%      { opacity: 0.5; transform: translate(-50%, -50%) scale(1.04); }
  }
  @keyframes itmFadeIn {
    from { opacity: 0; transform: scale(0.98); }
    to { opacity: 1; transform: scale(1); }
  }
`;

function orbitPosition(index: number, total: number, radiusPercent: number) {
  const angleDeg = (360 / Math.max(total, 1)) * index - 90;
  const angle = (angleDeg * Math.PI) / 180;
  return {
    left: 50 + radiusPercent * Math.cos(angle),
    top: 50 + radiusPercent * Math.sin(angle),
  };
}

function SubTopicOrb({
  sub,
  index,
  total,
  orbitRadius,
  accent,
  stats,
  onNavigate,
}: {
  sub: InteropSubCategory;
  index: number;
  total: number;
  orbitRadius: number;
  accent: string;
  stats: InteropActivityStats;
  onNavigate: (id: string) => void;
}) {
  const pos = orbitPosition(index, total, orbitRadius);
  const baseSize = computeSubOrbDiameter(stats);
  const hot = isInteropHot(stats);
  const hint = formatActivityHint(stats);
  const intensity = computePuyoIntensity(stats);
  const iconSize = Math.max(20, baseSize * 0.32);
  const puyoStyle =
    intensity > 0.08 || hot
      ? puyoAnimationStyle(index * 5 + sub.name.length, intensity * 0.65, hot)
      : undefined;

  return (
    <button
      type="button"
      onClick={() => onNavigate(sub.id)}
      className="group absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center focus:outline-none"
      style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
      aria-label={`${sub.name} を開く`}
    >
      <span className="relative flex flex-col items-center">
        {hot && (
          <span
            className="pointer-events-none absolute left-1/2 top-1/2 rounded-full"
            style={{
              width: baseSize + 28,
              height: baseSize + 28,
              transform: "translate(-50%, -50%)",
              border: `1px dashed ${accent}66`,
              animation: `itmOrbitPulse ${4.2 + index * 0.35}s ease-in-out infinite`,
            }}
          />
        )}

        <span
          className={puyoStyle ? "interop-puyo relative grid place-items-center rounded-full" : "relative grid place-items-center rounded-full transition-transform duration-300 group-hover:scale-[1.04]"}
          style={{
            width: baseSize,
            height: baseSize,
            background:
              "radial-gradient(circle at 34% 28%, rgba(255,255,255,0.55) 0%, rgba(160,205,255,0.42) 38%, rgba(70,130,230,0.62) 100%)",
            border: hot ? "1.5px solid rgba(255,190,120,0.75)" : "1.5px solid rgba(255,255,255,0.42)",
            boxShadow: hot
              ? "0 0 24px rgba(255,140,60,0.35), 0 10px 28px rgba(30,60,140,0.28), inset 0 2px 14px rgba(255,255,255,0.45)"
              : "0 0 20px rgba(100,160,255,0.28), 0 10px 28px rgba(30,60,140,0.22), inset 0 2px 14px rgba(255,255,255,0.42)",
            ...puyoStyle,
          }}
        >
          <MessageCircle
            style={{ color: hot ? "#ffb870" : "rgba(255,255,255,0.92)", width: iconSize, height: iconSize }}
            strokeWidth={1.6}
          />
          {hot && (
            <span className="absolute -right-1 -top-1 z-10">
              <ForumHotFlame size="sm" />
            </span>
          )}
          {hint && (
            <span
              className="absolute -bottom-1 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[9px] font-bold shadow"
              style={{
                background: hot ? "rgba(255,120,40,0.92)" : `${accent}cc`,
                color: "#fff",
              }}
            >
              {hint}
            </span>
          )}
        </span>

        <span
          className="mt-2.5 max-w-[min(34vw,148px)] rounded-full px-3 py-1 text-center text-[11px] font-bold leading-snug text-white/95"
          style={{
            background: "rgba(8,11,32,0.82)",
            border: hot ? "1px solid rgba(255,170,90,0.4)" : "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.22)",
          }}
        >
          {sub.name}
        </span>
      </span>
    </button>
  );
}

/** 大カテゴリ選択後：中央ハブ＋軌道サブトピック（添付デザイン準拠） */
export function InteropSubOrbit({
  selected,
  subCategories,
  activityBySub,
  accent,
  iconFor,
  onBackToMap,
}: {
  selected: InteropCategory;
  subCategories: InteropSubCategory[];
  activityBySub: Map<string, InteropActivityStats>;
  accent: string;
  iconFor: (slug: string) => LucideIcon;
  onBackToMap: () => void;
}) {
  const router = useRouter();
  const Icon = iconFor(selected.slug);
  const emptyStats: InteropActivityStats = { postCount: 0, participantCount: 0 };
  const count = subCategories.length;

  const containerSize = useMemo(() => getOrbitContainerSize(count), [count]);
  const orbitRadius = useMemo(() => getOrbitRadiusPercent(count), [count]);

  return (
    <div
      className="absolute inset-0 flex items-center justify-center px-3 pb-8 pt-16 sm:pt-20"
      style={{ animation: "itmFadeIn 0.4s ease-out both" }}
    >
      <style>{FX_CSS}</style>
      <style>{INTEROP_PUYO_CSS}</style>

      <div
        className="relative aspect-square w-full shrink-0"
        style={{ width: containerSize, height: containerSize, maxHeight: "min(76vh, 680px)" }}
      >
        <span
          className="pointer-events-none absolute inset-[6%] rounded-full"
          style={{
            border: "1px dashed rgba(255,255,255,0.28)",
            boxShadow: `inset 0 0 40px ${accent}18`,
          }}
        />
        <span
          className="pointer-events-none absolute inset-[6%] rounded-full"
          style={{
            background: `radial-gradient(circle, ${accent}14 0%, transparent 68%)`,
          }}
        />

        <div className="absolute left-1/2 top-1/2 z-20 w-[min(46%,280px)] min-w-[200px] -translate-x-1/2 -translate-y-1/2">
          <button
            type="button"
            onClick={onBackToMap}
            className="group w-full rounded-3xl px-5 py-5 text-center transition-shadow duration-300 hover:shadow-[0_0_40px_rgba(100,150,255,0.18)] focus:outline-none"
            style={{
              background: "rgba(8,11,32,0.84)",
              border: `1px solid ${accent}55`,
              boxShadow: `0 0 28px ${accent}22, inset 0 1px 0 rgba(255,255,255,0.08)`,
              backdropFilter: "blur(12px)",
            }}
            aria-label="大カテゴリマップに戻る"
          >
            <Icon className="mx-auto mb-2 h-8 w-8" style={{ color: accent }} strokeWidth={1.8} />
            <p className="text-lg font-bold text-white">{selected.name}</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-white/55">
              {count === 0
                ? "トピックは準備中です。"
                : `${count}つのトピック · 盛り上がるほどぷよぷよ大きく`}
            </p>
            <span className="mt-3 inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/[0.06] px-3 py-1 text-[11px] font-bold text-white/70 transition group-hover:bg-white/15 group-hover:text-white">
              <ArrowLeft className="h-3 w-3" /> 大カテゴリマップに戻る
            </span>
          </button>
        </div>

        {subCategories.map((sub, i) => (
          <SubTopicOrb
            key={sub.id}
            sub={sub}
            index={i}
            total={count}
            orbitRadius={orbitRadius}
            accent={accent}
            stats={activityBySub.get(sub.id) ?? emptyStats}
            onNavigate={(id) => router.push(`/t/${id}`)}
          />
        ))}
      </div>
    </div>
  );
}
