"use client";

import type { BubbleConnection, DragOffset, GraphPoint } from "./types";

export function GraphEdges({
  points,
  floatOffsets,
  connections,
  hoveredId,
  graphWidth,
  graphHeight,
  edgeTheme = "dark",
}: {
  points: Record<string, GraphPoint>;
  floatOffsets: Record<string, DragOffset>;
  connections: BubbleConnection[];
  hoveredId: string | null;
  graphWidth: number;
  graphHeight: number;
  /** light = 青グラデ背景向けの白線 */
  edgeTheme?: "dark" | "light";
}) {
  const stroke = edgeTheme === "light" ? "rgb(255 255 255)" : "rgb(15 23 42)";
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

        const fo = floatOffsets[from] ?? { x: 0, y: 0 };
        const toO = floatOffsets[to] ?? { x: 0, y: 0 };
        const x1 = fromPoint.x + fo.x;
        const y1 = fromPoint.y + fo.y;
        const x2 = toPoint.x + toO.x;
        const y2 = toPoint.y + toO.y;
        const highlighted = hoveredId === from || hoveredId === to;
        const strokeWidth = weight >= 3 ? 2.2 : weight >= 2 ? 1.6 : 1.1;
        const opacity =
          edgeTheme === "light"
            ? highlighted
              ? 0.72
              : weight >= 2
                ? 0.48
                : 0.32
            : highlighted
              ? 0.55
              : weight >= 2
                ? 0.38
                : 0.26;

        return (
          <line
            key={`${from}-${to}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeOpacity={opacity}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}
