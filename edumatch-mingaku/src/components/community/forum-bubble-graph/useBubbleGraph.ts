"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { BubbleGraphNode, DragOffset, GraphPoint } from "./types";
import {
  computeCircularGraphPoints,
  computeInteropTopGraphPoints,
  computeSubCategoryGraphPoints,
  getGraphDimensions,
  resolveFloatOffsetsCollisions,
  resolveGraphCollisions,
} from "./layout";

const MAP_ZOOM_MIN = 0.72;
const MAP_ZOOM_MAX = 1.75;
const MAP_ZOOM_STEP = 0.1;
const PAN_CLICK_THRESHOLD_PX = 4;

type PanSession = {
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  pointerId: number;
  moved: boolean;
};

type PendingBubbleClick = {
  href?: string;
  onActivate?: () => void;
};

type DriftParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
};

function hashSeed(id: string, index: number): number {
  let h = index * 2654435761;
  for (let i = 0; i < id.length; i += 1) {
    h = (h ^ id.charCodeAt(i)) * 1597334677;
  }
  return Math.abs(h);
}

function initDriftParticle(id: string, index: number): DriftParticle {
  const seed = hashSeed(id, index);
  const angle = ((seed % 360) * Math.PI) / 180;
  const speed = 1.2 + (seed % 4) * 0.35;
  const radius = 10 + (seed % 14);
  return {
    x: ((seed % 100) / 100 - 0.5) * radius * 0.25,
    y: (((seed >> 8) % 100) / 100 - 0.5) * radius * 0.25,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius,
  };
}

function stepDrift(p: DriftParticle, dt: number): DriftParticle {
  let { x, y, vx, vy, radius } = p;
  x += vx * dt;
  y += vy * dt;
  if (x > radius) {
    x = radius;
    vx = -Math.abs(vx);
  } else if (x < -radius) {
    x = -radius;
    vx = Math.abs(vx);
  }
  if (y > radius) {
    y = radius;
    vy = -Math.abs(vy);
  } else if (y < -radius) {
    y = -radius;
    vy = Math.abs(vy);
  }
  return { x, y, vx, vy, radius };
}

export function useBubbleGraph(options: {
  nodes: BubbleGraphNode[];
  layoutMode: "category" | "subcategory" | "interop-top";
  /** コミュニティから他サブへのスポーク（視覚用） */
  spokeFromPrimary?: boolean;
  onBubbleNavigate?: (href: string) => void;
  /** false にするとパン操作を無効化 */
  panEnabled?: boolean;
  /** コンテナに合わせて自動ズーム（Interop特設向け） */
  fillViewport?: boolean;
  /** 円形配置の拡大（spreadFactor / radiusRatio） */
  circularLayout?: { spreadFactor: number; radiusRatio: number };
  /** グラフキャンバスサイズ上書き */
  graphSize?: { width: number; height: number };
  /** interop-top 用：中心・内側・外側ノード ID */
  interopTopLayout?: { centerId: string; innerIds: string[]; outerIds: string[] };
  /** バブルの漂いアニメ（Interop特設ではオフ推奨） */
  driftEnabled?: boolean;
}) {
  const {
    nodes,
    layoutMode,
    spokeFromPrimary,
    onBubbleNavigate,
    panEnabled = true,
    fillViewport = false,
    circularLayout,
    graphSize,
    interopTopLayout,
    driftEnabled = layoutMode !== "interop-top",
  } = options;
  const nodeIds = useMemo(() => nodes.map((n) => n.id).join(","), [nodes]);

  const graphDimensions = useMemo(
    () =>
      graphSize ?? getGraphDimensions(nodes.length),
    [graphSize, nodes.length]
  );

  const basePoints = useMemo(() => {
    const ids = nodes.map((n) => n.id);
    let initial: Record<string, GraphPoint>;
    if (layoutMode === "subcategory") {
      initial = computeSubCategoryGraphPoints(nodes, graphDimensions.width, graphDimensions.height);
    } else if (layoutMode === "interop-top" && interopTopLayout) {
      initial = computeInteropTopGraphPoints(
        interopTopLayout.centerId,
        interopTopLayout.innerIds,
        interopTopLayout.outerIds,
        graphDimensions.width,
        graphDimensions.height
      );
    } else {
      initial = computeCircularGraphPoints(
        ids,
        graphDimensions.width,
        graphDimensions.height,
        circularLayout?.spreadFactor ?? 1.05,
        circularLayout?.radiusRatio ?? 0.34
      );
    }
    return resolveGraphCollisions(
      initial,
      nodes,
      layoutMode === "interop-top" ? "compact" : "standard",
      graphDimensions.width,
      graphDimensions.height
    );
  }, [
    nodeIds,
    layoutMode,
    nodes,
    graphDimensions.height,
    graphDimensions.width,
    circularLayout?.spreadFactor,
    circularLayout?.radiusRatio,
    interopTopLayout?.centerId,
    interopTopLayout?.innerIds.join(","),
    interopTopLayout?.outerIds.join(","),
  ]);

  const defaultScale = fillViewport ? 1 : nodes.length >= 10 ? 0.65 : 0.72;
  const [scale, setScale] = useState(() => defaultScale);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [floatOffsets, setFloatOffsets] = useState<Record<string, DragOffset>>({});
  const [reduceMotion, setReduceMotion] = useState(false);

  const panSessionRef = useRef<PanSession | null>(null);
  const pendingClickRef = useRef<PendingBubbleClick | null>(null);
  const driftRef = useRef<Record<string, DriftParticle>>({});
  const lastFrameTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const handler = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    driftRef.current = {};
    lastFrameTimeRef.current = null;
    setFloatOffsets({});
  }, [nodeIds]);

  useEffect(() => {
    if (!driftEnabled || reduceMotion || isPanning || nodes.length === 0) {
      setFloatOffsets({});
      return;
    }

    let raf = 0;
    const tick = (now: number) => {
      const last = lastFrameTimeRef.current ?? now;
      lastFrameTimeRef.current = now;
      const dt = Math.min(0.05, (now - last) / 1000);

      const next: Record<string, DragOffset> = {};
      for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        if (!driftRef.current[node.id]) {
          driftRef.current[node.id] = initDriftParticle(node.id, i);
        }
        const stepped = stepDrift(driftRef.current[node.id], dt);
        driftRef.current[node.id] = stepped;
        next[node.id] = { x: stepped.x, y: stepped.y };
      }

      const resolved = resolveFloatOffsetsCollisions(
        basePoints,
        next,
        nodes,
        graphDimensions.width,
        graphDimensions.height
      );
      for (const node of nodes) {
        const off = resolved[node.id];
        if (off && driftRef.current[node.id]) {
          driftRef.current[node.id] = {
            ...driftRef.current[node.id],
            x: off.x,
            y: off.y,
          };
        }
      }
      setFloatOffsets(resolved);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [
    driftEnabled,
    reduceMotion,
    isPanning,
    nodes,
    nodeIds,
    basePoints,
    graphDimensions.width,
    graphDimensions.height,
  ]);

  const applyZoom = useCallback((next: number) => {
    setScale((s) => Math.min(MAP_ZOOM_MAX, Math.max(MAP_ZOOM_MIN, next)));
  }, []);

  const resolvePendingClick = useCallback(
    (target: EventTarget | null) => {
      const el = target instanceof HTMLElement ? target.closest("[data-bubble-id]") : null;
      if (!el) {
        pendingClickRef.current = null;
        return;
      }
      const id = el.getAttribute("data-bubble-id");
      const node = nodes.find((n) => n.id === id);
      if (!node) {
        pendingClickRef.current = null;
        return;
      }
      pendingClickRef.current = {
        href: node.href,
        onActivate: node.onActivate,
      };
    },
    [nodes]
  );

  const firePendingClick = useCallback(() => {
    const pending = pendingClickRef.current;
    pendingClickRef.current = null;
    if (!pending) return;
    if (pending.href) {
      onBubbleNavigate?.(pending.href);
    } else {
      pending.onActivate?.();
    }
  }, [onBubbleNavigate]);

  const handleViewportPanStart = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      resolvePendingClick(event.target);
      panSessionRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        originX: pan.x,
        originY: pan.y,
        pointerId: event.pointerId,
        moved: false,
      };
      if (panEnabled) setIsPanning(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [pan, resolvePendingClick, panEnabled]
  );

  const handleViewportPanMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const session = panSessionRef.current;
    if (!session) return;
    const dx = event.clientX - session.startX;
    const dy = event.clientY - session.startY;
    if (!session.moved && Math.hypot(dx, dy) > PAN_CLICK_THRESHOLD_PX) {
      session.moved = true;
      pendingClickRef.current = null;
    }
    if (panEnabled) {
      setPan({
        x: session.originX + dx,
        y: session.originY + dy,
      });
    }
  }, [panEnabled]);

  const handleViewportPanEnd = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const session = panSessionRef.current;
      if (!session) return;
      if (event.currentTarget.hasPointerCapture(session.pointerId)) {
        event.currentTarget.releasePointerCapture(session.pointerId);
      }
      const wasClick = !session.moved;
      panSessionRef.current = null;
      setIsPanning(false);
      if (wasClick) firePendingClick();
      else pendingClickRef.current = null;
    },
    [firePendingClick]
  );

  const resetLayout = useCallback(() => {
    setPan({ x: 0, y: 0 });
    setScale(defaultScale);
    driftRef.current = {};
    lastFrameTimeRef.current = null;
    setFloatOffsets({});
  }, [defaultScale]);
  const computeFitScale = useCallback(
    (containerW: number, containerH: number) => {
      if (containerW <= 0 || containerH <= 0) return defaultScale;
      const margin = 0.06;
      const maxNodeD = Math.max(...nodes.map((n) => n.diameter), 80);
      const pad = maxNodeD * 0.6;
      const scaleX = (containerW * (1 - margin * 2)) / (graphDimensions.width + pad);
      const scaleY = (containerH * (1 - margin * 2)) / (graphDimensions.height + pad);
      return Math.min(MAP_ZOOM_MAX, Math.max(MAP_ZOOM_MIN, Math.min(scaleX, scaleY)));
    },
    [defaultScale, graphDimensions.height, graphDimensions.width, nodes]
  );

  const getFloatOffset = useCallback(
    (nodeId: string): DragOffset => floatOffsets[nodeId] ?? { x: 0, y: 0 },
    [floatOffsets]
  );

  const spokeConnections = useMemo(() => {
    if (!spokeFromPrimary) return [];
    const primary = nodes.find((n) => n.isPrimary);
    if (!primary) return [];
    return nodes
      .filter((n) => n.id !== primary.id)
      .map((n) => ({ from: primary.id, to: n.id, weight: 1 }));
  }, [nodes, spokeFromPrimary]);

  const zoomPercent = Math.round(scale * 100);

  return {
    basePoints: basePoints as Record<string, GraphPoint>,
    graphDimensions,
    floatOffsets,
    scale,
    zoomPercent,
    pan,
    hoveredId,
    setHoveredId,
    isPanning,
    applyZoom,
    handleViewportPanStart,
    handleViewportPanMove,
    handleViewportPanEnd,
    resetLayout,
    getFloatOffset,
    spokeConnections,
    MAP_ZOOM_MIN,
    MAP_ZOOM_MAX,
    MAP_ZOOM_STEP,
    fillViewport,
    computeFitScale,
    setScale,
  };
}
