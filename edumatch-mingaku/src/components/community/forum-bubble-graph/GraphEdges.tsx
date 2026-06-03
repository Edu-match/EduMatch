"use client";

import type { BubbleConnection, DragOffset, GraphPoint } from "./types";

export function GraphEdges({
  points,
  offsets,
  connections,
  hoveredId,
  graphWidth,
  graphHeight,
}: {
  points: Record<string, GraphPoint>;
  offsets: Record<string, DragOffset>;
  connections: BubbleConnection[];
  hoveredId: string | null;
  graphWidth: number;
  graphHeight: number;
}) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      width={graphWidth}
      height={graphHeight}
      viewBox={`0 0 ${graphWidth} ${graphHeight}`}
      aria-hidden
    >
      {connections.map(({ from, to, weight = 1 }) => {
        const fromPoint = points[from];
        const toPoint = points[to];
        if (!fromPoint || !toPoint) return null;

        const fo = offsets[from] ?? { x: 0, y: 0 };
        const toO = offsets[to] ?? { x: 0, y: 0 };
        const x1 = fromPoint.x + fo.x;
        const y1 = fromPoint.y + fo.y;
        const x2 = toPoint.x + toO.x;
        const y2 = toPoint.y + toO.y;
        const highlighted = hoveredId === from || hoveredId === to;
        const strokeWidth = weight >= 3 ? 2.2 : weight >= 2 ? 1.6 : 1.1;
        const opacity = highlighted ? 0.55 : weight >= 2 ? 0.38 : 0.26;

        return (
          <line
            key={`${from}-${to}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="rgb(15 23 42)"
            strokeWidth={strokeWidth}
            strokeOpacity={opacity}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}
