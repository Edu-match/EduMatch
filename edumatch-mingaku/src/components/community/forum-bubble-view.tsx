"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, MessageSquare, Users, X, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
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

function computePositions(rooms: ForumRoom[], isMobile: boolean): BubblePosition[] {
  const staticMap = isMobile ? BUBBLE_POSITIONS_MOBILE : BUBBLE_POSITIONS;
  const result: BubblePosition[] = [];
  const usedIds = new Set<string>();

  for (const room of rooms) {
    const pos = staticMap.find((p) => p.id === room.id);
    if (pos) {
      result.push(pos);
      usedIds.add(room.id);
    }
  }

  const remaining = rooms.filter((r) => !usedIds.has(r.id));
  if (isMobile) {
    let cy = 90 + 14;
    for (const room of remaining) {
      result.push({ id: room.id, cx: 50, cy });
      cy += 14;
    }
  } else {
    const colXs = [18, 50, 82];
    remaining.forEach((room, i) => {
      result.push({ id: room.id, cx: colXs[i % 3], cy: 92 + Math.floor(i / 3) * 22 });
    });
  }

  return result;
}

function computeContainerHeight(rooms: ForumRoom[], isMobile: boolean): number {
  const staticLen = (isMobile ? BUBBLE_POSITIONS_MOBILE : BUBBLE_POSITIONS).length;
  const extra = Math.max(0, rooms.length - staticLen);
  const extraRows = Math.ceil(extra / (isMobile ? 1 : 3));
  return (isMobile ? 720 : 540) + extraRows * (isMobile ? 100 : 140);
}

function extractKeywords(text: string): Set<string> {
  const stop = new Set(["の", "を", "に", "が", "は", "と", "で", "て", "た", "も", "や", "へ", "か"]);
  return new Set(
    text
      .replace(/[・、。！？（）「」]/g, " ")
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((w) => w.length >= 2 && !stop.has(w))
  );
}

function computeConnections(rooms: ForumRoom[], positions: BubblePosition[]): BubbleConnection[] {
  const posIds = new Set(positions.map((p) => p.id));
  const result: BubbleConnection[] = BUBBLE_CONNECTIONS.filter(
    (c) => posIds.has(c.from) && posIds.has(c.to)
  );
  const connected = new Set(result.flatMap((c) => [c.from, c.to]));
  const staticIds = new Set(BUBBLE_POSITIONS.map((p) => p.id));
  const newRooms = rooms.filter((r) => !staticIds.has(r.id));

  for (const room of newRooms) {
    const kw = extractKeywords(room.name + " " + room.description);
    let bestId: string | null = null;
    let bestScore = 0;

    for (const other of rooms) {
      if (other.id === room.id) continue;
      const otherKw = extractKeywords(other.name + " " + other.description);
      let score = 0;
      for (const k of kw) if (otherKw.has(k)) score++;
      if (score > bestScore) { bestScore = score; bestId = other.id; }
    }

    // Fall back to first room if no keyword match
    if (!bestId && rooms.length > 1) {
      bestId = rooms.find((r) => r.id !== room.id)?.id ?? null;
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
  hasDragged,
}: {
  room: ForumRoom;
  cx: number;
  cy: number;
  isMobile: boolean;
  onHover: (id: string | null) => void;
  hasDragged: React.MutableRefObject<boolean>;
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
        if (hasDragged.current) { hasDragged.current = false; return; }
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

// ─── ズームコントロール ────────────────────────────────────

function ZoomControls({
  scale,
  onZoomIn,
  onZoomOut,
  onReset,
}: {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}) {
  return (
    <div className="absolute bottom-4 right-4 z-30 flex flex-col gap-1">
      <button
        type="button"
        aria-label="ズームイン"
        onClick={onZoomIn}
        disabled={scale >= 3}
        className="flex h-7 w-7 items-center justify-center rounded-lg border bg-background/90 shadow-sm backdrop-blur-sm hover:bg-muted transition-colors disabled:opacity-40"
      >
        <ZoomIn className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label="ズームアウト"
        onClick={onZoomOut}
        disabled={scale <= 1}
        className="flex h-7 w-7 items-center justify-center rounded-lg border bg-background/90 shadow-sm backdrop-blur-sm hover:bg-muted transition-colors disabled:opacity-40"
      >
        <ZoomOut className="h-3.5 w-3.5" />
      </button>
      {(scale !== 1) && (
        <button
          type="button"
          aria-label="リセット"
          onClick={onReset}
          className="flex h-7 w-7 items-center justify-center rounded-lg border bg-background/90 shadow-sm backdrop-blur-sm hover:bg-muted transition-colors"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── メインコンポーネント ─────────────────────────────────

export function ForumBubbleView({ rooms }: { rooms: ForumRoom[] }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const hasDragged = useRef(false);

  useEffect(() => {
    const seen = localStorage.getItem("forum_bubble_hint_v1");
    if (!seen) {
      setShowHint(true);
      const timer = setTimeout(() => {
        localStorage.setItem("forum_bubble_hint_v1", "1");
        setShowHint(false);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
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

  const zoomIn = () => setScale((s) => Math.min(3, +(s + 0.25).toFixed(2)));
  const zoomOut = () => setScale((s) => { const next = Math.max(1, +(s - 0.25).toFixed(2)); if (next === 1) setPan({ x: 0, y: 0 }); return next; });
  const resetView = () => { setScale(1); setPan({ x: 0, y: 0 }); };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale((s) => {
      const next = Math.min(3, Math.max(1, +(s - e.deltaY * 0.002).toFixed(2)));
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button, [role=button]")) return;
    dragStart.current = { x: e.clientX, y: e.clientY };
    hasDragged.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) hasDragged.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  };

  const handlePointerUp = () => { dragStart.current = null; };

  return (
    <>
      <p className="mb-5 text-center text-xs text-muted-foreground">
        気になるトピックを選んで議論に参加しよう
      </p>

      <div
        className="relative w-full overflow-hidden rounded-3xl border bg-gradient-to-b from-background to-muted/10 select-none"
        style={{ height: containerHeight, cursor: dragStart.current ? "grabbing" : "grab" }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
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
                hasDragged={hasDragged}
              />
            );
          })}
        </div>

        <ZoomControls
          scale={scale}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onReset={resetView}
        />

        {showHint && <OnboardingHint onClose={dismissHint} />}
      </div>
    </>
  );
}
