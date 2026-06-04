import type { BubbleGraphNode, GraphPoint, ZoomDetailLevel } from "./types";

export const BASE_GRAPH_WIDTH = 1000;
export const BASE_GRAPH_HEIGHT = 560;

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** ノード数に応じたバブル直径（px） */
export function computeBubbleDiameter(
  count: number,
  options?: { max?: number; min?: number; primaryMultiplier?: number }
): { default: number; primary: number } {
  const max = options?.max ?? 190;
  const min = options?.min ?? 72;
  const primaryMul = options?.primaryMultiplier ?? 1.3;
  const base = clampNumber(max - Math.max(0, count - 4) * 10, min, max);
  return { default: base, primary: Math.round(base * primaryMul) };
}

function spreadFromCenter(
  points: Record<string, GraphPoint>,
  factor: number,
  centerX: number,
  centerY: number
) {
  if (factor <= 1) return;
  for (const id of Object.keys(points)) {
    points[id] = {
      ...points[id],
      x: centerX + (points[id].x - centerX) * factor,
      y: centerY + (points[id].y - centerY) * factor,
    };
  }
}

export function computeCircularGraphPoints(
  nodeIds: string[],
  graphWidth: number,
  graphHeight: number,
  spreadFactor = 1.05
): Record<string, GraphPoint> {
  const points: Record<string, GraphPoint> = {};
  const centerX = graphWidth / 2;
  const centerY = graphHeight / 2;
  const radius = Math.min(graphWidth, graphHeight) * 0.34 * spreadFactor;
  const innerOffset = Math.min(graphWidth, graphHeight) * 0.06;

  nodeIds.forEach((id, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(1, nodeIds.length);
    const layerJitter = nodeIds.length >= 8 ? (index % 2 === 0 ? innerOffset : -innerOffset) : 0;
    const r = radius + layerJitter + (Math.sin(index * 1.7) * innerOffset * 0.35);
    points[id] = {
      id,
      x: centerX + Math.cos(angle) * r,
      y: centerY + Math.sin(angle) * r,
    };
  });

  return points;
}

/** コミュニティを上部中央に寄せた初期配置 */
export function computeSubCategoryGraphPoints(
  nodes: BubbleGraphNode[],
  graphWidth: number,
  graphHeight: number
): Record<string, GraphPoint> {
  const community = nodes.find((n) => n.isPrimary);
  const others = nodes.filter((n) => !n.isPrimary);
  const points: Record<string, GraphPoint> = {};

  if (community) {
    points[community.id] = { id: community.id, x: graphWidth / 2, y: graphHeight * 0.22 };
  }

  const slots = others.length;
  others.forEach((node, i) => {
    const angle = Math.PI * 0.15 + (Math.PI * 0.7 * i) / Math.max(1, slots - 1 || 1);
    const r = Math.min(graphWidth, graphHeight) * 0.28;
    points[node.id] = {
      id: node.id,
      x: graphWidth / 2 + Math.cos(angle) * r * (i % 2 === 0 ? 1 : 0.92),
      y: graphHeight * 0.55 + Math.sin(angle) * r * 0.55,
    };
  });

  return points;
}

function collisionPadding(detailLevel: ZoomDetailLevel): number {
  if (detailLevel === "overview") return 22;
  if (detailLevel === "compact") return 30;
  if (detailLevel === "standard") return 38;
  return 48;
}

export function resolveGraphCollisions(
  initialPoints: Record<string, GraphPoint>,
  nodes: BubbleGraphNode[],
  detailLevel: ZoomDetailLevel,
  graphWidth: number,
  graphHeight: number
): Record<string, GraphPoint> {
  const points = Object.fromEntries(
    Object.entries(initialPoints).map(([id, p]) => [id, { ...p }])
  ) as Record<string, GraphPoint>;
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const ids = Object.keys(points);
  const padding = collisionPadding(detailLevel);
  const iterations = detailLevel === "detail" ? 140 : 100;

  const spread =
    detailLevel === "detail" ? 1.15 : detailLevel === "standard" ? 1.1 : 1.05;
  spreadFromCenter(points, spread, graphWidth / 2, graphHeight / 2);

  for (let iter = 0; iter < iterations; iter += 1) {
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        const a = points[ids[i]];
        const b = points[ids[j]];
        const aNode = nodeById.get(a.id);
        const bNode = nodeById.get(b.id);
        if (!aNode || !bNode) continue;

        const minDist = (aNode.diameter + bNode.diameter) / 2 + padding;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist >= minDist) continue;

        const push = (minDist - dist) / 2 + 1;
        const nx = dx / dist;
        const ny = dy / dist;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
      }
    }

    for (const id of ids) {
      const node = nodeById.get(id);
      if (!node) continue;
      const margin = node.diameter / 2 + padding * 0.4;
      points[id].x = clampNumber(points[id].x, margin, graphWidth - margin);
      points[id].y = clampNumber(points[id].y, margin, graphHeight - margin);
    }
  }

  return points;
}

export function getGraphDimensions(nodeCount: number) {
  const scale = 1 + Math.min(0.2, Math.max(0, nodeCount - 6) * 0.025);
  return {
    width: Math.round(BASE_GRAPH_WIDTH * scale),
    height: Math.round(BASE_GRAPH_HEIGHT * scale),
  };
}

/** 浮遊オフセット適用後のバブル同士が重ならないよう調整 */
export function resolveFloatOffsetsCollisions(
  basePoints: Record<string, GraphPoint>,
  floatOffsets: Record<string, { x: number; y: number }>,
  nodes: BubbleGraphNode[],
  graphWidth: number,
  graphHeight: number,
  padding = 14,
  iterations = 10
): Record<string, { x: number; y: number }> {
  const offsets: Record<string, { x: number; y: number }> = {};
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const ids = nodes.map((n) => n.id).filter((id) => basePoints[id]);

  for (const id of ids) {
    offsets[id] = { ...(floatOffsets[id] ?? { x: 0, y: 0 }) };
  }

  for (let iter = 0; iter < iterations; iter += 1) {
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        const idA = ids[i];
        const idB = ids[j];
        const aNode = nodeById.get(idA);
        const bNode = nodeById.get(idB);
        const baseA = basePoints[idA];
        const baseB = basePoints[idB];
        if (!aNode || !bNode || !baseA || !baseB) continue;

        const offA = offsets[idA];
        const offB = offsets[idB];
        const ax = baseA.x + offA.x;
        const ay = baseA.y + offA.y;
        const bx = baseB.x + offB.x;
        const by = baseB.y + offB.y;

        const minDist = (aNode.diameter + bNode.diameter) / 2 + padding;
        const dx = bx - ax;
        const dy = by - ay;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist >= minDist) continue;

        const push = (minDist - dist) / 2 + 0.5;
        const nx = dx / dist;
        const ny = dy / dist;
        offsets[idA] = { x: offA.x - nx * push, y: offA.y - ny * push };
        offsets[idB] = { x: offB.x + nx * push, y: offB.y + ny * push };
      }
    }

    for (const id of ids) {
      const node = nodeById.get(id);
      const base = basePoints[id];
      if (!node || !base) continue;
      const off = offsets[id];
      const margin = node.diameter / 2 + padding * 0.5;
      let x = base.x + off.x;
      let y = base.y + off.y;
      if (x < margin) x = margin;
      if (x > graphWidth - margin) x = graphWidth - margin;
      if (y < margin) y = margin;
      if (y > graphHeight - margin) y = graphHeight - margin;
      offsets[id] = { x: x - base.x, y: y - base.y };
    }
  }

  return offsets;
}
