"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, MessageSquare, Users, X } from "lucide-react";
import type { ForumRoom } from "@/lib/mock-forum";
import { ForumRoomIcon } from "@/components/community/forum-room-icon";
import {
  BUBBLE_POSITIONS,
  BUBBLE_POSITIONS_MOBILE,
  BUBBLE_CONNECTIONS,
  getBubbleSize,
  isRoomActive,
} from "@/components/community/forum-bubble-map";

// ─── 1枚のトピックカード ───────────────────────────────────

function TopicCard({
  room,
  cx,
  cy,
  isMobile,
  onHover,
}: {
  room: ForumRoom;
  cx: number;
  cy: number;
  isMobile: boolean;
  onHover: (id: string | null) => void;
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
      onClick={() => router.push(`/forum/${room.id}`)}
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
        {/* アクティブインジケータ（点のみ、アニメなし） */}
        {active && (
          <span
            aria-label="直近24時間以内に投稿あり"
            className="absolute right-3 top-3 flex h-2 w-2"
          >
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 motion-safe:animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
        )}

        {/* アイコン + 部屋名 */}
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

        {/* 説明 */}
        <p className="text-[11px] leading-5 text-muted-foreground line-clamp-2">
          {room.description}
        </p>

        {/* メタ情報 */}
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

function ConnectionLines({ hoveredId }: { hoveredId: string | null }) {
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      {BUBBLE_CONNECTIONS.map(({ from, to }) => {
        const fromPos = BUBBLE_POSITIONS.find((p) => p.id === from);
        const toPos = BUBBLE_POSITIONS.find((p) => p.id === to);
        if (!fromPos || !toPos) return null;

        const isHighlighted = hoveredId === from || hoveredId === to;
        // 中点を少しずらしてゆるいベジェ
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

// ─── メインコンポーネント ─────────────────────────────────

export function ForumBubbleView({ rooms }: { rooms: ForumRoom[] }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

  const positions = isMobile ? BUBBLE_POSITIONS_MOBILE : BUBBLE_POSITIONS;
  const containerHeight = isMobile ? 720 : 540;

  return (
    <>
      {/* 説明文 */}
      <p className="mb-5 text-center text-xs text-muted-foreground">
        気になるトピックを選んで議論に参加しよう
      </p>

      <div
        className="relative w-full overflow-hidden rounded-3xl border bg-gradient-to-b from-background to-muted/10"
        style={{ height: containerHeight }}
      >
        {/* 背景ドット */}
        <DotBackground />

        {/* 接続線（PCのみ） */}
        {!isMobile && <ConnectionLines hoveredId={hoveredId} />}

        {/* トピックカード */}
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
            />
          );
        })}

        {/* 初回ヒント */}
        {showHint && <OnboardingHint onClose={dismissHint} />}
      </div>
    </>
  );
}
