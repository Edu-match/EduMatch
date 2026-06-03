"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import type { BubbleGraphNode, DragOffset, GraphPoint } from "./types";
import {
  computeCircularGraphPoints,
  computeSubCategoryGraphPoints,
  getGraphDimensions,
  resolveGraphCollisions,
} from "./layout";

const MAP_ZOOM_MIN = 0.72;
const MAP_ZOOM_MAX = 1.75;
const MAP_ZOOM_STEP = 0.1;

type DragSession = {
  id: string;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  moved: boolean;
  pointerId: number;
};

type PanSession = {
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  pointerId: number;
};

function readSavedLayout(key: string): Record<string, DragOffset> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, DragOffset>;
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([, v]) => typeof v?.x === "number" && typeof v?.y === "number"
      )
    );
  } catch {
    return {};
  }
}

export function useBubbleGraph(options: {
  nodes: BubbleGraphNode[];
  layoutStorageKey: string;
  layoutMode: "category" | "subcategory";
  /** コミュニティから他サブへのスポーク（視覚用） */
  spokeFromPrimary?: boolean;
}) {
  const { nodes, layoutStorageKey, layoutMode, spokeFromPrimary } = options;
  const nodeIds = useMemo(() => nodes.map((n) => n.id).join(","), [nodes]);

  const graphDimensions = useMemo(
    () => getGraphDimensions(nodes.length),
    [nodes.length]
  );

  const basePoints = useMemo(() => {
    const ids = nodes.map((n) => n.id);
    const initial =
      layoutMode === "subcategory"
        ? computeSubCategoryGraphPoints(nodes, graphDimensions.width, graphDimensions.height)
        : computeCircularGraphPoints(ids, graphDimensions.width, graphDimensions.height);
    return resolveGraphCollisions(
      initial,
      nodes,
      "standard",
      graphDimensions.width,
      graphDimensions.height
    );
  }, [nodeIds, layoutMode, nodes, graphDimensions.height, graphDimensions.width]);

  const [dragOffsets, setDragOffsets] = useState<Record<string, DragOffset>>(() =>
    readSavedLayout(layoutStorageKey)
  );
  const [scale, setScale] = useState(() =>
    nodes.length >= 10 ? 0.82 : 0.9
  );
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [floatPhase, setFloatPhase] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  const dragSessionRef = useRef<DragSession | null>(null);
  const panSessionRef = useRef<PanSession | null>(null);
  const dragBlockRef = useRef(false);

  useEffect(() => {
    setDragOffsets(readSavedLayout(layoutStorageKey));
  }, [layoutStorageKey]);

  useEffect(() => {
    localStorage.setItem(layoutStorageKey, JSON.stringify(dragOffsets));
  }, [dragOffsets, layoutStorageKey]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const handler = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (reduceMotion || draggingId) return;
    let frame = 0;
    let raf = 0;
    const tick = () => {
      frame += 1;
      setFloatPhase(frame * 0.018);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduceMotion, draggingId]);

  const applyZoom = useCallback((next: number) => {
    setScale((s) => Math.min(MAP_ZOOM_MAX, Math.max(MAP_ZOOM_MIN, next)));
  }, []);

  const handleWheelZoom = useCallback(
    (event: ReactWheelEvent) => {
      event.preventDefault();
      const delta = event.deltaY > 0 ? -MAP_ZOOM_STEP : MAP_ZOOM_STEP;
      applyZoom(scale + delta);
    },
    [applyZoom, scale]
  );

  const handleGraphPanStart = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 || draggingId) return;
      panSessionRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        originX: pan.x,
        originY: pan.y,
        pointerId: event.pointerId,
      };
      setIsPanning(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [draggingId, pan]
  );

  const handleGraphPanMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const session = panSessionRef.current;
    if (!session) return;
    setPan({
      x: session.originX + event.clientX - session.startX,
      y: session.originY + event.clientY - session.startY,
    });
  }, []);

  const handleGraphPanEnd = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const session = panSessionRef.current;
    if (!session) return;
    if (event.currentTarget.hasPointerCapture(session.pointerId)) {
      event.currentTarget.releasePointerCapture(session.pointerId);
    }
    panSessionRef.current = null;
    setIsPanning(false);
  }, []);

  const consumeDragBlock = useCallback(() => {
    if (!dragBlockRef.current) return false;
    dragBlockRef.current = false;
    return true;
  }, []);

  const handleNodeDragStart = useCallback(
    (id: string, event: ReactPointerEvent) => {
      event.stopPropagation();
      dragBlockRef.current = false;
      const origin = dragOffsets[id] ?? { x: 0, y: 0 };
      dragSessionRef.current = {
        id,
        startX: event.clientX,
        startY: event.clientY,
        originX: origin.x,
        originY: origin.y,
        moved: false,
        pointerId: event.pointerId,
      };
      setDraggingId(id);
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    },
    [dragOffsets]
  );

  const handleNodeDragMove = useCallback((event: ReactPointerEvent) => {
    const session = dragSessionRef.current;
    if (!session) return;
    const dx = event.clientX - session.startX;
    const dy = event.clientY - session.startY;
    if (Math.hypot(dx, dy) > 4) session.moved = true;
    setDragOffsets((prev) => ({
      ...prev,
      [session.id]: {
        x: session.originX + dx / scale,
        y: session.originY + dy / scale,
      },
    }));
  }, [scale]);

  const handleNodeDragEnd = useCallback((event: ReactPointerEvent) => {
    const session = dragSessionRef.current;
    if (!session) return;
    if ((event.currentTarget as HTMLElement).hasPointerCapture(session.pointerId)) {
      (event.currentTarget as HTMLElement).releasePointerCapture(session.pointerId);
    }
    if (session.moved) dragBlockRef.current = true;
    dragSessionRef.current = null;
    setDraggingId(null);
  }, []);

  const resetLayout = useCallback(() => {
    setDragOffsets({});
    setPan({ x: 0, y: 0 });
    setScale(nodes.length >= 10 ? 0.82 : 0.9);
  }, [nodes.length]);

  const getFloatOffset = useCallback(
    (nodeId: string, index: number): DragOffset => {
      if (reduceMotion || draggingId) return { x: 0, y: 0 };
      const amp = 5;
      const phase = index * 1.3 + nodeId.charCodeAt(0) * 0.01;
      return {
        x: Math.sin(floatPhase + phase) * amp,
        y: Math.cos(floatPhase * 0.85 + phase) * amp * 0.7,
      };
    },
    [reduceMotion, draggingId, floatPhase]
  );

  const spokeConnections = useMemo(() => {
    if (!spokeFromPrimary) return [];
    const primary = nodes.find((n) => n.isPrimary);
    if (!primary) return [];
    return nodes
      .filter((n) => n.id !== primary.id)
      .map((n) => ({ from: primary.id, to: n.id, weight: 1 }));
  }, [nodes, spokeFromPrimary]);

  return {
    basePoints: basePoints as Record<string, GraphPoint>,
    graphDimensions,
    dragOffsets,
    scale,
    pan,
    hoveredId,
    setHoveredId,
    draggingId,
    isPanning,
    applyZoom,
    handleWheelZoom,
    handleGraphPanStart,
    handleGraphPanMove,
    handleGraphPanEnd,
    handleNodeDragStart,
    handleNodeDragMove,
    handleNodeDragEnd,
    resetLayout,
    getFloatOffset,
    spokeConnections,
    consumeDragBlock,
    MAP_ZOOM_MIN,
    MAP_ZOOM_MAX,
  };
}
