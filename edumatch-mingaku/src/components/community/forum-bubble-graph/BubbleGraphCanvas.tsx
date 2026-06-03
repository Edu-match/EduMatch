"use client";

import type { PointerEvent } from "react";
import Link from "next/link";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { GraphEdges } from "./GraphEdges";
import type { BubbleConnection, BubbleGraphNode } from "./types";
import { useBubbleGraph } from "./useBubbleGraph";

const STORAGE_CATEGORY = "edumatch-forum-category-layout-v1";
const STORAGE_SUB = "edumatch-forum-category-sub-layout-v1";

function BubbleNode({
  node,
  x,
  y,
  isDragging,
  onDragStart,
  onDragMove,
  onDragEnd,
  onHover,
  onLeave,
  blockNavigation,
}: {
  node: BubbleGraphNode;
  x: number;
  y: number;
  isDragging: boolean;
  onDragStart: (e: PointerEvent) => void;
  onDragMove: (e: PointerEvent) => void;
  onDragEnd: (e: PointerEvent) => void;
  onHover: () => void;
  onLeave: () => void;
  blockNavigation: () => boolean;
}) {
  const inner = (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center rounded-full text-center shadow-[0_12px_30px_-8px_rgba(0,0,0,0.25)]",
        node.isPrimary && "ring-2 ring-primary/50 ring-offset-2 ring-offset-transparent",
        isDragging ? "scale-105" : "hover:scale-[1.03]"
      )}
      style={{ backgroundColor: node.backgroundColor }}
    >
      {node.isPrimary && (
        <span className="absolute -top-1 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold text-primary-foreground shadow-sm">
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

  const style = {
    left: x,
    top: y,
    width: node.diameter,
    height: node.diameter,
    zIndex: node.isPrimary ? 30 : 10,
  } as const;

  const pointerProps = {
    onPointerDown: onDragStart,
    onPointerMove: onDragMove,
    onPointerUp: onDragEnd,
    onPointerCancel: onDragEnd,
    onMouseEnter: onHover,
    onMouseLeave: onLeave,
    className: cn(
      "absolute -translate-x-1/2 -translate-y-1/2 touch-none",
      isDragging ? "z-50 cursor-grabbing" : "cursor-grab"
    ),
    style,
  };

  if (node.href) {
    return (
      <Link
        href={node.href}
        prefetch
        {...pointerProps}
        onClick={(e) => {
          if (blockNavigation()) e.preventDefault();
        }}
        aria-label={node.label}
      >
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" {...pointerProps} onClick={() => node.onActivate?.()} aria-label={node.label}>
      {inner}
    </button>
  );
}

export function BubbleGraphCanvas({
  nodes,
  connections,
  layoutMode,
  className,
  clipEllipse = false,
}: {
  nodes: BubbleGraphNode[];
  connections: BubbleConnection[];
  layoutMode: "category" | "subcategory";
  className?: string;
  clipEllipse?: boolean;
}) {
  const storageKey = layoutMode === "subcategory" ? STORAGE_SUB : STORAGE_CATEGORY;

  const graph = useBubbleGraph({
    nodes,
    layoutStorageKey: storageKey,
    layoutMode,
    spokeFromPrimary: layoutMode === "subcategory",
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
    <div className={cn("relative h-full w-full overflow-hidden", className)} onWheel={graph.handleWheelZoom}>
      <div className="absolute right-4 top-4 z-40 flex items-center gap-1 rounded-full border bg-background/90 px-1.5 py-1 shadow-sm backdrop-blur">
        <button
          type="button"
          aria-label="配置をリセット"
          className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-muted"
          onClick={graph.resetLayout}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
        <span className="mx-0.5 h-4 w-px bg-border" />
        <button
          type="button"
          aria-label="縮小"
          disabled={graph.scale <= graph.MAP_ZOOM_MIN + 1e-6}
          className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-muted disabled:opacity-35"
          onClick={() => graph.applyZoom(graph.scale - 0.1)}
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="拡大"
          disabled={graph.scale >= graph.MAP_ZOOM_MAX - 1e-6}
          className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-muted disabled:opacity-35"
          onClick={() => graph.applyZoom(graph.scale + 0.1)}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div
        className={cn(
          "absolute left-1/2 top-1/2",
          graph.isPanning || graph.draggingId ? "cursor-grabbing" : "cursor-grab"
        )}
        onPointerDown={graph.handleGraphPanStart}
        onPointerMove={graph.handleGraphPanMove}
        onPointerUp={graph.handleGraphPanEnd}
        onPointerCancel={graph.handleGraphPanEnd}
        style={{
          width: graph.graphDimensions.width,
          height: graph.graphDimensions.height,
          transform: `translate(calc(-50% + ${graph.pan.x}px), calc(-50% + ${graph.pan.y}px)) scale(${graph.scale})`,
          transformOrigin: "center center",
          transition: graph.isPanning || graph.draggingId ? "none" : "transform 380ms cubic-bezier(.2,.8,.2,1)",
          clipPath: clipEllipse ? "ellipse(44% 46% at 50% 50%)" : undefined,
        }}
      >
        <GraphEdges
          points={graph.basePoints}
          offsets={graph.dragOffsets}
          connections={allConnections}
          hoveredId={graph.hoveredId}
          graphWidth={graph.graphDimensions.width}
          graphHeight={graph.graphDimensions.height}
        />

        {nodes.map((node, index) => {
          const point = graph.basePoints[node.id];
          if (!point) return null;
          const drag = graph.dragOffsets[node.id] ?? { x: 0, y: 0 };
          const float = graph.getFloatOffset(node.id, index);
          const x = point.x + drag.x + float.x;
          const y = point.y + drag.y + float.y;

          return (
            <BubbleNode
              key={node.id}
              node={node}
              x={x}
              y={y}
              isDragging={graph.draggingId === node.id}
              onDragStart={(e) => graph.handleNodeDragStart(node.id, e)}
              onDragMove={graph.handleNodeDragMove}
              onDragEnd={graph.handleNodeDragEnd}
              onHover={() => graph.setHoveredId(node.id)}
              onLeave={() => graph.setHoveredId(null)}
              blockNavigation={graph.consumeDragBlock}
            />
          );
        })}
      </div>
    </div>
  );
}
