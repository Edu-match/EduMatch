"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
import {
  Box,
  MessageSquare,
  Minus,
  Move,
  Plus,
  RotateCcw,
  Users,
  X,
} from "lucide-react";
import type { ForumRoom } from "@/lib/mock-forum";
import { ForumRoomIcon } from "@/components/community/forum-room-icon";
import {
  BUBBLE_CONNECTIONS,
  isRoomActive,
  type BubbleConnection,
} from "@/components/community/forum-bubble-map";

type GraphPoint = {
  id: string;
  x: number;
  y: number;
  z: number;
};

type DragOffset = {
  x: number;
  y: number;
};

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

type ViewTilt = {
  rotateX: number;
  rotateY: number;
};

const STATIC_ROOM_IDS = [
  "ai-lesson",
  "giga-school",
  "diverse-learning",
  "teacher-work",
  "education-gap",
  "ai-literacy",
];

const ROOM_TEXT_STOP_WORDS = new Set([
  "の", "を", "に", "が", "は", "と", "で", "て", "た", "も", "や", "へ", "か",
  "です", "ます", "する", "いる", "ある", "こと", "これ", "それ", "ため",
  "について", "から", "まで", "より", "よう", "また", "など",
]);

const GRAPH_WIDTH = 1120;
const GRAPH_HEIGHT = 720;
const MAP_ZOOM_MIN = 0.72;
const MAP_ZOOM_MAX = 1.8;
const MAP_ZOOM_STEP = 0.12;
const FORUM_MAP_LAYOUT_STORAGE_KEY = "edumatch-forum-graph-layout-v2";

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeRoomText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[・、。！？（）「」『』【】［］()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractKeywords(text: string): Set<string> {
  const normalized = normalizeRoomText(text);
  const keywords = new Set(
    normalized
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((w) => w.length >= 2 && !ROOM_TEXT_STOP_WORDS.has(w))
  );

  const continuousWords = normalized.match(/[一-龠々ぁ-んァ-ヴーa-z0-9]{2,}/g) ?? [];
  for (const word of continuousWords) {
    if (!ROOM_TEXT_STOP_WORDS.has(word)) keywords.add(word);
    if (word.length >= 4) {
      for (let i = 0; i < word.length - 1; i += 1) {
        const bigram = word.slice(i, i + 2);
        if (!ROOM_TEXT_STOP_WORDS.has(bigram)) keywords.add(bigram);
      }
    }
  }

  return keywords;
}

function similarityScore(a: ForumRoom, b: ForumRoom): number {
  const aKw = extractKeywords(`${a.name} ${a.description} ${a.weeklyTopic}`);
  const bKw = extractKeywords(`${b.name} ${b.description} ${b.weeklyTopic}`);

  let overlap = 0;
  for (const token of aKw) {
    if (bKw.has(token)) overlap += token.length >= 3 ? 3 : 1;
  }
  return overlap;
}

function pickBestRelatedRoom(room: ForumRoom, candidates: ForumRoom[]): ForumRoom | null {
  let best: ForumRoom | null = null;
  let bestScore = -1;

  for (const candidate of candidates) {
    const score = similarityScore(room, candidate);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return best ?? candidates[0] ?? null;
}

function computeRoomConnections(rooms: ForumRoom[]): BubbleConnection[] {
  const roomIds = new Set(rooms.map((room) => room.id));
  const result = BUBBLE_CONNECTIONS.filter(
    (connection) => roomIds.has(connection.from) && roomIds.has(connection.to)
  );
  const staticRooms = rooms.filter((room) => STATIC_ROOM_IDS.includes(room.id));
  const newRooms = rooms.filter((room) => !STATIC_ROOM_IDS.includes(room.id));

  for (const room of newRooms) {
    const anchor = pickBestRelatedRoom(
      room,
      staticRooms.length > 0 ? staticRooms : rooms.filter((other) => other.id !== room.id)
    );
    if (!anchor) continue;

    const duplicate = result.some(
      (connection) =>
        (connection.from === room.id && connection.to === anchor.id) ||
        (connection.from === anchor.id && connection.to === room.id)
    );
    if (!duplicate) result.push({ from: anchor.id, to: room.id });
  }

  return result;
}

function sortRoomsForGraph(rooms: ForumRoom[]): ForumRoom[] {
  const staticOrder = new Map(STATIC_ROOM_IDS.map((id, index) => [id, index]));
  return [...rooms].sort((a, b) => {
    const aStatic = staticOrder.get(a.id);
    const bStatic = staticOrder.get(b.id);
    if (aStatic !== undefined && bStatic !== undefined) return aStatic - bStatic;
    if (aStatic !== undefined) return -1;
    if (bStatic !== undefined) return 1;
    return b.postCount + b.participantCount - (a.postCount + a.participantCount);
  });
}

function computeGraphPoints(rooms: ForumRoom[]): Record<string, GraphPoint> {
  const points: Record<string, GraphPoint> = {};
  const centerX = GRAPH_WIDTH / 2;
  const centerY = GRAPH_HEIGHT / 2;
  const staticRooms = rooms.filter((room) => STATIC_ROOM_IDS.includes(room.id));
  const dynamicRooms = rooms.filter((room) => !STATIC_ROOM_IDS.includes(room.id));
  const staticAngles = [-105, -38, 33, 154, 90, -168];

  staticRooms.forEach((room, index) => {
    const order = Math.max(0, STATIC_ROOM_IDS.indexOf(room.id));
    const angle = (staticAngles[order] ?? (index / Math.max(1, staticRooms.length)) * 360) * (Math.PI / 180);
    const radiusX = 300 + (index % 2) * 34;
    const radiusY = 208 + (index % 3) * 22;
    points[room.id] = {
      id: room.id,
      x: centerX + Math.cos(angle) * radiusX,
      y: centerY + Math.sin(angle) * radiusY,
      z: (index % 5 - 2) * 18,
    };
  });

  if (staticRooms.length === 0 && rooms[0]) {
    points[rooms[0].id] = { id: rooms[0].id, x: centerX, y: centerY, z: 20 };
  }

  const branchCountByAnchor = new Map<string, number>();
  dynamicRooms.forEach((room, index) => {
    const anchor = pickBestRelatedRoom(room, staticRooms.length > 0 ? staticRooms : rooms.filter((other) => other.id !== room.id));
    const anchorPoint = anchor ? points[anchor.id] : null;
    const branchIndex = anchor ? branchCountByAnchor.get(anchor.id) ?? 0 : index;
    if (anchor) branchCountByAnchor.set(anchor.id, branchIndex + 1);

    const ring = Math.floor(branchIndex / 5);
    const angle = ((branchIndex % 5) / 5) * Math.PI * 2 + index * 0.37;
    const distance = 96 + ring * 74;
    const baseX = anchorPoint?.x ?? centerX;
    const baseY = anchorPoint?.y ?? centerY;

    points[room.id] = {
      id: room.id,
      x: clampNumber(baseX + Math.cos(angle) * distance, 86, GRAPH_WIDTH - 86),
      y: clampNumber(baseY + Math.sin(angle) * distance, 74, GRAPH_HEIGHT - 74),
      z: ((index % 7) - 3) * 14,
    };
  });

  return points;
}

function readSavedLayout(): Record<string, DragOffset> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(FORUM_MAP_LAYOUT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, DragOffset>;
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) =>
        typeof value?.x === "number" && typeof value?.y === "number"
      )
    );
  } catch {
    return {};
  }
}

function GraphEdges({
  points,
  offsets,
  connections,
  hoveredId,
}: {
  points: Record<string, GraphPoint>;
  offsets: Record<string, DragOffset>;
  connections: BubbleConnection[];
  hoveredId: string | null;
}) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      width={GRAPH_WIDTH}
      height={GRAPH_HEIGHT}
      viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="forum-node-glow">
          <stop offset="0%" stopColor="rgb(15 23 42)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="rgb(15 23 42)" stopOpacity="0" />
        </radialGradient>
      </defs>
      {connections.map(({ from, to }) => {
        const fromPoint = points[from];
        const toPoint = points[to];
        if (!fromPoint || !toPoint) return null;

        const fromOffset = offsets[from] ?? { x: 0, y: 0 };
        const toOffset = offsets[to] ?? { x: 0, y: 0 };
        const x1 = fromPoint.x + fromOffset.x;
        const y1 = fromPoint.y + fromOffset.y;
        const x2 = toPoint.x + toOffset.x;
        const y2 = toPoint.y + toOffset.y;
        const highlighted = hoveredId === from || hoveredId === to;

        return (
          <line
            key={`${from}-${to}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={highlighted ? "rgb(15 23 42)" : "rgb(100 116 139)"}
            strokeOpacity={highlighted ? 0.34 : 0.16}
            strokeWidth={highlighted ? 1.4 : 0.8}
            vectorEffect="non-scaling-stroke"
            className="transition-all duration-300"
          />
        );
      })}
    </svg>
  );
}

function GraphNode({
  room,
  point,
  offset,
  isLinked,
  isDimmed,
  isDragging,
  onHover,
  onDragStart,
  onDragMove,
  onDragEnd,
  onOpenAttempt,
}: {
  room: ForumRoom;
  point: GraphPoint;
  offset: DragOffset;
  isLinked: boolean;
  isDimmed: boolean;
  isDragging: boolean;
  onHover: (id: string | null) => void;
  onDragStart: (id: string, event: ReactPointerEvent<HTMLAnchorElement>) => void;
  onDragMove: (event: ReactPointerEvent<HTMLAnchorElement>) => void;
  onDragEnd: (event: ReactPointerEvent<HTMLAnchorElement>) => void;
  onOpenAttempt: (event: ReactMouseEvent<HTMLAnchorElement>) => void;
}) {
  const active = isRoomActive(room.lastPostedAt);
  const nodeSize = active || room.postCount > 0 ? 13 : 10;

  return (
    <Link
      href={`/forum/${room.id}`}
      draggable={false}
      aria-label={`${room.name}の部屋へ移動`}
      onPointerDown={(event) => onDragStart(room.id, event)}
      onPointerMove={onDragMove}
      onPointerUp={onDragEnd}
      onPointerCancel={onDragEnd}
      onMouseEnter={() => onHover(room.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(room.id)}
      onBlur={() => onHover(null)}
      onClick={onOpenAttempt}
      className={[
        "group absolute block cursor-grab touch-none select-none outline-none active:cursor-grabbing",
        "transition-[opacity,filter] duration-300",
        isDimmed ? "opacity-35 blur-[0.2px]" : "opacity-100",
      ].join(" ")}
      style={{
        left: point.x,
        top: point.y,
        transform: `translate3d(${offset.x}px, ${offset.y}px, ${isDragging ? 90 : point.z}px)`,
        zIndex: isDragging ? 50 : isLinked ? 30 : 20,
      }}
    >
      <span
        className={[
          "absolute left-0 top-0 rounded-full bg-[url(#forum-node-glow)]",
          "transition-all duration-300",
          isLinked || isDragging ? "opacity-100" : "opacity-0",
        ].join(" ")}
        style={{
          width: 64,
          height: 64,
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(circle, rgba(15,23,42,0.16), transparent 62%)",
        }}
        aria-hidden
      />
      <span
        className={[
          "absolute left-0 top-0 grid place-items-center rounded-full border shadow-sm transition-all duration-300",
          active ? "border-emerald-300 bg-emerald-500" : "border-slate-300 bg-slate-700",
          isLinked || isDragging
            ? "scale-125 shadow-[0_0_0_7px_rgba(15,23,42,0.08),0_16px_34px_rgba(15,23,42,0.22)]"
            : "group-hover:scale-125 group-hover:shadow-[0_0_0_6px_rgba(15,23,42,0.08)]",
        ].join(" ")}
        style={{
          width: nodeSize,
          height: nodeSize,
          transform: "translate(-50%, -50%)",
        }}
      >
        {active && <span className="h-1.5 w-1.5 rounded-full bg-white/95" />}
      </span>
      <span
        className={[
          "absolute left-3 top-1/2 flex min-w-max -translate-y-1/2 items-center gap-1.5 rounded-full px-2 py-1",
          "text-[11px] font-medium leading-none tracking-[-0.01em] text-slate-700 transition-all duration-300",
          "group-hover:bg-white/90 group-hover:text-slate-950 group-hover:shadow-[0_12px_30px_rgba(15,23,42,0.10)]",
          isLinked || isDragging ? "bg-white/95 text-slate-950 shadow-[0_12px_30px_rgba(15,23,42,0.12)]" : "",
        ].join(" ")}
      >
        <span className="hidden rounded-full bg-slate-100 p-0.5 group-hover:inline-flex">
          <ForumRoomIcon roomId={room.id} size={12} />
        </span>
        <span>{room.name}</span>
      </span>
      <span className="absolute left-3 top-[calc(50%+16px)] hidden min-w-max rounded-xl border border-white/80 bg-white/95 px-3 py-2 text-[11px] text-slate-500 shadow-[0_20px_50px_rgba(15,23,42,0.15)] backdrop-blur-xl group-hover:block">
        <span className="mb-1 block max-w-[220px] text-xs font-semibold text-slate-950 line-clamp-1">
          {room.weeklyTopic || room.description}
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageSquare className="h-3 w-3" />
          {room.postCount}
        </span>
        <span className="ml-3 inline-flex items-center gap-1">
          <Users className="h-3 w-3" />
          {room.participantCount}
        </span>
      </span>
    </Link>
  );
}

function OnboardingHint({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/70 bg-white/85 px-5 py-2 text-xs text-slate-600 shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl"
    >
      <span>点をドラッグで移動、背景ドラッグでパン、クリックで部屋へ移動</span>
      <button
        type="button"
        aria-label="ヒントを閉じる"
        onClick={onClose}
        className="rounded-full p-0.5 transition-colors hover:bg-slate-100"
      >
        <X className="h-3 w-3 text-slate-500" />
      </button>
    </div>
  );
}

export function ForumBubbleView({ rooms }: { rooms: ForumRoom[] }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [scale, setScale] = useState(0.92);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragOffsets, setDragOffsets] = useState<Record<string, DragOffset>>(() => readSavedLayout());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [viewTilt, setViewTilt] = useState<ViewTilt>({ rotateX: 0, rotateY: 0 });
  const [perspectiveEnabled, setPerspectiveEnabled] = useState(true);
  const dragSessionRef = useRef<DragSession | null>(null);
  const panSessionRef = useRef<PanSession | null>(null);
  const skipNextClickRef = useRef(false);

  const displayRooms = useMemo(() => sortRoomsForGraph(rooms), [rooms]);
  const points = useMemo(() => computeGraphPoints(displayRooms), [displayRooms]);
  const connections = useMemo(() => computeRoomConnections(displayRooms), [displayRooms]);
  const connectedIds = useMemo(() => {
    if (!hoveredId) return new Set<string>();
    return new Set(
      connections
        .filter((connection) => connection.from === hoveredId || connection.to === hoveredId)
        .flatMap((connection) => [connection.from, connection.to])
    );
  }, [connections, hoveredId]);

  useEffect(() => {
    const seen = localStorage.getItem("forum_bubble_hint_v1");
    if (!seen) {
      const showTimer = setTimeout(() => setShowHint(true), 0);
      const timer = setTimeout(() => {
        localStorage.setItem("forum_bubble_hint_v1", "1");
        setShowHint(false);
      }, 6000);
      return () => {
        clearTimeout(showTimer);
        clearTimeout(timer);
      };
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(FORUM_MAP_LAYOUT_STORAGE_KEY, JSON.stringify(dragOffsets));
  }, [dragOffsets]);

  const applyZoom = (next: number) => {
    setScale(Math.min(MAP_ZOOM_MAX, Math.max(MAP_ZOOM_MIN, +next.toFixed(2))));
  };

  const handleNodeDragStart = useCallback((
    id: string,
    event: ReactPointerEvent<HTMLAnchorElement>
  ) => {
    if (event.button !== 0) return;
    event.stopPropagation();
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
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [dragOffsets]);

  const handleNodeDragMove = useCallback((event: ReactPointerEvent<HTMLAnchorElement>) => {
    const session = dragSessionRef.current;
    if (!session) return;
    event.stopPropagation();

    const dx = (event.clientX - session.startX) / scale;
    const dy = (event.clientY - session.startY) / scale;
    if (Math.abs(dx) + Math.abs(dy) > 3) {
      session.moved = true;
      skipNextClickRef.current = true;
    }

    setDragOffsets((prev) => ({
      ...prev,
      [session.id]: {
        x: session.originX + dx,
        y: session.originY + dy,
      },
    }));
  }, [scale]);

  const handleNodeDragEnd = useCallback((event: ReactPointerEvent<HTMLAnchorElement>) => {
    const session = dragSessionRef.current;
    if (!session) return;
    event.stopPropagation();

    if (event.currentTarget.hasPointerCapture(session.pointerId)) {
      event.currentTarget.releasePointerCapture(session.pointerId);
    }
    if (session.moved) {
      skipNextClickRef.current = true;
      window.setTimeout(() => {
        skipNextClickRef.current = false;
      }, 0);
    }
    dragSessionRef.current = null;
    setDraggingId(null);
  }, []);

  const handleNodeOpenAttempt = useCallback((event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (!skipNextClickRef.current) return;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleGraphPanStart = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
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
  }, [draggingId, pan]);

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

  const handleResetLayout = useCallback(() => {
    setDragOffsets({});
    setPan({ x: 0, y: 0 });
    setViewTilt({ rotateX: 0, rotateY: 0 });
    setScale(0.92);
  }, []);

  const handlePerspectiveMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!perspectiveEnabled || draggingId || panSessionRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    setViewTilt({
      rotateX: Number((-py * 14).toFixed(2)),
      rotateY: Number((px * 18).toFixed(2)),
    });
  }, [draggingId, perspectiveEnabled]);

  const handlePerspectiveLeave = useCallback(() => {
    if (!draggingId) setViewTilt({ rotateX: 0, rotateY: 0 });
  }, [draggingId]);

  const dismissHint = () => {
    localStorage.setItem("forum_bubble_hint_v1", "1");
    setShowHint(false);
  };

  return (
    <section className="space-y-5">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
          Graph View
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-3xl">
          話題のつながりを、グラフで探索する
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-500">
          Obsidianのグラフビューのように、部屋を小さなノードとして表示します。点はドラッグでき、背景ドラッグで視点を移動できます。
        </p>
      </div>

      <div
        className="relative h-[620px] overflow-hidden rounded-[34px] border border-slate-200/70 bg-[#fbfbfa] shadow-[0_28px_80px_rgba(15,23,42,0.08)]"
        onPointerMove={handlePerspectiveMove}
        onPointerLeave={handlePerspectiveLeave}
        style={{ perspective: 950 }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.05),transparent_58%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.06)_1px,transparent_0)] [background-size:26px_26px] opacity-30" />

        <div className="absolute right-4 top-4 z-40 flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/85 p-1 shadow-[0_12px_34px_rgba(15,23,42,0.10)] backdrop-blur-xl">
          <button
            type="button"
            aria-label="3D視点を切り替え"
            aria-pressed={perspectiveEnabled}
            className={[
              "grid h-8 w-8 place-items-center rounded-full transition-colors",
              perspectiveEnabled ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100",
            ].join(" ")}
            onClick={() => {
              setPerspectiveEnabled((value) => !value);
              setViewTilt({ rotateX: 0, rotateY: 0 });
            }}
          >
            <Box className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="配置をリセット"
            className="grid h-8 w-8 place-items-center rounded-full text-slate-500 transition-colors hover:bg-slate-100"
            onClick={handleResetLayout}
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="マップを縮小"
            className="grid h-8 w-8 place-items-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-35"
            disabled={scale <= MAP_ZOOM_MIN + 1e-6}
            onClick={() => applyZoom(scale - MAP_ZOOM_STEP)}
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="マップを拡大"
            className="grid h-8 w-8 place-items-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-35"
            disabled={scale >= MAP_ZOOM_MAX - 1e-6}
            onClick={() => applyZoom(scale + MAP_ZOOM_STEP)}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div
          className="absolute left-1/2 top-1/2 cursor-grab touch-none active:cursor-grabbing"
          onPointerDown={handleGraphPanStart}
          onPointerMove={handleGraphPanMove}
          onPointerUp={handleGraphPanEnd}
          onPointerCancel={handleGraphPanEnd}
          style={{
            width: GRAPH_WIDTH,
            height: GRAPH_HEIGHT,
            transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) rotateX(${perspectiveEnabled ? viewTilt.rotateX : 0}deg) rotateY(${perspectiveEnabled ? viewTilt.rotateY : 0}deg) scale(${scale})`,
            transformOrigin: "center center",
            transformStyle: "preserve-3d",
            transition: isPanning || draggingId ? "none" : "transform 360ms cubic-bezier(.2,.8,.2,1)",
          }}
        >
          <GraphEdges
            points={points}
            offsets={dragOffsets}
            connections={connections}
            hoveredId={hoveredId}
          />
          {displayRooms.map((room) => {
            const point = points[room.id];
            if (!point) return null;
            const isConnectedToHover = connectedIds.has(room.id);
            return (
              <GraphNode
                key={room.id}
                room={room}
                point={point}
                offset={dragOffsets[room.id] ?? { x: 0, y: 0 }}
                isLinked={isConnectedToHover || hoveredId === room.id}
                isDimmed={!!hoveredId && !isConnectedToHover && hoveredId !== room.id}
                isDragging={draggingId === room.id}
                onHover={setHoveredId}
                onDragStart={handleNodeDragStart}
                onDragMove={handleNodeDragMove}
                onDragEnd={handleNodeDragEnd}
                onOpenAttempt={handleNodeOpenAttempt}
              />
            );
          })}
        </div>

        <div className="absolute bottom-4 left-4 z-30 flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/85 px-3 py-2 text-[11px] text-slate-500 shadow-sm backdrop-blur-xl">
          <Move className="h-3.5 w-3.5" />
          点をドラッグ / 背景をドラッグ / ホバーで関連を強調
        </div>

        {showHint && <OnboardingHint onClose={dismissHint} />}
      </div>
    </section>
  );
}
