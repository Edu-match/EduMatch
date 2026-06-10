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
import {
  INTEROP_PRIORITY_TOPICS,
  priorityTopicId,
  sortTopicsForBurst,
} from "@/lib/interop-priority-topics";
import { computePuyoIntensity, getInteropTopGraphDimensions } from "@/lib/interop-puyopuyo";
import type { InteropCategory } from "@/components/interop/interop-category-bubble-map";

const FALLBACK_COLORS = ["#BDE8FB", "#FBC9D4", "#C7EFC0", "#C9D4F6", "#F6EBB0", "#E7CCF4"];

function computeTopConnections(
  centerId: string,
  innerIds: string[],
  outerIds: string[]
): BubbleConnection[] {
  const edges: BubbleConnection[] = [];
  for (const id of innerIds) {
    edges.push({ from: centerId, to: id, weight: 2 });
  }
  for (const id of outerIds) {
    edges.push({ from: centerId, to: id, weight: 1 });
  }
  if (innerIds.length > 1) {
    for (let i = 0; i < innerIds.length; i += 1) {
      edges.push({
        from: innerIds[i],
        to: innerIds[(i + 1) % innerIds.length],
        weight: 1,
      });
    }
  }
  return edges;
}

/** 特設トップ：中心=インタロップ、内側=既存カテゴリ、外周=◎議論トピック */
export function InteropTopBubbleMap({
  categories,
  activityByCategory,
  iconFor,
  onSelectCategory,
}: {
  categories: InteropCategory[];
  activityByCategory: Map<string, InteropActivityStats>;
  iconFor: (slug: string) => LucideIcon;
  onSelectCategory: (cat: InteropCategory) => void;
}) {
  const interopCat =
    categories.find((c) => c.slug === "interop") ??
    categories.find((c) => c.isPrimary) ??
    categories[0];
  const innerCategories = categories.filter((c) => c.id !== interopCat?.id);
  const priorityTopics = useMemo(() => sortTopicsForBurst(INTEROP_PRIORITY_TOPICS), []);

  const nodeCount = 1 + innerCategories.length + priorityTopics.length;
  const fillLayout = useMemo(() => getInteropTopGraphDimensions(nodeCount), [nodeCount]);
  const diameters = useMemo(
    () =>
      computeBubbleDiameter(nodeCount, {
        max: 168,
        min: 58,
        primaryMultiplier: 1.35,
      }),
    [nodeCount]
  );

  const interopTopLayout = useMemo(() => {
    if (!interopCat) return undefined;
    return {
      centerId: interopCat.id,
      innerIds: innerCategories.map((c) => c.id),
      outerIds: priorityTopics.map((t) => priorityTopicId(t.no)),
    };
  }, [interopCat, innerCategories, priorityTopics]);

  const nodes: BubbleGraphNode[] = useMemo(() => {
    if (!interopCat || !interopTopLayout) return [];

    const result: BubbleGraphNode[] = [];
    const interopStats = activityByCategory.get(interopCat.id) ?? {
      postCount: 0,
      participantCount: 0,
    };
    const interopDiameter = computeCategoryActivityDiameter(
      diameters.primary,
      interopStats
    );
    const InteropIcon = iconFor(interopCat.slug);

    result.push({
      id: interopCat.id,
      label: interopCat.name,
      sublabel: interopCat.description || "Interop Tokyo 2026",
      diameter: interopDiameter,
      backgroundColor: interopCat.color || "#C9D4F6",
      isPrimary: true,
      isHot: isInteropHot(interopStats),
      animationSeed: interopCat.name.length,
        puyoIntensity: computePuyoIntensity(interopStats) * 0.55,
      icon: (
        <InteropIcon
          className="opacity-90"
          style={{
            width: Math.max(22, interopDiameter * 0.16),
            height: Math.max(22, interopDiameter * 0.16),
          }}
          strokeWidth={2}
        />
      ),
      onActivate: () => onSelectCategory(interopCat),
    });

    innerCategories.forEach((cat, i) => {
      const stats = activityByCategory.get(cat.id) ?? { postCount: 0, participantCount: 0 };
      const diameter = computeCategoryActivityDiameter(diameters.default * 0.92, stats);
      const hot = isInteropHot(stats);
      const Icon = iconFor(cat.slug);
      const activityHint = formatActivityHint(stats);

      result.push({
        id: cat.id,
        label: cat.name,
        sublabel: activityHint ?? (cat.description || undefined),
        diameter,
        backgroundColor: cat.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
        isHot: hot,
        animationSeed: i * 3 + cat.name.length,
        puyoIntensity: computePuyoIntensity(stats) * 0.5,
        icon: (
          <Icon
            className="opacity-90"
            style={{
              width: Math.max(14, diameter * 0.14),
              height: Math.max(14, diameter * 0.14),
            }}
            strokeWidth={2}
          />
        ),
        onActivate: () => onSelectCategory(cat),
      });
    });

    priorityTopics.forEach((topic, i) => {
      const topicDiameter = Math.max(52, diameters.default * 0.62);
      result.push({
        id: priorityTopicId(topic.no),
        label: topic.category,
        sublabel: topic.majorLabel,
        diameter: topicDiameter,
        backgroundColor: topic.color,
        animationSeed: topic.no * 7 + i,
        puyoIntensity: 0.06 + (i % 5) * 0.018,
        href: "/community",
      });
    });

    return result;
  }, [
    activityByCategory,
    diameters.default,
    diameters.primary,
    iconFor,
    innerCategories,
    interopCat,
    interopTopLayout,
    onSelectCategory,
    priorityTopics,
  ]);

  const connections = useMemo(() => {
    if (!interopTopLayout) return [];
    return computeTopConnections(
      interopTopLayout.centerId,
      interopTopLayout.innerIds,
      interopTopLayout.outerIds
    );
  }, [interopTopLayout]);

  if (!interopCat || !interopTopLayout) return null;

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
        layoutMode="interop-top"
        className="h-full"
        edgeTheme="light"
        puyopuyo
        fillViewport
        graphSize={{ width: fillLayout.width, height: fillLayout.height }}
        interopTopLayout={interopTopLayout}
      />

      <div className="pointer-events-none absolute bottom-20 left-4 z-20 flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[11px] text-white/85 shadow-sm backdrop-blur md:bottom-6">
        <Move className="h-3.5 w-3.5" />
        中央のインタロップから展示情報へ · 外周の◎トピックは井戸端へ
      </div>
    </div>
  );
}
