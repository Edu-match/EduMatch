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
  spreadFactor = 1.05,
  radiusRatio = 0.34
): Record<string, GraphPoint> {
  const points: Record<string, GraphPoint> = {};
  const centerX = graphWidth / 2;
  const centerY = graphHeight / 2;
  const radius = Math.min(graphWidth, graphHeight) * radiusRatio * spreadFactor;
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

/**
 * サブカテゴリ初期配置。
 * パン無効前提のため全ノードを画面内（マージン内）に確実に収める。
 * topReserve: タイトル領域に食い込まないよう上部を空ける比率（グラフ高さ基準）
 */
export function computeSubCategoryGraphPoints(
  nodes: BubbleGraphNode[],
  graphWidth: number,
  graphHeight: number,
  topReserve = 0.16
): Record<string, GraphPoint> {
  const community = nodes.find((n) => n.isPrimary);
  const others = nodes.filter((n) => !n.isPrimary);
  const points: Record<string, GraphPoint> = {};

  const usableTop = graphHeight * topReserve;
  const usableHeight = graphHeight - usableTop;
  const cx = graphWidth / 2;

  const clampToBounds = (id: string, x: number, y: number) => {
    const node = nodes.find((n) => n.id === id);
    const margin = (node?.diameter ?? 120) / 2 + 12;
    points[id] = {
      id,
      x: clampNumber(x, margin, graphWidth - margin),
      y: clampNumber(y, usableTop + margin, graphHeight - margin),
    };
  };

  if (community) {
    clampToBounds(community.id, cx, usableTop + usableHeight * 0.3);
  }

  // 残りは下半分に弧状に配置（中央寄せ・端は内側に寄せる）
  const slots = others.length;
  const arcSpan = Math.PI * 0.82;
  const arcStart = Math.PI / 2 - arcSpan / 2;
  const rx = graphWidth * 0.32;
  const ry = usableHeight * 0.34;
  const arcCenterY = usableTop + usableHeight * 0.62;

  others.forEach((node, i) => {
    const t = slots <= 1 ? 0.5 : i / (slots - 1);
    const angle = arcStart + arcSpan * t;
    clampToBounds(
      node.id,
      cx + Math.cos(angle) * rx,
      arcCenterY + Math.sin(angle) * ry
    );
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
  graphHeight: number,
  options?: { spread?: number; iterations?: number; padding?: number; pinnedIds?: string[] }
): Record<string, GraphPoint> {
  const points = Object.fromEntries(
    Object.entries(initialPoints).map(([id, p]) => [id, { ...p }])
  ) as Record<string, GraphPoint>;
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const ids = Object.keys(points);
  const padding = options?.padding ?? collisionPadding(detailLevel);
  const iterations = options?.iterations ?? (detailLevel === "detail" ? 140 : 100);
  const pinned = new Set(
    options?.pinnedIds ??
      nodes.filter((n) => n.isPrimary).map((n) => n.id)
  );
  const pinnedPositions = new Map<string, GraphPoint>();
  for (const id of pinned) {
    if (points[id]) pinnedPositions.set(id, { ...points[id] });
  }

  const isPinned = (id: string) => pinned.has(id);

  const spread =
    options?.spread ??
    (detailLevel === "detail" ? 1.15 : detailLevel === "standard" ? 1.1 : 1.05);
  spreadFromCenter(points, spread, graphWidth / 2, graphHeight / 2);
  for (const [id, p] of pinnedPositions) points[id] = { ...p };

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
        const aPinned = isPinned(a.id);
        const bPinned = isPinned(b.id);
        if (aPinned && bPinned) continue;
        if (aPinned) {
          b.x += nx * push * 2;
          b.y += ny * push * 2;
        } else if (bPinned) {
          a.x -= nx * push * 2;
          a.y -= ny * push * 2;
        } else {
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
        }
      }
    }

    for (const id of ids) {
      if (isPinned(id)) continue;
      const node = nodeById.get(id);
      if (!node) continue;
      const margin = node.diameter / 2 + padding * 0.4;
      points[id].x = clampNumber(points[id].x, margin, graphWidth - margin);
      points[id].y = clampNumber(points[id].y, margin, graphHeight - margin);
    }
    for (const [id, p] of pinnedPositions) points[id] = { ...p };
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

/**
 * Interop特設トップ：中心ハブ → 内側カテゴリ → 外周優先トピックの放射配置
 */
export function computeInteropTopGraphPoints(
  centerId: string,
  innerIds: string[],
  outerIds: string[],
  graphWidth: number,
  graphHeight: number
): Record<string, GraphPoint> {
  const points: Record<string, GraphPoint> = {};
  const cx = graphWidth / 2;
  const cy = graphHeight / 2;
  const minDim = Math.min(graphWidth, graphHeight);

  points[centerId] = { id: centerId, x: cx, y: cy };

  const innerR = minDim * 0.21;
  innerIds.forEach((id, i) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * i) / Math.max(1, innerIds.length);
    const wobble = Math.sin(i * 1.9) * minDim * 0.006;
    points[id] = {
      id,
      x: cx + Math.cos(angle) * (innerR + wobble),
      y: cy + Math.sin(angle) * (innerR + wobble),
    };
  });

  const outerCount = outerIds.length;
  const baseR = minDim * 0.23;
  const rSpread = minDim * 0.055;

  outerIds.forEach((id, i) => {
    const t = outerCount <= 1 ? 0.5 : i / outerCount;
    const wave = Math.sin(i * 2.17) * 0.045 + Math.cos(i * 0.83) * 0.028;
    const angle = -Math.PI / 2 + Math.PI * 2 * t + wave;
    const layer = (i % 4) * 0.016 + Math.sin(i * 0.62) * 0.012;
    const r = baseR + rSpread * (0.32 + t * 0.52 + layer);
    points[id] = {
      id,
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    };
  });

  return points;
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
