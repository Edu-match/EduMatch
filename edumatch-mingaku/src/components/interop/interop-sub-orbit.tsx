"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  LayoutGrid,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";
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
  puyoScaleVars,
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
    0%,100% { opacity: 0.35; transform: translate(-50%, -50%) scale(1); }
    50%      { opacity: 0.65; transform: translate(-50%, -50%) scale(1.06); }
  }
  @keyframes itmHotGlow {
    0%,100% { box-shadow: 0 0 20px var(--orb-glow), 0 4px 24px rgba(0,0,0,0.35); }
    50%      { box-shadow: 0 0 36px var(--orb-glow-hot), 0 4px 28px rgba(255,120,40,0.25); }
  }
  @keyframes itmFadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

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
  const ang = (360 / Math.max(total, 1)) * index;
  const a = (ang - 90) * (Math.PI / 180);
  const left = 50 + orbitRadius * Math.cos(a);
  const top = 50 + orbitRadius * Math.sin(a) * 0.92;
  const baseSize = computeSubOrbDiameter(stats);
  const hot = isInteropHot(stats);
  const hint = formatActivityHint(stats);
  const intensity = computePuyoIntensity(stats);
  const iconSize = Math.max(18, baseSize * 0.28);
  const puyoStyle = puyoAnimationStyle(index * 5 + sub.name.length, intensity, hot);
  const puyoAnim = hot
    ? `${puyoStyle.animation}, itmHotGlow 2.8s ease-in-out infinite`
    : puyoStyle.animation;

  return (
    <button
      type="button"
      onClick={() => onNavigate(sub.id)}
      className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center focus:outline-none"
      style={{ left: `${left}%`, top: `${top}%` }}
      aria-label={`${sub.name} を開く`}
    >
      <span className="relative flex flex-col items-center">
        {hot && (
          <span
            className="pointer-events-none absolute left-1/2 top-1/2 rounded-full"
            style={{
              width: baseSize + 32,
              height: baseSize + 32,
              transform: "translate(-50%, -50%)",
              border: `1px dashed ${accent}88`,
              animation: `itmOrbitPulse ${2.4 + index * 0.2}s ease-in-out infinite`,
            }}
          />
        )}

        <span
          className="interop-puyo relative grid place-items-center rounded-full text-white group-hover:brightness-110 group-active:brightness-95"
          style={{
            width: baseSize,
            height: baseSize,
            ["--orb-glow" as string]: `${accent}44`,
            ["--orb-glow-hot" as string]: "rgba(255,130,50,0.55)",
            background: hot
              ? `radial-gradient(circle at 38% 28%, rgba(255,220,180,0.28) 0%, rgba(255,255,255,0.08) 38%, rgba(10,14,40,0.9) 100%)`
              : `radial-gradient(circle at 38% 28%, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 42%, rgba(10,14,40,0.88) 100%)`,
            border: hot ? "1px solid rgba(255,170,90,0.75)" : `1px solid ${accent}77`,
            animation: puyoAnim,
            ...puyoScaleVars(intensity, hot),
          }}
        >
          <MessageCircle
            style={{ color: hot ? "#ffb366" : accent, width: iconSize, height: iconSize }}
            strokeWidth={1.8}
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
          className="mt-2 max-w-[min(32vw,140px)] rounded-full px-2.5 py-0.5 text-center text-[11px] font-bold leading-tight text-white/90 backdrop-blur-sm"
          style={{
            background: "rgba(8,11,32,0.78)",
            border: hot ? "1px solid rgba(255,170,90,0.45)" : "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {sub.name}
        </span>
      </span>
    </button>
  );
}

/** 大カテゴリ選択後のサブカテゴリ・軌道UI */
export function InteropSubOrbit({
  selected,
  categories,
  subCategories,
  activityBySub,
  accent,
  iconFor,
  onSelectCategory,
  onBackToMap,
}: {
  selected: InteropCategory;
  categories: InteropCategory[];
  subCategories: InteropSubCategory[];
  activityBySub: Map<string, InteropActivityStats>;
  accent: string;
  iconFor: (slug: string) => LucideIcon;
  onSelectCategory: (cat: InteropCategory) => void;
  onBackToMap: () => void;
}) {
  const router = useRouter();
  const Icon = iconFor(selected.slug);
  const emptyStats: InteropActivityStats = { postCount: 0, participantCount: 0 };
  const count = subCategories.length;

  const containerSize = useMemo(() => getOrbitContainerSize(count), [count]);
  const orbitRadius = useMemo(() => getOrbitRadiusPercent(count), [count]);
  const hubPuyo = puyoAnimationStyle(selected.name.length, 0.15, false);

  return (
    <div className="absolute inset-0" style={{ animation: "itmFadeIn 0.35s ease-out both" }}>
      <style>{FX_CSS}</style>
      <style>{INTEROP_PUYO_CSS}</style>

      <div className="absolute inset-x-0 bottom-6 z-30 flex justify-center px-4">
        <div className="flex max-w-full items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={onBackToMap}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/20 bg-white/[0.08] px-3 py-1.5 text-[11px] font-bold text-white/80 backdrop-blur transition-all hover:bg-white/15 focus:outline-none"
            aria-label="大カテゴリマップに戻る"
          >
            <LayoutGrid className="h-3 w-3 shrink-0" />
            全体
          </button>
          {categories.map((cat) => {
            const CatIcon = iconFor(cat.slug);
            const active = selected.id === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold text-white transition-all focus:outline-none"
                style={{
                  background: active ? `${cat.color || accent}33` : "rgba(255,255,255,0.05)",
                  border: active ? `1px solid ${cat.color || accent}88` : "1px solid rgba(255,255,255,0.12)",
                  opacity: active ? 1 : 0.65,
                }}
                aria-current={active ? "page" : undefined}
              >
                <CatIcon className="h-3 w-3 shrink-0" />
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="absolute inset-x-0 top-[38%] flex -translate-y-1/2 justify-center px-2 sm:top-[42%]">
        <div
          className="relative aspect-square w-full"
          style={{ width: containerSize, height: containerSize, maxHeight: "min(72vh, 880px)" }}
        >
          <span
            className="absolute inset-[4%] rounded-full"
            style={{
              border: `1px dashed ${accent}55`,
              boxShadow: `inset 0 0 48px ${accent}14`,
            }}
          />
          <span
            className="pointer-events-none absolute inset-[4%] rounded-full opacity-50"
            style={{
              background: `radial-gradient(circle, ${accent}22 0%, transparent 70%)`,
            }}
          />

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

      <div className="absolute left-1/2 top-[38%] z-20 w-[min(48vmin,320px)] -translate-x-1/2 -translate-y-1/2 text-center sm:top-[42%]">
        <button
          type="button"
          onClick={onBackToMap}
          className="interop-puyo group w-full rounded-3xl px-5 py-5 text-center focus:outline-none"
          style={{
            background: "rgba(8,11,32,0.82)",
            border: `1px solid ${accent}66`,
            boxShadow: `0 0 32px ${accent}28, inset 0 1px 0 rgba(255,255,255,0.08)`,
            backdropFilter: "blur(10px)",
            ...hubPuyo,
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
    </div>
  );
}
