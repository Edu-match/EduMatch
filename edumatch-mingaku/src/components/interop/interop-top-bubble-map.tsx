"use client";

import { useMemo } from "react";
import { Move } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BubbleGraphCanvas } from "@/components/community/forum-bubble-graph/BubbleGraphCanvas";
import type { BubbleConnection, BubbleGraphNode } from "@/components/community/forum-bubble-graph/types";
import {
  computeCategoryActivityDiameter,
  isInteropHot,
  type InteropActivityStats,
} from "@/lib/interop-activity";
import {
  INTEROP_PRIORITY_TOPICS,
  priorityTopicId,
  sortTopicsForBurst,
  type InteropPriorityTopic,
} from "@/lib/interop-priority-topics";
import { computePuyoIntensity, getInteropTopGraphDimensions } from "@/lib/interop-puyopuyo";
import type { InteropCategory } from "@/components/interop/interop-category-bubble-map";

const TOP_CENTER_DIAMETER = 160;
const TOP_TOPIC_DIAMETER = 112;

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

/** 特設トップ：中心=インタロップ、外周=◎議論トピック（タップでトピック選択軌道へ） */
export function InteropTopBubbleMap({
  categories,
  activityByCategory,
  iconFor,
  onSelectCategory,
  onSelectTopic,
}: {
  categories: InteropCategory[];
  activityByCategory: Map<string, InteropActivityStats>;
  iconFor: (slug: string) => LucideIcon;
  onSelectCategory: (cat: InteropCategory) => void;
  onSelectTopic: (topic: InteropPriorityTopic) => void;
}) {
  const interopCat =
    categories.find((c) => c.slug === "interop") ??
    categories.find((c) => c.isPrimary) ??
    categories[0];
  const priorityTopics = useMemo(() => sortTopicsForBurst(INTEROP_PRIORITY_TOPICS), []);

  const nodeCount = 1 + priorityTopics.length;
  const fillLayout = useMemo(() => getInteropTopGraphDimensions(nodeCount), [nodeCount]);

  const interopTopLayout = useMemo(() => {
    if (!interopCat) return undefined;
    return {
      centerId: interopCat.id,
      innerIds: [] as string[],
      outerIds: priorityTopics.map((t) => priorityTopicId(t.no)),
    };
  }, [interopCat, priorityTopics]);

  const nodes: BubbleGraphNode[] = useMemo(() => {
    if (!interopCat || !interopTopLayout) return [];

    const result: BubbleGraphNode[] = [];
    const interopStats = activityByCategory.get(interopCat.id) ?? {
      postCount: 0,
      participantCount: 0,
    };
    const interopDiameter = computeCategoryActivityDiameter(TOP_CENTER_DIAMETER, interopStats);
    const InteropIcon = iconFor(interopCat.slug);

    result.push({
      id: interopCat.id,
      label: interopCat.name,
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

    priorityTopics.forEach((topic, i) => {
      result.push({
        id: priorityTopicId(topic.no),
        label: topic.category,
        diameter: TOP_TOPIC_DIAMETER,
        backgroundColor: topic.color,
        animationSeed: topic.no * 7 + i,
        puyoIntensity: 0.06 + (i % 5) * 0.018,
        onActivate: () => onSelectTopic(topic),
      });
    });

    return result;
  }, [activityByCategory, iconFor, interopCat, interopTopLayout, onSelectCategory, onSelectTopic, priorityTopics]);

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
        hideSublabel
        fitMargin={0.035}
        fillViewport
        graphSize={{ width: fillLayout.width, height: fillLayout.height }}
        interopTopLayout={interopTopLayout}
      />

      <div className="pointer-events-none absolute bottom-20 left-4 z-20 flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[11px] text-white/85 shadow-sm backdrop-blur md:bottom-6">
        <Move className="h-3.5 w-3.5" />
        中央のインタロップから展示情報へ · 外周の◎トピックはひろばへ
      </div>
    </div>
  );
}
