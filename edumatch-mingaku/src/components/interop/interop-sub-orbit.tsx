"use client";

import { useMemo } from "react";
import { ArrowLeft, MessageCircle, type LucideIcon } from "lucide-react";
import {
  computeSubOrbDiameter,
  computeTopicOrbDiameter,
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

export type InteropSubCategory = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
};

/** 軌道に並べる汎用アイテム（ハブ＝展示カテゴリ／カテゴリ＝サブカテゴリ で共用） */
export type InteropOrbitItem = {
  id: string;
  name: string;
  /** 玉の中央アイコン（既定: MessageCircle） */
  icon?: LucideIcon;
  /** 玉の色（#RRGGBB）。トップマップの分類色と揃える。未指定なら accent を使用 */
  accentColor?: string;
  stats: InteropActivityStats;
  /** true なら投稿数ベースの視認性重視サイズ（サテライト内トピック等） */
  topicOrb?: boolean;
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
  item: InteropOrbitItem;
  index: number;
  total: number;
  orbitRadius: number;
  accent: string;
}) {
  const pos = orbitPosition(index, total, orbitRadius);
  const stats = item.stats;
  const baseSize = item.topicOrb ? computeTopicOrbDiameter(stats) : computeSubOrbDiameter(stats);
  const hot = isInteropHot(stats);
  const hint = formatActivityHint(stats);
  const intensity = computePuyoIntensity(stats);
  const iconSize = Math.max(20, baseSize * 0.32);
  const badgeFont = baseSize >= 130 ? 10 : 9;
  const Icon = item.icon ?? MessageCircle;
  const color = item.accentColor ?? accent; // 玉の色（分類色）
  // 揺れは控えめに（やかましさ回避）。hot でも大きくは揺らさない。
  const puyoStyle =
    intensity > 0.2
      ? puyoAnimationStyle(index * 5 + item.name.length, intensity * 0.28, false)
      : undefined;

  return (
    <button
      type="button"
      onClick={item.onActivate}
      className="group absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center focus:outline-none"
      style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
      aria-label={`${item.name} を開く`}
    >
      {/* ホバーグロー */}
      <span
        className="pointer-events-none absolute rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ inset: -20, background: `radial-gradient(circle, ${color}44 0%, transparent 65%)` }}
      />

      <span className="relative flex flex-col items-center">
        <span
          className={puyoStyle ? "interop-puyo relative grid place-items-center rounded-full" : "relative grid place-items-center rounded-full transition-[width,height,transform] duration-500 ease-out group-hover:scale-[1.08]"}
          style={{
            width: baseSize,
            height: baseSize,
            background: hot
              ? "radial-gradient(circle at 34% 28%, rgba(255,255,255,0.60) 0%, rgba(255,200,140,0.45) 40%, rgba(230,140,50,0.62) 100%)"
              : `radial-gradient(circle at 34% 28%, rgba(255,255,255,0.55) 0%, ${color}44 42%, ${color}77 100%)`,
            border: hot ? "1.5px solid rgba(255,190,120,0.80)" : `1.5px solid ${color}aa`,
            boxShadow: hot
              ? "0 0 28px rgba(255,140,60,0.40), 0 8px 24px rgba(30,60,140,0.30), inset 0 2px 14px rgba(255,255,255,0.50)"
              : `0 0 28px ${color}44, 0 8px 24px rgba(30,60,140,0.25), inset 0 2px 14px rgba(255,255,255,0.50)`,
            ...puyoStyle,
          }}
        >
          {/* 左上ハイライト */}
          <span
            className="pointer-events-none absolute rounded-full"
            style={{ top: "10%", left: "14%", width: "40%", height: "32%", background: "rgba(255,255,255,0.55)", filter: "blur(4px)", opacity: 0.6 }}
          />
          <Icon
            style={{ color: hot ? "#ffb870" : color, width: iconSize, height: iconSize, filter: hot ? undefined : `drop-shadow(0 0 4px ${color}77)` }}
            strokeWidth={1.7}
          />
          {hint && (
            <span
              className="absolute -bottom-1.5 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 py-0.5 font-bold shadow-md"
              style={{
                fontSize: badgeFont,
                background: hot ? "rgba(255,120,40,0.95)" : `${color}ee`,
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.25)",
              }}
            >
              {hint}
            </span>
          )}
        </span>

        <span
          className="mt-3 max-w-[min(34vw,148px)] rounded-xl px-3 py-1 text-center text-[11.5px] font-bold leading-snug text-white transition-all duration-200 group-hover:text-white"
          style={{
            background: hot
              ? "linear-gradient(135deg, rgba(12,18,44,0.92) 0%, rgba(90,50,0,0.52) 100%)"
              : `linear-gradient(135deg, rgba(8,11,32,0.92) 0%, ${color}2e 100%)`,
            border: hot ? "1px solid rgba(255,170,90,0.45)" : `1px solid ${color}44`,
            boxShadow: `0 4px 16px rgba(0,0,0,0.30), 0 0 10px ${color}22`,
          }}
        >
          {item.name}
        </span>
      </span>
    </button>
  );
}

/** 中央ハブ＋軌道アイテム。中央ボタン＝1つ上の階層へ戻る。 */
export function InteropSubOrbit({
  centerLabel,
  centerIcon: CenterIcon,
  centerHint,
  accent,
  items,
  backLabel,
  onBack,
}: {
  centerLabel: string;
  centerIcon: LucideIcon;
  centerHint?: string;
  accent: string;
  items: InteropOrbitItem[];
  backLabel: string;
  onBack: () => void;
}) {
  const count = items.length;
  const containerSize = useMemo(() => getOrbitContainerSize(count), [count]);
  const orbitRadius = useMemo(() => getOrbitRadiusPercent(count), [count]);
  const hint =
    centerHint ??
    (count === 0
      ? "準備中です。"
      : `${count}つのトピック · 盛り上がるほどぷよぷよ大きく`);

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
        {/* 軌道リング */}
        <span
          className="pointer-events-none absolute inset-[6%] rounded-full"
          style={{
            border: `1px solid ${accent}44`,
            boxShadow: `inset 0 0 40px ${accent}1a, 0 0 20px ${accent}12`,
          }}
        />
        <span
          className="pointer-events-none absolute inset-[6%] rounded-full"
          style={{
            border: "1px dashed rgba(255,255,255,0.12)",
          }}
        />
        <span
          className="pointer-events-none absolute inset-[6%] rounded-full"
          style={{
            background: `radial-gradient(circle, ${accent}18 0%, transparent 65%)`,
          }}
        />

        <div className="absolute left-1/2 top-1/2 z-20 w-[min(32%,200px)] min-w-[128px] -translate-x-1/2 -translate-y-1/2">
          {/* 中央グロー */}
          <span
            className="pointer-events-none absolute inset-[-20px] rounded-full"
            style={{ background: `radial-gradient(circle, ${accent}22 0%, transparent 65%)` }}
          />
          <button
            type="button"
            onClick={onBack}
            className="group relative w-full rounded-2xl px-3 py-3.5 text-center transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_32px_rgba(100,150,255,0.25)] focus:outline-none"
            style={{
              background: `linear-gradient(160deg, rgba(12,16,40,0.82) 0%, ${accent}18 100%)`,
              border: `1px solid ${accent}55`,
              boxShadow: `0 0 22px ${accent}22, 0 8px 28px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.10)`,
              backdropFilter: "blur(16px)",
            }}
            aria-label={backLabel}
          >
            <div
              className="pointer-events-none absolute inset-x-4 top-0 h-px rounded-full"
              style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.40) 50%, transparent)" }}
            />
            <CenterIcon className="mx-auto mb-1.5 h-6 w-6" style={{ color: accent, filter: `drop-shadow(0 0 6px ${accent}88)` }} strokeWidth={1.5} />
            <p className="text-[12px] font-bold text-white/90">{centerLabel}</p>
            {centerHint && <p className="mt-0.5 text-[9.5px] leading-tight text-white/50">{centerHint}</p>}
            <span className="mt-2.5 inline-flex items-center gap-1 rounded-full border border-white/18 bg-white/[0.06] px-2.5 py-0.5 text-[10px] font-medium text-white/55 transition group-hover:bg-white/12 group-hover:text-white/80">
              <ArrowLeft className="h-2.5 w-2.5" /> {backLabel}
            </span>
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
