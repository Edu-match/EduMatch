"use client";

import { useMemo } from "react";
import { Move } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BubbleGraphCanvas } from "@/components/community/forum-bubble-graph/BubbleGraphCanvas";
import { computeBubbleDiameter } from "@/components/community/forum-bubble-graph/layout";
import type { BubbleConnection, BubbleGraphNode } from "@/components/community/forum-bubble-graph/types";
import {
  computeCategoryActivityDiameter,
  formatActivityHint,
  isInteropHot,
  type InteropActivityStats,
} from "@/lib/interop-activity";
import { computePuyoIntensity, getFillGraphDimensions } from "@/lib/interop-puyopuyo";

export type InteropCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  isPrimary: boolean;
};

const FALLBACK_COLORS = ["#BDE8FB", "#FBC9D4", "#C7EFC0", "#C9D4F6", "#F6EBB0", "#E7CCF4"];

function computeInteropCategoryConnections(categories: InteropCategory[]): BubbleConnection[] {
  if (categories.length <= 1) return [];
  const primary = categories.find((c) => c.isPrimary);
  const sorted = [...categories];
  const edges: BubbleConnection[] = [];

  for (let i = 0; i < sorted.length; i += 1) {
    const a = sorted[i];
    const b = sorted[(i + 1) % sorted.length];
    edges.push({ from: a.id, to: b.id, weight: 1 });
  }

  if (primary) {
    for (const cat of categories) {
      if (cat.id === primary.id) continue;
      edges.push({ from: primary.id, to: cat.id, weight: 2 });
    }
  }

  return edges;
}

/** Preview井戸端と同系統の大カテゴリ・バブルマップ（青グラデ＋パステル玉） */
export function InteropCategoryBubbleMap({
  categories,
  activityByCategory,
  iconFor,
  onSelect,
}: {
  categories: InteropCategory[];
  activityByCategory: Map<string, InteropActivityStats>;
  iconFor: (slug: string) => LucideIcon;
  onSelect: (cat: InteropCategory) => void;
}) {
  const diameters = useMemo(() => computeBubbleDiameter(categories.length), [categories.length]);
  const connections = useMemo(() => computeInteropCategoryConnections(categories), [categories]);
  const fillLayout = useMemo(() => getFillGraphDimensions(categories.length), [categories.length]);

  const nodes: BubbleGraphNode[] = useMemo(
    () =>
      categories.map((cat, i) => {
        const stats = activityByCategory.get(cat.id) ?? { postCount: 0, participantCount: 0 };
        const base = cat.isPrimary ? diameters.primary : diameters.default;
        const diameter = computeCategoryActivityDiameter(base, stats);
        const hot = isInteropHot(stats);
        const Icon = iconFor(cat.slug);
        const activityHint = formatActivityHint(stats);
        const puyoIntensity = computePuyoIntensity(stats);

        return {
          id: cat.id,
          label: cat.name,
          sublabel: activityHint ?? (cat.description || undefined),
          diameter,
          backgroundColor: cat.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
          isPrimary: cat.isPrimary,
          isHot: hot,
          animationSeed: i * 3 + cat.name.length,
          puyoIntensity,
          icon: (
            <Icon
              className="opacity-90"
              style={{
                width: Math.max(16, diameter * 0.14),
                height: Math.max(16, diameter * 0.14),
              }}
              strokeWidth={2}
            />
          ),
          onActivate: () => onSelect(cat),
        };
      }),
    [categories, activityByCategory, diameters.default, diameters.primary, iconFor, onSelect]
  );

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #33529e 0%, #4a78d8 52%, #7aa3f0 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 44%, rgba(225,238,255,0.28) 0%, rgba(120,160,240,0.10) 40%, transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "38px 38px",
          maskImage: "radial-gradient(ellipse at 50% 50%, #000 35%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 50%, #000 35%, transparent 78%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 60%, rgba(28,48,120,0.30) 100%)",
        }}
      />

      <BubbleGraphCanvas
        nodes={nodes}
        connections={connections}
        layoutMode="category"
        className="h-full"
        edgeTheme="light"
        puyopuyo
        fillViewport
        graphSize={{ width: fillLayout.width, height: fillLayout.height }}
        circularLayout={{
          spreadFactor: fillLayout.spreadFactor,
          radiusRatio: fillLayout.radiusRatio,
        }}
      />

      <div className="pointer-events-none absolute bottom-20 left-4 z-20 flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[11px] text-white/85 shadow-sm backdrop-blur md:bottom-6">
        <Move className="h-3.5 w-3.5" />
        ぷよぷよと膨らむ · 盛り上がるほど大きく · 件数に応じて画面いっぱいに広がります
      </div>
    </div>
  );
}
