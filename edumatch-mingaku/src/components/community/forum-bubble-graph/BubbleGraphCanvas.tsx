"use client";

import { useRouter } from "next/navigation";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { GraphEdges } from "./GraphEdges";
import type { BubbleConnection, BubbleGraphNode } from "./types";
import { useBubbleGraph } from "./useBubbleGraph";

function BubbleNode({
  node,
  x,
  y,
  onHover,
  onLeave,
}: {
  node: BubbleGraphNode;
  x: number;
  y: number;
  onHover: () => void;
  onLeave: () => void;
}) {
  const inner = (
    <div
      className={cn(
        "relative flex h-full w-full flex-col items-center justify-center rounded-full text-center shadow-[0_12px_30px_-8px_rgba(0,0,0,0.25)] transition-transform hover:scale-[1.03]",
        node.isPrimary && "ring-2 ring-primary/50 ring-offset-2 ring-offset-transparent"
      )}
      style={{ backgroundColor: node.backgroundColor }}
    >
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
}: {
  nodes: BubbleGraphNode[];
  connections: BubbleConnection[];
  layoutMode: "category" | "subcategory";
  className?: string;
  canvasBackgroundColor?: string;
}) {
  const router = useRouter();
  const isSubcategory = layoutMode === "subcategory";

  const graph = useBubbleGraph({
    nodes,
    layoutMode,
    spokeFromPrimary: isSubcategory,
    onBubbleNavigate: (href) => router.push(href),
    panEnabled: !isSubcategory,
  });

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
      className={cn(
        "relative h-full w-full overflow-hidden touch-none",
        !isSubcategory && (graph.isPanning ? "cursor-grabbing" : "cursor-grab"),
        className
      )}
      style={canvasBackgroundColor ? { backgroundColor: canvasBackgroundColor } : undefined}
      onPointerDown={isSubcategory ? undefined : graph.handleViewportPanStart}
      onPointerMove={isSubcategory ? undefined : graph.handleViewportPanMove}
      onPointerUp={isSubcategory ? undefined : graph.handleViewportPanEnd}
      onPointerCancel={isSubcategory ? undefined : graph.handleViewportPanEnd}
    >
      {!isSubcategory && (
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
          clipPath: isSubcategory ? "ellipse(44% 46% at 50% 50%)" : undefined,
        }}
      >
        <GraphEdges
          points={graph.basePoints}
          floatOffsets={graph.floatOffsets}
          connections={allConnections}
          hoveredId={graph.hoveredId}
          graphWidth={graph.graphDimensions.width}
          graphHeight={graph.graphDimensions.height}
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
              onHover={() => graph.setHoveredId(node.id)}
              onLeave={() => graph.setHoveredId(null)}
            />
          );
        })}
      </div>
    </div>
  );
}
