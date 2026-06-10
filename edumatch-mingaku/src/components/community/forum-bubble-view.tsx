"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import Link from "next/link";
import {
  MessageSquare,
  Minus,
  Move,
  Plus,
  RotateCcw,
  Users,
  X,
  Zap,
} from "lucide-react";
import type { ForumRoom } from "@/lib/mock-forum";
import { ForumRoomIcon } from "@/components/community/forum-room-icon";
import { ForumHotFlame } from "@/components/community/forum-hot-flame";
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

const BASE_GRAPH_WIDTH = 1120;
const BASE_GRAPH_HEIGHT = 720;
const MAP_ZOOM_MIN = 0.72;
const MAP_ZOOM_MAX = 1.8;
const MAP_ZOOM_STEP = 0.12;
const FORUM_MAP_LAYOUT_STORAGE_KEY = "edumatch-forum-graph-layout-v3";

type ZoomDetailLevel = "overview" | "compact" | "standard" | "detail";

const ZOOM_LEVEL_LABELS: Record<ZoomDetailLevel, string> = {
  overview: "全体",
  compact: "概要",
  standard: "標準",
  detail: "詳細",
};

function getZoomDetailLevel(scale: number): ZoomDetailLevel {
  if (scale < 0.88) return "overview";
  if (scale < 1.08) return "compact";
  if (scale < 1.42) return "standard";
  return "detail";
}

function getDefaultScale(roomCount: number): number {
  if (roomCount >= 20) return 0.82;
  return 0.86;
}

function getGraphDimensions(detailLevel: ZoomDetailLevel, roomCount: number) {
  const levelScale =
    detailLevel === "detail" ? 1.1 :
    detailLevel === "standard" ? 1.04 :
    detailLevel === "compact" ? 1.02 : 1;
  const countScale = 1 + Math.min(0.16, Math.max(0, roomCount - 10) * 0.02);
  return {
    width: Math.round(BASE_GRAPH_WIDTH * levelScale * countScale),
    height: Math.round(BASE_GRAPH_HEIGHT * levelScale * countScale),
  };
}

function getLayoutSpread(detailLevel: ZoomDetailLevel): number {
  if (detailLevel === "detail") return 1.2;
  if (detailLevel === "standard") return 1.1;
  if (detailLevel === "compact") return 1.04;
  return 1;
}

function spreadPointsFromCenter(
  points: Record<string, GraphPoint>,
  factor: number,
  centerX: number,
  centerY: number
) {
  if (factor <= 1) return;
  for (const id of Object.keys(points)) {
    points[id].x = centerX + (points[id].x - centerX) * factor;
    points[id].y = centerY + (points[id].y - centerY) * factor;
  }
}

const SEMANTIC_KEYWORD_GROUPS = [
  ["ai", "ＡＩ", "生成ai", "人工知能", "aiツール", "aiリテラシー", "機械学習"],
  ["giga", "端末", "ict", "デジタル", "教科書", "オンライン", "遠隔", "テクノロジー"],
  ["教員", "先生", "教師", "働き方", "長時間", "業務", "効率化", "校務"],
  ["不登校", "多様", "支援", "特別支援", "発達", "学び", "居場所"],
  ["格差", "edtech", "教育格差", "貧困", "地域", "アクセス"],
  ["海外", "日本", "グローバル", "国際", "英語", "留学"],
  ["保護者", "家庭", "子ども", "こども", "小学生", "中学生", "高校生"],
  ["探究", "steam", "stem", "プロジェクト", "ワークショップ", "創造"],
  ["金融", "お金", "キャリア", "起業", "社会"],
  ["エンターテインメント", "ゲーム", "sns", "メディア", "動画"],
];

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
  const aText = `${a.name} ${a.description}`;
  const bText = `${b.name} ${b.description}`;
  const aNormalized = normalizeRoomText(aText);
  const bNormalized = normalizeRoomText(bText);
  const aKw = extractKeywords(aText);
  const bKw = extractKeywords(bText);

  let overlap = 0;
  for (const token of aKw) {
    if (bKw.has(token)) overlap += token.length >= 3 ? 3 : 1;
  }

  for (const group of SEMANTIC_KEYWORD_GROUPS) {
    const aHit = group.some((keyword) => aNormalized.includes(keyword.toLowerCase()));
    const bHit = group.some((keyword) => bNormalized.includes(keyword.toLowerCase()));
    if (aHit && bHit) overlap += 7;
  }

  return overlap;
}

function computeRoomConnections(rooms: ForumRoom[]): BubbleConnection[] {
  const roomIds = new Set(rooms.map((room) => room.id));
  const result: BubbleConnection[] = [];
  const degree = new Map<string, number>();

  const addConnection = (from: string, to: string) => {
    if (from === to || !roomIds.has(from) || !roomIds.has(to)) return;
    const duplicate = result.some(
      (connection) =>
        (connection.from === from && connection.to === to) ||
        (connection.from === to && connection.to === from)
    );
    if (duplicate) return;
    result.push({ from, to });
    degree.set(from, (degree.get(from) ?? 0) + 1);
    degree.set(to, (degree.get(to) ?? 0) + 1);
  };

  for (const connection of BUBBLE_CONNECTIONS) {
    addConnection(connection.from, connection.to);
  }

  for (const room of rooms) {
    const candidates = rooms
      .filter((other) => other.id !== room.id)
      .map((other) => ({ room: other, score: similarityScore(room, other) }))
      .sort((a, b) => b.score - a.score);

    let addedForRoom = 0;
    for (const candidate of candidates) {
      const currentDegree = degree.get(room.id) ?? 0;
      const targetDegree = degree.get(candidate.room.id) ?? 0;
      const strongEnough = candidate.score >= 7 || (addedForRoom === 0 && candidate.score > 0);
      if (!strongEnough || currentDegree >= 3 || targetDegree >= 4) continue;

      addConnection(room.id, candidate.room.id);
      addedForRoom += 1;
      if (addedForRoom >= 2) break;
    }
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

function computeCircularRoomOrder(
  rooms: ForumRoom[],
  connections: BubbleConnection[]
): string[] {
  const adjacency = new Map<string, Set<string>>();
  const roomIds = rooms.map((room) => room.id);
  for (const id of roomIds) adjacency.set(id, new Set());
  for (const connection of connections) {
    adjacency.get(connection.from)?.add(connection.to);
    adjacency.get(connection.to)?.add(connection.from);
  }

  const degree = new Map<string, number>(
    roomIds.map((id) => [id, adjacency.get(id)?.size ?? 0])
  );
  const roomById = new Map(rooms.map((room) => [room.id, room]));
  const unvisited = new Set(roomIds);
  const order: string[] = [];

  while (unvisited.size > 0) {
    const seed = [...unvisited].sort((a, b) => {
      const degDiff = (degree.get(b) ?? 0) - (degree.get(a) ?? 0);
      if (degDiff !== 0) return degDiff;
      return (roomById.get(b)?.postCount ?? 0) - (roomById.get(a)?.postCount ?? 0);
    })[0];

    const queue = [seed];
    unvisited.delete(seed);
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;
      order.push(current);

      const neighbors = [...(adjacency.get(current) ?? [])]
        .filter((id) => unvisited.has(id))
        .sort((a, b) => {
          const scoreA = similarityScore(roomById.get(current)!, roomById.get(a)!);
          const scoreB = similarityScore(roomById.get(current)!, roomById.get(b)!);
          return scoreB - scoreA;
        });

      for (const next of neighbors) {
        unvisited.delete(next);
        queue.push(next);
      }
    }
  }

  return order;
}

function computeGraphPoints(
  rooms: ForumRoom[],
  connections: BubbleConnection[],
  graphWidth: number,
  graphHeight: number
): Record<string, GraphPoint> {
  const points: Record<string, GraphPoint> = {};
  const centerX = graphWidth / 2;
  const centerY = graphHeight / 2;
  const radius = Math.min(graphWidth, graphHeight) * 0.36;
  const innerOffset = Math.min(graphWidth, graphHeight) * 0.07;
  const orderedIds = computeCircularRoomOrder(rooms, connections);
  const degree = new Map<string, number>();
  for (const id of orderedIds) degree.set(id, 0);
  for (const edge of connections) {
    degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1);
    degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1);
  }

  orderedIds.forEach((id, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(1, orderedIds.length);
    const layerJitter = orderedIds.length >= 18 ? (index % 2 === 0 ? innerOffset : -innerOffset) : 0;
    const nodeRadius = radius + layerJitter;
    points[id] = {
      id,
      x: centerX + Math.cos(angle) * nodeRadius,
      y: centerY + Math.sin(angle) * nodeRadius,
      z: clampNumber((degree.get(id) ?? 0) * 4 - 8, -10, 16),
    };
  });

  return points;
}

/**
 * コメント数・参加者数からバブルの直径を計算（overview モード専用）。
 * sqrt スケーリング: 0件=32px, 4件=42px, 9件=47px, 25件=57px, 64件=72px
 */
function computeActivityDiameter(room: ForumRoom): number {
  const activity = room.postCount + room.participantCount;
  return Math.min(72, 32 + Math.round(Math.sqrt(Math.max(0, activity)) * 5));
}

/**
 * 投稿数が一定以上かつ直近24h以内に投稿があるルームを「盛り上がり中」と判定。
 */
function isRoomHot(room: ForumRoom): boolean {
  return room.postCount + room.participantCount >= 5 && isRoomActive(room.lastPostedAt);
}

function estimateNodeSize(room: ForumRoom, detailLevel: ZoomDetailLevel): { width: number; height: number } {
  const visibleNameLength = Math.min(room.name.length, 18);
  const topicLength = (room.description || room.name).length;

  switch (detailLevel) {
    case "overview": {
      const d = computeActivityDiameter(room);
      return { width: d, height: d };
    }
    case "compact":
      return { width: clampNumber(88 + visibleNameLength * 7, 108, 168), height: 34 };
    case "detail":
      return {
        width: clampNumber(118 + visibleNameLength * 10, 170, 250),
        height: topicLength > 36 ? 62 : 56,
      };
    default:
      return { width: clampNumber(96 + visibleNameLength * 9, 132, 240), height: 50 };
  }
}

function collisionPaddingForLevel(detailLevel: ZoomDetailLevel): number {
  if (detailLevel === "overview") return 18;
  if (detailLevel === "compact") return 28;
  if (detailLevel === "standard") return 38;
  return 48;
}

function resolveGraphCollisions(
  initialPoints: Record<string, GraphPoint>,
  rooms: ForumRoom[],
  detailLevel: ZoomDetailLevel,
  graphWidth: number,
  graphHeight: number
): Record<string, GraphPoint> {
  const points = Object.fromEntries(
    Object.entries(initialPoints).map(([id, point]) => [id, { ...point }])
  ) as Record<string, GraphPoint>;
  const roomById = new Map(rooms.map((room) => [room.id, room]));
  const ids = Object.keys(points);
  const padding = collisionPaddingForLevel(detailLevel);
  const iterations = detailLevel === "detail" ? 150 : detailLevel === "standard" ? 120 : 90;

  spreadPointsFromCenter(points, getLayoutSpread(detailLevel), graphWidth / 2, graphHeight / 2);

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        const a = points[ids[i]];
        const b = points[ids[j]];
        const aRoom = roomById.get(a.id);
        const bRoom = roomById.get(b.id);
        if (!aRoom || !bRoom) continue;

        const aSize = estimateNodeSize(aRoom, detailLevel);
        const bSize = estimateNodeSize(bRoom, detailLevel);
        const minX = (aSize.width + bSize.width) / 2 + padding;
        const minY = (aSize.height + bSize.height) / 2 + padding;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const overlapX = minX - Math.abs(dx);
        const overlapY = minY - Math.abs(dy);

        if (overlapX <= 0 || overlapY <= 0) continue;

        const dist = Math.hypot(dx, dy) || 1;
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = Math.max(overlapX, overlapY);
        const push = overlap / 2 + (detailLevel === "detail" ? 2 : 1);

        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
      }
    }

    for (const id of ids) {
      const room = roomById.get(id);
      if (!room) continue;
      const size = estimateNodeSize(room, detailLevel);
      const margin = Math.max(32, padding * 0.5);
      points[id].x = clampNumber(points[id].x, size.width / 2 + margin, graphWidth - size.width / 2 - margin);
      points[id].y = clampNumber(points[id].y, size.height / 2 + margin, graphHeight - size.height / 2 - margin);
    }
  }

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
  detailLevel,
  graphWidth,
  graphHeight,
}: {
  points: Record<string, GraphPoint>;
  offsets: Record<string, DragOffset>;
  connections: BubbleConnection[];
  hoveredId: string | null;
  detailLevel: ZoomDetailLevel;
  graphWidth: number;
  graphHeight: number;
}) {
  const baseOpacity =
    detailLevel === "overview" ? 0.34 :
    detailLevel === "compact" ? 0.28 :
    detailLevel === "standard" ? 0.22 :
    0.18;
  const baseWidth =
    detailLevel === "overview" ? 1.25 :
    detailLevel === "compact" ? 1.1 :
    detailLevel === "standard" ? 1 :
    0.95;
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      width={graphWidth}
      height={graphHeight}
      viewBox={`0 0 ${graphWidth} ${graphHeight}`}
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
            stroke={highlighted ? "rgb(15 23 42)" : "rgb(71 85 105)"}
            strokeOpacity={highlighted ? Math.min(baseOpacity + 0.28, 0.62) : baseOpacity}
            strokeWidth={highlighted ? 1.6 * baseWidth : 1.05 * baseWidth}
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
  detailLevel,
  allowOverview,
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
  detailLevel: ZoomDetailLevel;
  allowOverview: boolean;
  onHover: (id: string | null) => void;
  onDragStart: (id: string, event: ReactPointerEvent<HTMLAnchorElement>) => void;
  onDragMove: (event: ReactPointerEvent<HTMLAnchorElement>) => void;
  onDragEnd: (event: ReactPointerEvent<HTMLAnchorElement>) => void;
  onOpenAttempt: (event: ReactMouseEvent<HTMLAnchorElement>) => void;
}) {
  const active = isRoomActive(room.lastPostedAt);
  const hot = isRoomHot(room);
  const isOverview = allowOverview && detailLevel === "overview";
  const isCompact = detailLevel === "compact";
  const activityDiameter = isOverview ? computeActivityDiameter(room) : 0;
  const iconSize = isOverview
    ? Math.max(10, Math.round(activityDiameter * 0.4))
    : isCompact ? 14 : 15;

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
        "group absolute cursor-grab touch-none select-none outline-none active:cursor-grabbing",
        "transition-[opacity,filter,box-shadow,border-color,background-color,padding] duration-300",
        "focus-visible:ring-2 focus-visible:ring-slate-900/20",
        isOverview
          ? "inline-flex items-center justify-center"
          : hot
            ? "inline-flex items-center gap-2 rounded-full border border-orange-200/80 bg-orange-50/80 text-left shadow-[0_10px_28px_rgba(251,146,60,0.18)] backdrop-blur-xl hover:border-orange-200 hover:bg-orange-50 hover:shadow-[0_18px_44px_rgba(251,146,60,0.28)]"
            : "inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/82 text-left shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-xl hover:border-white hover:bg-white hover:shadow-[0_18px_44px_rgba(15,23,42,0.14)]",
        !isOverview && (isCompact ? "px-2 py-1" : "px-2.5 py-1.5"),
        isDimmed ? "opacity-35 blur-[0.2px]" : "opacity-100",
        !isOverview && (isLinked || isDragging) ? "border-white bg-white shadow-[0_20px_52px_rgba(15,23,42,0.16)]" : "",
      ].join(" ")}
      style={{
        left: point.x,
        top: point.y,
        transform: `translate(${offset.x}px, ${offset.y}px) translate(-50%, -50%)`,
        zIndex: isDragging ? 50 : isLinked ? 30 : 20,
      }}
    >
      {!isOverview && (
        <span
          className={[
            "absolute left-0 top-0 rounded-full transition-all duration-300",
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
      )}
      <span
        className={[
          "relative grid shrink-0 place-items-center rounded-full border shadow-sm transition-all duration-300",
          // overview は inline style でサイズ上書き、非 overview は固定クラス
          !isOverview && (isCompact ? "h-6 w-6" : "h-7 w-7"),
          hot
            ? "border-orange-200 bg-orange-50 text-orange-700"
            : active
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-slate-50 text-slate-700",
          isLinked || isDragging || isOverview
            ? hot
              ? "shadow-[0_0_0_6px_rgba(251,146,60,0.18),0_0_16px_rgba(251,146,60,0.30)]"
              : "shadow-[0_0_0_5px_rgba(15,23,42,0.06)]"
            : hot
              ? "group-hover:shadow-[0_0_0_6px_rgba(251,146,60,0.22)]"
              : "group-hover:shadow-[0_0_0_5px_rgba(15,23,42,0.05)]",
        ].filter(Boolean).join(" ")}
        style={isOverview ? { width: activityDiameter, height: activityDiameter } : undefined}
      >
        <ForumRoomIcon roomId={room.id} emoji={room.emoji} size={iconSize} />
        {/* 通常のアクティブ表示（hot でない場合のみ） */}
        {active && !hot && (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-white bg-emerald-500" />
        )}
        {/* 盛り上がり中は炎アイコン */}
        {hot && (
          <span className="absolute -right-1 -top-1 z-10">
            <ForumHotFlame size="sm" />
          </span>
        )}
      </span>

      {!isOverview && (
        <span className="flex max-w-[172px] flex-col gap-0.5">
          <span className={[
            "truncate font-semibold leading-tight tracking-[-0.015em] text-slate-800 group-hover:text-slate-950",
            isCompact ? "text-[11px]" : "text-xs",
          ].join(" ")}>
            {room.name}
          </span>

          {!isCompact && (
            <span className="flex flex-wrap items-center gap-2 text-[10px] leading-none text-slate-400">
              <span className="inline-flex items-center gap-0.5">
                <MessageSquare className="h-2.5 w-2.5" />
                {room.postCount}
              </span>
              <span className="inline-flex items-center gap-0.5">
                <Users className="h-2.5 w-2.5" />
                {room.participantCount}
              </span>
              {room.aiDiscussion && (
                <span className="inline-flex items-center gap-0.5 text-violet-600">
                  <Zap className="h-2.5 w-2.5" />
                  AI
                </span>
              )}
            </span>
          )}
        </span>
      )}

      {isOverview && (
        <span className="pointer-events-none absolute left-1/2 top-[calc(100%+6px)] max-w-[150px] -translate-x-1/2 truncate rounded-full border border-white/70 bg-white/80 px-2 py-0.5 text-[10px] font-medium text-slate-600 shadow-sm backdrop-blur">
          {room.name}
        </span>
      )}

      {!isOverview && (
        <span className="absolute left-1/2 top-[calc(100%+8px)] hidden min-w-max -translate-x-1/2 rounded-xl border border-white/80 bg-white/95 px-3 py-2 text-[11px] text-slate-500 shadow-[0_20px_50px_rgba(15,23,42,0.15)] backdrop-blur-xl group-hover:block">
          <span className="mb-1 block max-w-[220px] text-xs font-semibold text-slate-950 line-clamp-1">
            {room.description || room.name}
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
      )}
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
      <span>スクロールで拡大すると詳細が増えます。ノードをドラッグで移動、背景ドラッグでパン</span>
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
  const [scale, setScale] = useState(() => getDefaultScale(rooms.length));
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragOffsets, setDragOffsets] = useState<Record<string, DragOffset>>(() => readSavedLayout());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const dragSessionRef = useRef<DragSession | null>(null);
  const panSessionRef = useRef<PanSession | null>(null);
  const skipNextClickRef = useRef(false);

  const displayRooms = useMemo(() => sortRoomsForGraph(rooms), [rooms]);
  const useOverviewMode = displayRooms.length >= 20;
  const rawDetailLevel = useMemo(() => getZoomDetailLevel(scale), [scale]);
  const detailLevel = useMemo<ZoomDetailLevel>(() => {
    if (!useOverviewMode && rawDetailLevel === "overview") return "compact";
    return rawDetailLevel;
  }, [rawDetailLevel, useOverviewMode]);
  const graphDimensions = useMemo(
    () => getGraphDimensions(detailLevel, displayRooms.length),
    [detailLevel, displayRooms.length]
  );
  const connections = useMemo(() => computeRoomConnections(displayRooms), [displayRooms]);
  const rawPoints = useMemo(
    () => computeGraphPoints(displayRooms, connections, graphDimensions.width, graphDimensions.height),
    [connections, displayRooms, graphDimensions.height, graphDimensions.width]
  );
  const points = useMemo(
    () => resolveGraphCollisions(
      rawPoints,
      displayRooms,
      detailLevel,
      graphDimensions.width,
      graphDimensions.height
    ),
    [rawPoints, displayRooms, detailLevel, graphDimensions.height, graphDimensions.width]
  );
  const connectedIds = useMemo(() => {
    if (!hoveredId) return new Set<string>();
    return new Set(
      connections
        .filter((connection) => connection.from === hoveredId || connection.to === hoveredId)
        .flatMap((connection) => [connection.from, connection.to])
    );
  }, [connections, hoveredId]);
  const focusedRoom = useMemo(
    () => (hoveredId ? displayRooms.find((room) => room.id === hoveredId) ?? null : null),
    [displayRooms, hoveredId]
  );

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

  const applyZoom = useCallback((next: number) => {
    setScale(Math.min(MAP_ZOOM_MAX, Math.max(MAP_ZOOM_MIN, +next.toFixed(2))));
  }, []);

  const handleWheelZoom = useCallback((event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -MAP_ZOOM_STEP : MAP_ZOOM_STEP;
    setScale((prev) => {
      const next = Math.min(MAP_ZOOM_MAX, Math.max(MAP_ZOOM_MIN, +(prev + delta).toFixed(2)));
      return next;
    });
  }, []);

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
    setScale(getDefaultScale(displayRooms.length));
  }, [displayRooms.length]);

  const dismissHint = () => {
    localStorage.setItem("forum_bubble_hint_v1", "1");
    setShowHint(false);
  };

  return (
    <section className="space-y-5">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
          Room Graph
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-3xl">
          話題のつながりを、マップで探索する
        </h2>
      </div>

      <div
        className="relative h-[620px] overflow-hidden rounded-[34px] border border-slate-200/70 bg-[#fbfbfa] shadow-[0_28px_80px_rgba(15,23,42,0.08)]"
        onWheel={handleWheelZoom}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.05),transparent_58%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.06)_1px,transparent_0)] [background-size:26px_26px] opacity-30" />

        <div className="absolute right-4 top-4 z-40 flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/85 p-1 pl-3 shadow-[0_12px_34px_rgba(15,23,42,0.10)] backdrop-blur-xl">
          <span className="text-[10px] font-medium tabular-nums text-slate-400">
            {ZOOM_LEVEL_LABELS[detailLevel]}
          </span>
          <div className="flex items-center gap-1">
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
        </div>

        <div
          className="absolute left-1/2 top-1/2 cursor-grab touch-none active:cursor-grabbing"
          onPointerDown={handleGraphPanStart}
          onPointerMove={handleGraphPanMove}
          onPointerUp={handleGraphPanEnd}
          onPointerCancel={handleGraphPanEnd}
          style={{
            width: graphDimensions.width,
            height: graphDimensions.height,
            transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${scale})`,
            transformOrigin: "center center",
            transition: isPanning || draggingId ? "none" : "transform 420ms cubic-bezier(.2,.8,.2,1)",
          }}
        >
          <GraphEdges
            points={points}
            offsets={dragOffsets}
            connections={connections}
            hoveredId={hoveredId}
            detailLevel={detailLevel}
            graphWidth={graphDimensions.width}
            graphHeight={graphDimensions.height}
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
                detailLevel={detailLevel}
                allowOverview={useOverviewMode}
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
          スクロールで拡大すると詳細が増えます / ノードをドラッグ / 背景をドラッグ
        </div>

        {detailLevel === "detail" && focusedRoom && (
          <div className="absolute bottom-4 right-4 z-30 w-[320px] rounded-2xl border border-slate-200/80 bg-white/92 p-4 text-xs text-slate-600 shadow-[0_20px_48px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <p className="text-sm font-semibold text-slate-900">{focusedRoom.name}</p>
            <p className="mt-1 line-clamp-2">{focusedRoom.description || focusedRoom.name}</p>
            <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {focusedRoom.postCount}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="h-3 w-3" />
                {focusedRoom.participantCount}
              </span>
              {focusedRoom.aiDiscussion && (
                <span className="inline-flex items-center gap-1 text-violet-600">
                  <Zap className="h-3 w-3" />
                  AI
                </span>
              )}
            </div>
          </div>
        )}

        {showHint && <OnboardingHint onClose={dismissHint} />}
      </div>
    </section>
  );
}
