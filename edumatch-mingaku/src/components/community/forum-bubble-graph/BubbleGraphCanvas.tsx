"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { INTEROP_PUYO_CSS, puyoAnimationStyle } from "@/lib/interop-puyopuyo";
import { GraphEdges } from "./GraphEdges";
import { ForumHotFlame } from "@/components/community/forum-hot-flame";
import type { BubbleConnection, BubbleGraphNode } from "./types";
import { useBubbleGraph } from "./useBubbleGraph";

function BubbleNode({
  node,
  x,
  y,
  puyopuyo,
  onHover,
  onLeave,
}: {
  node: BubbleGraphNode;
  x: number;
  y: number;
  puyopuyo?: boolean;
  onHover: () => void;
  onLeave: () => void;
}) {
  const puyoStyle =
    puyopuyo
      ? puyoAnimationStyle(
          node.animationSeed ?? node.label.length,
          node.puyoIntensity ?? 0,
          node.isHot
        )
      : undefined;

  const inner = (
    <div
      className={cn(
        "relative flex h-full w-full flex-col items-center justify-center rounded-full text-center shadow-[0_12px_30px_-8px_rgba(0,0,0,0.25)]",
        puyopuyo ? "interop-puyo" : "transition-transform hover:scale-[1.03]",
        node.isPrimary && "ring-2 ring-primary/50 ring-offset-2 ring-offset-transparent",
        node.isHot && "ring-2 ring-orange-400/70 ring-offset-2 ring-offset-transparent"
      )}
      style={{
        backgroundColor: node.backgroundColor,
        boxShadow: node.isHot
          ? "0 0 0 1.5px rgba(255,190,130,0.6), 0 0 40px rgba(255,130,50,0.5), inset 0 2px 14px rgba(255,255,255,0.55)"
          : "0 0 0 1.5px rgba(255,255,255,0.4), 0 0 26px rgba(150,190,255,0.45), 0 12px 30px -8px rgba(20,40,110,0.30), inset 0 2px 14px rgba(255,255,255,0.55)",
        ...puyoStyle,
      }}
    >
      {node.isHot && (
        <span className="absolute -right-1 -top-1 z-20">
          <ForumHotFlame size="sm" />
        </span>
      )}
      {node.isPrimary && (
        <span className="absolute -top-1 left-1/2 z-10 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold text-primary-foreground shadow-sm">
          メイン
        </span>
      )}
      {node.icon ? <span className="mb-0.5 opacity-80">{node.icon}</span> : null}
      <span
        className="px-2 font-bold leading-tight text-foreground/90"
        style={{ fontSize: Math.max(10, node.diameter * 0.09) }}
      >
        {node.label}
      </span>
      {node.sublabel ? (
        <span
          className="mt-0.5 line-clamp-2 px-2 leading-tight text-foreground/55"
          style={{ fontSize: Math.max(8, node.diameter * 0.065) }}
        >
          {node.sublabel}
        </span>
      ) : null}
    </div>
  );

  return (
    <div
      role="button"
      tabIndex={0}
      data-bubble-id={node.id}
      aria-label={node.label}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (node.href) return;
          node.onActivate?.();
        }
      }}
      className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer touch-none select-none"
      style={{
        left: x,
        top: y,
        width: node.diameter,
        height: node.diameter,
        zIndex: node.isPrimary ? 30 : 10,
      }}
    >
      {inner}
    </div>
  );
}

export function BubbleGraphCanvas({
  nodes,
  connections,
  layoutMode,
  className,
  canvasBackgroundColor,
  edgeTheme = "dark",
  hideZoomControls = false,
  puyopuyo = false,
  fillViewport = false,
  circularLayout,
  graphSize,
  interopTopLayout,
}: {
  nodes: BubbleGraphNode[];
  connections: BubbleConnection[];
  layoutMode: "category" | "subcategory" | "interop-top";
  className?: string;
  canvasBackgroundColor?: string;
  edgeTheme?: "dark" | "light";
  hideZoomControls?: boolean;
  puyopuyo?: boolean;
  fillViewport?: boolean;
  circularLayout?: { spreadFactor: number; radiusRatio: number };
  graphSize?: { width: number; height: number };
  interopTopLayout?: { centerId: string; innerIds: string[]; outerIds: string[] };
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const isSubcategory = layoutMode === "subcategory";

  const graph = useBubbleGraph({
    nodes,
    layoutMode,
    spokeFromPrimary: isSubcategory,
    onBubbleNavigate: (href) => router.push(href),
    panEnabled: !isSubcategory,
    fillViewport,
    circularLayout,
    graphSize,
    interopTopLayout,
  });

  useEffect(() => {
    if (!fillViewport || !containerRef.current) return;
    const el = containerRef.current;
    const { computeFitScale, setScale } = graph;
    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      setScale(computeFitScale(width, height));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fillViewport, graph, nodes]);

  const allConnections = [...connections, ...graph.spokeConnections];

  if (nodes.length === 0) {
    return (
      <div className={cn("flex h-full items-center justify-center text-sm text-muted-foreground", className)}>
        表示するカテゴリがありません
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative h-full w-full overflow-hidden touch-none",
        !isSubcategory && (graph.isPanning ? "cursor-grabbing" : "cursor-grab"),
        className
      )}
      style={canvasBackgroundColor ? { backgroundColor: canvasBackgroundColor } : undefined}
      onPointerDown={graph.handleViewportPanStart}
      onPointerMove={graph.handleViewportPanMove}
      onPointerUp={graph.handleViewportPanEnd}
      onPointerCancel={graph.handleViewportPanEnd}
    >
      {puyopuyo && <style>{INTEROP_PUYO_CSS}</style>}
      {!isSubcategory && !hideZoomControls && (
      <div
        className="pointer-events-auto absolute bottom-4 right-4 z-40 flex items-center gap-1.5 rounded-2xl border-2 border-foreground/10 bg-background px-2 py-2 shadow-lg"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="表示をリセット"
          className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-foreground transition-colors hover:bg-muted/80"
          onClick={graph.resetLayout}
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="縮小"
          disabled={graph.scale <= graph.MAP_ZOOM_MIN + 1e-6}
          className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-foreground transition-colors hover:bg-muted/80 disabled:opacity-35"
          onClick={() => graph.applyZoom(graph.scale - graph.MAP_ZOOM_STEP)}
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="拡大"
          disabled={graph.scale >= graph.MAP_ZOOM_MAX - 1e-6}
          className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-foreground transition-colors hover:bg-muted/80 disabled:opacity-35"
          onClick={() => graph.applyZoom(graph.scale + graph.MAP_ZOOM_STEP)}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      )}

      <div
        className="pointer-events-none absolute left-1/2 top-1/2"
        style={{
          width: graph.graphDimensions.width,
          height: graph.graphDimensions.height,
          transform: `translate(calc(-50% + ${graph.pan.x}px), calc(-50% + ${graph.pan.y}px)) scale(${graph.scale})`,
          transformOrigin: "center center",
          transition: graph.isPanning ? "none" : "transform 380ms cubic-bezier(.2,.8,.2,1)",
        }}
      >
        <GraphEdges
          points={graph.basePoints}
          floatOffsets={graph.floatOffsets}
          connections={allConnections}
          hoveredId={graph.hoveredId}
          graphWidth={graph.graphDimensions.width}
          graphHeight={graph.graphDimensions.height}
          edgeTheme={edgeTheme}
        />

        {nodes.map((node) => {
          const point = graph.basePoints[node.id];
          if (!point) return null;
          const float = graph.getFloatOffset(node.id);
          const x = point.x + float.x;
          const y = point.y + float.y;

          return (
            <BubbleNode
              key={node.id}
              node={node}
              x={x}
              y={y}
              puyopuyo={puyopuyo}
              onHover={() => graph.setHoveredId(node.id)}
              onLeave={() => graph.setHoveredId(null)}
            />
          );
        })}
      </div>
    </div>
  );
}
