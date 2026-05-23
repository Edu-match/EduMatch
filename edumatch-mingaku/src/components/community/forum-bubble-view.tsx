"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
import { ArrowUpRight, Box, MessageSquare, Minus, Move, Plus, RotateCcw, Sparkles, Users, X } from "lucide-react";
import type { ForumRoom } from "@/lib/mock-forum";
import { ForumRoomIcon } from "@/components/community/forum-room-icon";
import {
  BUBBLE_CONNECTIONS,
  isRoomActive,
  type BubbleConnection,
} from "@/components/community/forum-bubble-map";

type NodeRect = {
  x: number;
  y: number;
  width: number;
  height: number;
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

const MAP_ZOOM_MIN = 1;
const MAP_ZOOM_MAX = 1.35;
const MAP_ZOOM_STEP = 0.12;
const FORUM_MAP_LAYOUT_STORAGE_KEY = "edumatch-forum-map-layout-v1";

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

function sortRoomsForConstellation(rooms: ForumRoom[]): ForumRoom[] {
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

function TopicCard({
  room,
  isFeatured,
  isDimmed,
  isLinked,
  dragOffset,
  isDragging,
  setNodeRef,
  onHover,
  onDragStart,
  onDragMove,
  onDragEnd,
  onOpenAttempt,
}: {
  room: ForumRoom;
  isFeatured: boolean;
  isDimmed: boolean;
  isLinked: boolean;
  dragOffset: DragOffset;
  isDragging: boolean;
  setNodeRef: (id: string, node: HTMLAnchorElement | null) => void;
  onHover: (id: string | null) => void;
  onDragStart: (id: string, event: ReactPointerEvent<HTMLAnchorElement>) => void;
  onDragMove: (event: ReactPointerEvent<HTMLAnchorElement>) => void;
  onDragEnd: (event: ReactPointerEvent<HTMLAnchorElement>) => void;
  onOpenAttempt: (event: ReactMouseEvent<HTMLAnchorElement>) => void;
}) {
  const active = isRoomActive(room.lastPostedAt);
  const depth = isDragging ? 44 : isLinked ? 16 : 0;

  return (
    <Link
      ref={(node) => setNodeRef(room.id, node)}
      href={`/forum/${room.id}`}
      draggable={false}
      aria-label={`${room.name}の部屋へ移動`}
      title="ドラッグで配置を調整、クリックで部屋へ移動"
      onMouseEnter={() => onHover(room.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(room.id)}
      onBlur={() => onHover(null)}
      onPointerDown={(event) => onDragStart(room.id, event)}
      onPointerMove={onDragMove}
      onPointerUp={onDragEnd}
      onPointerCancel={onDragEnd}
      onClick={onOpenAttempt}
      className={[
        "group relative block min-h-[150px] rounded-[28px] border border-white/70 bg-white/80 p-4.5 text-left",
        "shadow-[0_18px_48px_rgba(15,23,42,0.08),0_1px_0_rgba(255,255,255,0.9)_inset]",
        "cursor-grab touch-none backdrop-blur-xl transition-[opacity,filter,box-shadow,border-color,background-color] duration-500 ease-out will-change-transform active:cursor-grabbing",
        "hover:-translate-y-1 hover:border-white hover:bg-white hover:shadow-[0_28px_70px_rgba(15,23,42,0.14),0_1px_0_rgba(255,255,255,0.95)_inset]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20",
        isFeatured ? "sm:col-span-2 lg:col-span-1 min-h-[176px] bg-white/90" : "",
        isDimmed ? "opacity-45 blur-[0.2px]" : "opacity-100",
        isLinked ? "ring-1 ring-slate-900/10" : "",
        isDragging ? "border-white bg-white shadow-[0_36px_90px_rgba(15,23,42,0.22),0_1px_0_rgba(255,255,255,0.95)_inset]" : "",
      ].join(" ")}
      style={{
        transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, ${depth}px) rotateX(${isDragging ? "-2.5deg" : "0deg"}) rotateY(${isDragging ? "3deg" : "0deg"})`,
        zIndex: isDragging ? 40 : isLinked ? 20 : 10,
      }}
    >
      <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
      <div className="absolute right-4 top-4 rounded-full border border-slate-200/70 bg-white/70 p-1.5 text-slate-300 opacity-0 shadow-sm backdrop-blur transition-opacity duration-300 group-hover:opacity-100">
        <Move className="h-3.5 w-3.5" aria-hidden />
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white to-slate-50 shadow-sm">
            <ForumRoomIcon roomId={room.id} size={22} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold leading-snug tracking-[-0.015em] text-slate-950 line-clamp-2">
              {room.name}
            </h3>
            <p className="mt-1 text-[11px] leading-5 text-slate-500 line-clamp-2">
              {room.description || room.weeklyTopic}
            </p>
          </div>
        </div>
        <ArrowUpRight
          className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-700"
          aria-hidden
        />
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200/70 bg-slate-50/70 px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.16em] text-slate-400">
          <Sparkles className="h-3 w-3" aria-hidden />
          TOPIC
        </p>
        <p className="mt-1.5 text-xs font-medium leading-5 text-slate-700 line-clamp-2">
          {room.weeklyTopic || "このテーマで自由に語り合いましょう。"}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-[11px] text-slate-500">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" aria-hidden />
            {room.postCount}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" aria-hidden />
            {room.participantCount}
          </span>
        </div>
        {active && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 font-medium text-emerald-700">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 motion-safe:animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Active
          </span>
        )}
      </div>
    </Link>
  );
}

function ConnectionLines({
  hoveredId,
  connections,
  nodeRects,
  surfaceRect,
}: {
  hoveredId: string | null;
  connections: BubbleConnection[];
  nodeRects: Record<string, NodeRect>;
  surfaceRect: NodeRect | null;
}) {
  if (!surfaceRect) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
      width={surfaceRect.width}
      height={surfaceRect.height}
      viewBox={`0 0 ${surfaceRect.width} ${surfaceRect.height}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="forum-connection-gradient" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="rgb(148 163 184)" stopOpacity="0.12" />
          <stop offset="50%" stopColor="rgb(15 23 42)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="rgb(148 163 184)" stopOpacity="0.12" />
        </linearGradient>
      </defs>
      {connections.map(({ from, to }) => {
        const fromRect = nodeRects[from];
        const toRect = nodeRects[to];
        if (!fromRect || !toRect) return null;

        const x1 = fromRect.x + fromRect.width / 2;
        const y1 = fromRect.y + fromRect.height / 2;
        const x2 = toRect.x + toRect.width / 2;
        const y2 = toRect.y + toRect.height / 2;
        const controlLift = Math.min(110, Math.max(42, Math.abs(x2 - x1) * 0.18));
        const c1x = x1;
        const c1y = y1 + (y2 > y1 ? controlLift : -controlLift);
        const c2x = x2;
        const c2y = y2 + (y2 > y1 ? -controlLift : controlLift);
        const highlighted = hoveredId === from || hoveredId === to;

        return (
          <path
            key={`${from}-${to}`}
            d={`M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`}
            fill="none"
            stroke={highlighted ? "rgb(15 23 42)" : "url(#forum-connection-gradient)"}
            strokeOpacity={highlighted ? 0.2 : 1}
            strokeWidth={highlighted ? 1.5 : 1}
            strokeLinecap="round"
            className="transition-all duration-300"
          />
        );
      })}
    </svg>
  );
}

function OnboardingHint({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/70 bg-white/85 px-5 py-2 text-xs text-slate-600 shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl"
    >
      <span>カードを選んで議論に参加できます</span>
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
  const [scale, setScale] = useState(1);
  const [nodeRects, setNodeRects] = useState<Record<string, NodeRect>>({});
  const [surfaceRect, setSurfaceRect] = useState<NodeRect | null>(null);
  const [dragOffsets, setDragOffsets] = useState<Record<string, DragOffset>>(() => readSavedLayout());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [viewTilt, setViewTilt] = useState<ViewTilt>({ rotateX: 0, rotateY: 0 });
  const [perspectiveEnabled, setPerspectiveEnabled] = useState(true);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef(new Map<string, HTMLAnchorElement>());
  const dragSessionRef = useRef<DragSession | null>(null);
  const skipNextClickRef = useRef(false);

  const displayRooms = useMemo(() => sortRoomsForConstellation(rooms), [rooms]);
  const connections = useMemo(() => computeRoomConnections(displayRooms), [displayRooms]);
  const connectedIds = useMemo(() => {
    if (!hoveredId) return new Set<string>();
    return new Set(
      connections
        .filter((connection) => connection.from === hoveredId || connection.to === hoveredId)
        .flatMap((connection) => [connection.from, connection.to])
    );
  }, [connections, hoveredId]);

  const setNodeRef = useCallback((id: string, node: HTMLAnchorElement | null) => {
    if (node) nodeRefs.current.set(id, node);
    else nodeRefs.current.delete(id);
  }, []);

  const measureNodes = useCallback(() => {
    const surface = surfaceRef.current;
    if (!surface) return;

    const surfaceBox = surface.getBoundingClientRect();
    const nextRects: Record<string, NodeRect> = {};
    for (const [id, node] of nodeRefs.current) {
      const box = node.getBoundingClientRect();
      nextRects[id] = {
        x: box.left - surfaceBox.left,
        y: box.top - surfaceBox.top,
        width: box.width,
        height: box.height,
      };
    }

    setSurfaceRect({
      x: 0,
      y: 0,
      width: surfaceBox.width,
      height: surfaceBox.height,
    });
    setNodeRects(nextRects);
  }, []);

  useLayoutEffect(() => {
    measureNodes();
  }, [displayRooms, dragOffsets, measureNodes, scale]);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;

    const observer = new ResizeObserver(() => measureNodes());
    observer.observe(surface);
    for (const node of nodeRefs.current.values()) observer.observe(node);
    window.addEventListener("resize", measureNodes);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measureNodes);
    };
  }, [displayRooms, measureNodes]);

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

  const handleCardDragStart = useCallback((
    id: string,
    event: ReactPointerEvent<HTMLAnchorElement>
  ) => {
    if (event.button !== 0) return;
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

  const handleCardDragMove = useCallback((event: ReactPointerEvent<HTMLAnchorElement>) => {
    const session = dragSessionRef.current;
    if (!session) return;

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

  const handleCardDragEnd = useCallback((event: ReactPointerEvent<HTMLAnchorElement>) => {
    const session = dragSessionRef.current;
    if (!session) return;

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

  const handleCardOpenAttempt = useCallback((event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (!skipNextClickRef.current) return;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleResetLayout = useCallback(() => {
    setDragOffsets({});
    setViewTilt({ rotateX: 0, rotateY: 0 });
    setScale(1);
  }, []);

  const handlePerspectiveMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!perspectiveEnabled || draggingId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    setViewTilt({
      rotateX: Number((-py * 7).toFixed(2)),
      rotateY: Number((px * 9).toFixed(2)),
    });
  }, [draggingId, perspectiveEnabled]);

  const handlePerspectiveLeave = useCallback(() => {
    setViewTilt({ rotateX: 0, rotateY: 0 });
  }, []);

  const dismissHint = () => {
    localStorage.setItem("forum_bubble_hint_v1", "1");
    setShowHint(false);
  };

  return (
    <section className="space-y-5">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
          Topic Constellation
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-3xl">
          話題の星座から、参加する部屋を選ぶ
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-500">
          カードはドラッグで配置調整できます。マップ面はポインタに合わせて、少しだけ立体的に傾きます。
        </p>
      </div>

      <div
        className="relative overflow-hidden rounded-[36px] border border-white/70 bg-[linear-gradient(180deg,#fbfbfd_0%,#f5f7fb_48%,#eef2f7_100%)] shadow-[0_32px_90px_rgba(15,23,42,0.10)]"
        onPointerMove={handlePerspectiveMove}
        onPointerLeave={handlePerspectiveLeave}
        style={{ perspective: 1200 }}
      >
        <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-sky-200/35 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-20 h-80 w-80 rounded-full bg-orange-100/70 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-emerald-100/50 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.08)_1px,transparent_0)] [background-size:28px_28px] opacity-40" />

        <div className="absolute right-4 top-4 z-30 flex items-center gap-1 rounded-full border border-white/70 bg-white/80 p-1 shadow-[0_12px_34px_rgba(15,23,42,0.12)] backdrop-blur-xl">
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

        <div className="overflow-auto">
          <div
            ref={surfaceRef}
            className="relative min-w-0 p-5 sm:p-7 lg:p-9"
            style={{
              transform: `rotateX(${perspectiveEnabled ? viewTilt.rotateX : 0}deg) rotateY(${perspectiveEnabled ? viewTilt.rotateY : 0}deg) scale(${scale})`,
              transformOrigin: "top center",
              transition: "transform 420ms cubic-bezier(.2,.8,.2,1)",
              transformStyle: "preserve-3d",
            }}
          >
            <ConnectionLines
              hoveredId={hoveredId}
              connections={connections}
              nodeRects={nodeRects}
              surfaceRect={surfaceRect}
            />
            <div className="relative z-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
              {displayRooms.map((room, index) => {
                const isFeatured = index < 3 && (room.postCount > 0 || STATIC_ROOM_IDS.includes(room.id));
                const isConnectedToHover = connectedIds.has(room.id);
                return (
                  <TopicCard
                    key={room.id}
                    room={room}
                    isFeatured={isFeatured}
                    isDimmed={!!hoveredId && !isConnectedToHover && hoveredId !== room.id}
                    isLinked={isConnectedToHover || hoveredId === room.id}
                    dragOffset={dragOffsets[room.id] ?? { x: 0, y: 0 }}
                    isDragging={draggingId === room.id}
                    setNodeRef={setNodeRef}
                    onHover={setHoveredId}
                    onDragStart={handleCardDragStart}
                    onDragMove={handleCardDragMove}
                    onDragEnd={handleCardDragEnd}
                    onOpenAttempt={handleCardOpenAttempt}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <div className="relative z-10 border-t border-white/60 bg-white/45 px-5 py-4 backdrop-blur-xl sm:px-7">
          <div className="flex flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>{displayRooms.length} rooms connected by theme</span>
            <span>ドラッグで移動 / 3Dボタンで視点切替 / リセットで初期配置へ</span>
          </div>
        </div>

        {showHint && <OnboardingHint onClose={dismissHint} />}
      </div>
    </section>
  );
}
