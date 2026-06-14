"use client";

import { useMemo } from "react";
import { ArrowLeft, MessageCircle, type LucideIcon } from "lucide-react";
import { ForumHotFlame } from "@/components/community/forum-hot-flame";
import {
  computeSubOrbDiameter,
  formatActivityHint,
  isInteropHot,
  type InteropActivityStats,
} from "@/lib/forum-activity";
import {
  computePuyoIntensity,
  getOrbitContainerSize,
  getOrbitRadiusPercent,
  INTEROP_PUYO_CSS,
  puyoAnimationStyle,
} from "@/lib/forum-puyopuyo";

export type InteropSubCategory = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
};

/** 軌道に並べる汎用アイテム（ハブ＝展示カテゴリ／カテゴリ＝サブカテゴリ で共用） */
export type ForumOrbitItem = {
  id: string;
  name: string;
  /** 玉の中央アイコン（既定: MessageCircle） */
  icon?: LucideIcon;
  stats: InteropActivityStats;
  onActivate: () => void;
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
  item,
  index,
  total,
  orbitRadius,
  accent,
}: {
  item: ForumOrbitItem;
  index: number;
  total: number;
  orbitRadius: number;
  accent: string;
}) {
  const pos = orbitPosition(index, total, orbitRadius);
  const stats = item.stats;
  const baseSize = computeSubOrbDiameter(stats);
  const hot = isInteropHot(stats);
  const hint = formatActivityHint(stats);
  const intensity = computePuyoIntensity(stats);
  const iconSize = Math.max(20, baseSize * 0.32);
  const Icon = item.icon ?? MessageCircle;
  const puyoStyle =
    intensity > 0.08 || hot
      ? puyoAnimationStyle(index * 5 + item.name.length, intensity * 0.65, hot)
      : undefined;

  return (
    <button
      type="button"
      onClick={item.onActivate}
      className="group absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center focus:outline-none"
      style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
      aria-label={`${item.name} を開く`}
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
          <Icon
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
          {item.name}
        </span>
      </span>
    </button>
  );
}

/** 中央ハブ＋軌道アイテム。中央ボタン＝1つ上の階層へ戻る。 */
export function ForumSubOrbit({
  centerLabel,
  centerIcon: CenterIcon,
  accent,
  items,
  backLabel,
  onBack,
  hideBack = false,
}: {
  centerLabel: string;
  centerIcon: LucideIcon;
  accent: string;
  items: ForumOrbitItem[];
  backLabel: string;
  onBack: () => void;
  hideBack?: boolean;
}) {
  const count = items.length;
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

        <div className="absolute left-1/2 top-1/2 z-20 w-[min(32%,200px)] min-w-[120px] -translate-x-1/2 -translate-y-1/2">
          <button
            type="button"
            onClick={onBack}
            className="group w-full rounded-full px-3 py-3 text-center transition-shadow duration-300 hover:shadow-[0_0_28px_rgba(100,150,255,0.20)] focus:outline-none"
            style={{
              background: "rgba(8,11,32,0.72)",
              border: `1px solid ${accent}44`,
              boxShadow: `0 0 18px ${accent}18, inset 0 1px 0 rgba(255,255,255,0.06)`,
              backdropFilter: "blur(12px)",
            }}
            aria-label={backLabel}
          >
            <CenterIcon className="mx-auto mb-1 h-5 w-5" style={{ color: accent }} strokeWidth={1.6} />
            <p className="text-[11px] font-semibold text-white/80">{centerLabel}</p>
            {!hideBack && (
              <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.05] px-2.5 py-0.5 text-[10px] font-medium text-white/55 transition group-hover:bg-white/12 group-hover:text-white/80">
                <ArrowLeft className="h-2.5 w-2.5" /> {backLabel}
              </span>
            )}
          </button>
        </div>

        {items.map((item, i) => (
          <SubTopicOrb
            key={item.id}
            item={item}
            index={i}
            total={count}
            orbitRadius={orbitRadius}
            accent={accent}
          />
        ))}
      </div>
    </div>
  );
}
