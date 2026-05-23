"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, MessageSquare, Minus, Plus, Users, X } from "lucide-react";
import type { ForumRoom } from "@/lib/mock-forum";
import { ForumRoomIcon } from "@/components/community/forum-room-icon";
import {
  BUBBLE_POSITIONS,
  BUBBLE_POSITIONS_MOBILE,
  BUBBLE_CONNECTIONS,
  getBubbleSize,
  isRoomActive,
  type BubblePosition,
  type BubbleConnection,
} from "@/components/community/forum-bubble-map";

// ─── 動的レイアウト計算 ──────────────────────────────────────

const ROOM_TEXT_STOP_WORDS = new Set([
  "の", "を", "に", "が", "は", "と", "で", "て", "た", "も", "や", "へ", "か",
  "です", "ます", "する", "いる", "ある", "こと", "これ", "それ", "ため",
  "について", "から", "まで", "より", "よう", "また", "など",
]);

function normalizeRoomText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[・、。！？（）「」『』【】［］()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function computePositions(rooms: ForumRoom[], isMobile: boolean): BubblePosition[] {
  const baseHeight = isMobile ? 720 : 540;
  const containerHeight = computeContainerHeight(rooms, isMobile);
  const staticMap = isMobile ? BUBBLE_POSITIONS_MOBILE : BUBBLE_POSITIONS;
  const result: BubblePosition[] = [];
  const usedIds = new Set<string>();
  const absoluteById = new Map<string, { x: number; y: number }>();

  // 静的ルームは絶対ピクセル位置を保持（コンテナが伸びても動かない）
  for (const room of rooms) {
    const pos = staticMap.find((p) => p.id === room.id);
    if (pos) {
      const absoluteY = (pos.cy / 100) * baseHeight;
      result.push({ id: room.id, cx: pos.cx, cy: (absoluteY / containerHeight) * 100 });
      usedIds.add(room.id);
      absoluteById.set(room.id, { x: pos.cx, y: absoluteY });
    }
  }

  // 新規ルームは関連が強い静的ルームのレーンへ割り当てて縦積み配置（重なり防止）
  const remaining = rooms.filter((r) => !usedIds.has(r.id));
  const seededIds = staticMap.map((p) => p.id);
  const seededRooms = seededIds
    .map((id) => rooms.find((r) => r.id === id))
    .filter((room): room is ForumRoom => !!room);
  const laneIndexBySeedId = new Map(seededIds.map((id, i) => [id, i]));
  const groups = new Map<string, ForumRoom[]>();

  for (const room of remaining) {
    const anchor = pickBestRelatedRoom(room, seededRooms) ?? seededRooms[0] ?? null;
    const anchorId = anchor?.id ?? seededIds[0] ?? room.id;
    if (!groups.has(anchorId)) groups.set(anchorId, []);
    groups.get(anchorId)!.push(room);
  }

  for (const [anchorId, groupRooms] of groups) {
    const lane = laneIndexBySeedId.get(anchorId) ?? 0;
    const anchorPos = absoluteById.get(anchorId);
    const laneX = anchorPos?.x ?? (isMobile ? 50 : [18, 50, 82][lane % 3]);
    const laneOffsetY = isMobile ? lane * 8 : lane * 24;
    const startY = Math.max(baseHeight + (isMobile ? 48 : 96), (anchorPos?.y ?? baseHeight) + (isMobile ? 72 : 92));
    const gapY = isMobile ? 114 : 150;

    groupRooms.forEach((room, index) => {
      const absoluteX = isMobile
        ? clampNumber(50 + (index % 2 === 0 ? -10 : 10), 24, 76)
        : clampNumber(laneX, 14, 86);
      const absoluteY = startY + laneOffsetY + index * gapY;
      const cappedY = Math.min(absoluteY, containerHeight - (isMobile ? 64 : 78));
      result.push({ id: room.id, cx: absoluteX, cy: (cappedY / containerHeight) * 100 });
      absoluteById.set(room.id, { x: absoluteX, y: cappedY });
    });
  }

  return result;
}

function computeContainerHeight(rooms: ForumRoom[], isMobile: boolean): number {
  const staticLen = (isMobile ? BUBBLE_POSITIONS_MOBILE : BUBBLE_POSITIONS).length;
  const extra = Math.max(0, rooms.length - staticLen);
  if (extra === 0) return isMobile ? 720 : 540;

  if (isMobile) {
    return 720 + extra * 118 + 80;
  }

  const laneCount = 3;
  const maxLaneDepth = Math.ceil(extra / laneCount);
  return 540 + maxLaneDepth * 156 + 120;
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

  if (best && bestScore > 0) return best;
  return candidates[0] ?? null;
}

function computeConnections(rooms: ForumRoom[], positions: BubblePosition[]): BubbleConnection[] {
  const posIds = new Set(positions.map((p) => p.id));
  const result: BubbleConnection[] = BUBBLE_CONNECTIONS.filter(
    (c) => posIds.has(c.from) && posIds.has(c.to)
  );
  const connected = new Set(result.flatMap((c) => [c.from, c.to]));
  const staticIds = new Set(BUBBLE_POSITIONS.map((p) => p.id));
  const staticRooms = rooms.filter((r) => staticIds.has(r.id));
  const newRooms = rooms.filter((r) => !staticIds.has(r.id));

  for (const room of newRooms) {
    const candidates = staticRooms.length > 0
      ? staticRooms
      : rooms.filter((other) => other.id !== room.id);
    const bestRoom = pickBestRelatedRoom(room, candidates);
    let bestId = bestRoom?.id ?? null;

    // 弱一致の場合は位置的に最も近い部屋へフォールバック
    if (!bestId) {
      const source = positions.find((p) => p.id === room.id);
      if (source) {
        let nearest: { id: string; dist: number } | null = null;
        for (const target of positions) {
          if (target.id === room.id) continue;
          const dx = source.cx - target.cx;
          const dy = source.cy - target.cy;
          const dist = dx * dx + dy * dy;
          if (!nearest || dist < nearest.dist) nearest = { id: target.id, dist };
        }
        bestId = nearest?.id ?? null;
      }
    }

    if (bestId) {
      const dup = result.some(
        (c) => (c.from === room.id && c.to === bestId) || (c.from === bestId && c.to === room.id)
      );
      if (!dup) result.push({ from: room.id, to: bestId });
    }

    connected.add(room.id);
  }

  return result;
}

// ─── 1枚のトピックカード ───────────────────────────────────

function TopicCard({
  room,
  cx,
  cy,
  isMobile,
  onHover,
  hasDraggedRef,
}: {
  room: ForumRoom;
  cx: number;
  cy: number;
  isMobile: boolean;
  onHover: (id: string | null) => void;
  hasDraggedRef: React.MutableRefObject<boolean>;
}) {
  const router = useRouter();
  const { pc, mobile } = getBubbleSize(room.postCount);
  const cardWidth = isMobile ? 240 : 220;
  const cardHeight = isMobile ? mobile : pc;
  const active = isRoomActive(room.lastPostedAt);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${room.name}の部屋へ移動`}
      className="group absolute cursor-pointer"
      style={{
        left: `${cx}%`,
        top: `${cy}%`,
        width: cardWidth,
        height: cardHeight,
        transform: "translate(-50%, -50%)",
      }}
      onMouseEnter={() => onHover(room.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(room.id)}
      onBlur={() => onHover(null)}
      onClick={() => {
        if (hasDraggedRef.current) { hasDraggedRef.current = false; return; }
        router.push(`/forum/${room.id}`);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/forum/${room.id}`);
        }
      }}
    >
      <div
        className={[
          "relative flex h-full w-full flex-col gap-2 rounded-2xl border bg-card p-4",
          "shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300",
          "group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-md",
          "focus-within:ring-2 focus-within:ring-primary/40",
        ].join(" ")}
      >
        {active && (
          <span
            aria-label="直近24時間以内に投稿あり"
            className="absolute right-3 top-3 flex h-2 w-2"
          >
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 motion-safe:animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
        )}

        <div className="flex items-start gap-2.5">
          <div className="shrink-0 rounded-lg bg-muted/40 p-1.5">
            <ForumRoomIcon roomId={room.id} size={isMobile ? 20 : 22} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold leading-snug text-foreground line-clamp-2">
              {room.name}
            </h3>
          </div>
        </div>

        <p className="text-[11px] leading-5 text-muted-foreground line-clamp-2">
          {room.description}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2.5 text-[10.5px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {room.postCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {room.participantCount}
            </span>
          </div>
          <ArrowUpRight
            className="h-3.5 w-3.5 text-muted-foreground/40 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}

// ─── 接続線（hairline curve） ──────────────────────────────

function ConnectionLines({
  hoveredId,
  positions,
  connections,
}: {
  hoveredId: string | null;
  positions: BubblePosition[];
  connections: BubbleConnection[];
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      {connections.map(({ from, to }) => {
        const fromPos = positions.find((p) => p.id === from);
        const toPos = positions.find((p) => p.id === to);
        if (!fromPos || !toPos) return null;

        const isHighlighted = hoveredId === from || hoveredId === to;
        const mx = (fromPos.cx + toPos.cx) / 2;
        const my = (fromPos.cy + toPos.cy) / 2 - 4;
        const path = `M ${fromPos.cx} ${fromPos.cy} Q ${mx} ${my} ${toPos.cx} ${toPos.cy}`;

        return (
          <path
            key={`${from}-${to}`}
            d={path}
            fill="none"
            stroke="currentColor"
            strokeWidth={isHighlighted ? 0.4 : 0.2}
            className={isHighlighted ? "text-primary/40" : "text-muted-foreground/20"}
            style={{ transition: "all .25s ease" }}
          />
        );
      })}
    </svg>
  );
}

// ─── 初回訪問ヒント ────────────────────────────────────────

function OnboardingHint({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute bottom-5 left-1/2 z-40 -translate-x-1/2 flex items-center gap-3 rounded-full border bg-background/90 px-5 py-2 text-xs shadow-sm backdrop-blur-sm"
    >
      <span className="text-muted-foreground">
        トピックをクリックして議論に参加しよう
      </span>
      <button
        type="button"
        aria-label="ヒントを閉じる"
        onClick={onClose}
        className="rounded-full p-0.5 hover:bg-muted transition-colors"
      >
        <X className="h-3 w-3 text-muted-foreground" />
      </button>
    </div>
  );
}

// ─── 背景（極薄ドット） ────────────────────────────────────

function DotBackground() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-50"
    >
      <defs>
        <pattern id="forum-dot-pattern" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.7" className="fill-muted-foreground/25" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#forum-dot-pattern)" />
    </svg>
  );
}

const MAP_ZOOM_MIN = 1;
const MAP_ZOOM_MAX = 3;
const MAP_ZOOM_STEP = 0.25;

// ─── メインコンポーネント ─────────────────────────────────

export function ForumBubbleView({ rooms }: { rooms: ForumRoom[] }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 639px)").matches : false
  );
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const hasDragged = useRef(false);

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
    const mq = window.matchMedia("(max-width: 639px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const dismissHint = () => {
    localStorage.setItem("forum_bubble_hint_v1", "1");
    setShowHint(false);
  };

  const positions = computePositions(rooms, isMobile);
  const connections = computeConnections(rooms, positions);
  const containerHeight = computeContainerHeight(rooms, isMobile);

  const clampZoom = (s: number) =>
    Math.min(MAP_ZOOM_MAX, Math.max(MAP_ZOOM_MIN, +s.toFixed(2)));

  const applyZoom = (next: number) => {
    const clamped = clampZoom(next);
    setScale(clamped);
    if (clamped === MAP_ZOOM_MIN) setPan({ x: 0, y: 0 });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button, [role=button]")) return;
    dragStart.current = { x: e.clientX, y: e.clientY };
    hasDragged.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    if (scale <= 1) {
      dragStart.current = { x: e.clientX, y: e.clientY };
      return;
    }
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) hasDragged.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  };

  const handlePointerUp = () => {
    dragStart.current = null;
  };

  return (
    <>
      <p className="mb-5 text-center text-xs text-muted-foreground">
        気になるトピックを選んで議論に参加しよう
        <span className="mt-1 block text-[10px] text-muted-foreground/80">
          カードをクリックで部屋へ。右上の＋／−で拡大縮小。拡大後はドラッグで移動。ダブルクリックで表示をリセット。
        </span>
      </p>

      <div
        className={[
          "relative w-full overflow-hidden rounded-3xl border bg-gradient-to-b from-background to-muted/10 select-none touch-none",
          scale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-default",
        ].join(" ")}
        style={{ height: containerHeight }}
        onWheel={(e) => {
          if (e.ctrlKey || e.metaKey) e.preventDefault();
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={(e) => {
          if ((e.target as HTMLElement).closest("button, [role=button]")) return;
          setScale(1);
          setPan({ x: 0, y: 0 });
        }}
      >
        <div className="absolute right-3 top-3 z-30 flex flex-col gap-1 rounded-lg border bg-background/95 p-1 shadow-md backdrop-blur-sm">
          <button
            type="button"
            aria-label="マップを拡大"
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            disabled={scale >= MAP_ZOOM_MAX - 1e-6}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => applyZoom(scale + MAP_ZOOM_STEP)}
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="マップを縮小"
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            disabled={scale <= MAP_ZOOM_MIN + 1e-6}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => applyZoom(scale - MAP_ZOOM_STEP)}
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>

        {/* 変換ラッパー */}
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: "center center",
            width: "100%",
            height: "100%",
          }}
        >
          <DotBackground />
          {!isMobile && (
            <ConnectionLines
              hoveredId={hoveredId}
              positions={positions}
              connections={connections}
            />
          )}
          {positions.map((pos) => {
            const room = rooms.find((r) => r.id === pos.id);
            if (!room) return null;
            return (
              <TopicCard
                key={pos.id}
                room={room}
                cx={pos.cx}
                cy={pos.cy}
                isMobile={isMobile}
                onHover={setHoveredId}
                hasDraggedRef={hasDragged}
              />
            );
          })}
        </div>

        {showHint && <OnboardingHint onClose={dismissHint} />}
      </div>
    </>
  );
}
