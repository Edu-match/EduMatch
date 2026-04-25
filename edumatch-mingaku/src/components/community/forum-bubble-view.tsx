"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Users, X } from "lucide-react";
import type { ForumRoom } from "@/lib/mock-forum";
import { ForumRoomIcon, ROOM_BUBBLE_COLORS } from "@/components/community/forum-room-icon";
import {
  BUBBLE_POSITIONS,
  BUBBLE_POSITIONS_MOBILE,
  BUBBLE_CONNECTIONS,
  getBubbleSize,
  isRoomActive,
} from "@/components/community/forum-bubble-map";

// ─── アニメーション CSS（style タグでインライン注入） ────────

const BUBBLE_CSS = `
@keyframes bubble-breathe {
  0%,100% { transform: translate(-50%,-50%) scale(1); }
  50%      { transform: translate(-50%,-50%) scale(1.045); }
}
@keyframes bubble-pulse-ring {
  0%   { transform: translate(-50%,-50%) scale(1);   opacity: .35; }
  100% { transform: translate(-50%,-50%) scale(1.25); opacity: 0;  }
}
@media (prefers-reduced-motion: reduce) {
  .bubble-breathe     { animation: none !important; }
  .bubble-pulse-ring  { animation: none !important; }
}
.bubble-breathe {
  animation: bubble-breathe 3.5s ease-in-out infinite;
}
.bubble-pulse-ring {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  animation: bubble-pulse-ring 2.5s ease-out infinite;
}
`;

// ─── 参加者ドット（バブル縁） ─────────────────────────────

const DOT_PALETTE = [
  "bg-blue-400", "bg-rose-400", "bg-amber-400",
  "bg-emerald-400", "bg-violet-400", "bg-cyan-400",
];

function ParticipantDots({ count, size }: { count: number; size: number }) {
  const dots = Math.min(count, 3);
  if (dots === 0) return null;
  const r = size / 2;
  // バブル円周の右半分に等間隔で配置
  const angles = dots === 1 ? [45] : dots === 2 ? [20, 70] : [10, 45, 80];
  return (
    <>
      {angles.map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const x = r + r * Math.sin(rad) - 7;
        const y = r - r * Math.cos(rad) - 7;
        return (
          <span
            key={i}
            aria-hidden="true"
            className={`absolute h-3.5 w-3.5 rounded-full border-2 border-white ${DOT_PALETTE[i % DOT_PALETTE.length]}`}
            style={{ left: x, top: y }}
          />
        );
      })}
    </>
  );
}

// ─── ホバーツールチップ ────────────────────────────────────

function BubbleTooltip({
  room,
  side,
}: {
  room: ForumRoom;
  side: "left" | "right";
}) {
  return (
    <div
      role="tooltip"
      className={[
        "pointer-events-none absolute z-30 w-52 rounded-xl border bg-background/95 p-3 shadow-xl backdrop-blur-sm",
        "transition-opacity duration-150",
        side === "right" ? "left-[calc(100%+12px)]" : "right-[calc(100%+12px)]",
        "top-1/2 -translate-y-1/2",
      ].join(" ")}
    >
      <p className="text-xs font-bold leading-snug">{room.name}</p>
      <p className="mt-1 text-[11px] leading-4 text-muted-foreground line-clamp-3">
        {room.description}
      </p>
      <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <MessageSquare className="h-3 w-3" />
          {room.postCount} 投稿
        </span>
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {room.participantCount} 人
        </span>
      </div>
      {room.postCount === 0 && (
        <p className="mt-2 text-[10px] font-medium text-primary">
          最初の一言を投稿しよう
        </p>
      )}
    </div>
  );
}

// ─── 1つのバブル ─────────────────────────────────────────

function Bubble({
  room,
  cx,
  cy,
  isMobile,
}: {
  room: ForumRoom;
  cx: number;
  cy: number;
  isMobile: boolean;
}) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const { pc, mobile } = getBubbleSize(room.postCount);
  const size = isMobile ? mobile : pc;
  const active = isRoomActive(room.lastPostedAt);
  const colors = ROOM_BUBBLE_COLORS[room.id] ?? {
    from: "from-primary/10", to: "to-primary/5",
    border: "border-primary/20", text: "text-primary",
  };

  // ツールチップを左右どちらに出すか（コンテナ中央で判断）
  const tooltipSide = cx > 50 ? "left" : "right";

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${room.name}の部屋へ移動`}
      className="absolute cursor-pointer"
      style={{
        left: `${cx}%`,
        top: `${cy}%`,
        width: size,
        height: size,
        transform: "translate(-50%, -50%)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onClick={() => router.push(`/forum/${room.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") router.push(`/forum/${room.id}`);
      }}
    >
      {/* パルスリング（アクティブ部屋） */}
      {active && (
        <span
          aria-hidden="true"
          className={`bubble-pulse-ring ${colors.border.replace("border-", "border-2 border-")} bg-transparent`}
          style={{ width: size, height: size }}
        />
      )}

      {/* バブル本体 */}
      <div
        className={[
          "flex h-full w-full flex-col items-center justify-center gap-1 rounded-full border-2 bg-gradient-to-br",
          colors.from, colors.to, colors.border,
          "shadow-md transition-shadow duration-200",
          active ? "bubble-breathe shadow-lg" : "",
          hovered ? "shadow-xl ring-2 ring-offset-2 ring-primary/30" : "",
        ].join(" ")}
        style={{ transform: hovered ? "scale(1.06)" : "scale(1)", transition: "transform .18s ease, box-shadow .18s ease" }}
      >
        {/* アイコン */}
        <ForumRoomIcon roomId={room.id} size={isMobile ? 20 : 26} />
        {/* 部屋名（短縮） */}
        <span
          className={`text-center font-bold leading-tight ${colors.text} ${isMobile ? "text-[9px]" : "text-[11px]"} px-2`}
          style={{ maxWidth: size - 16 }}
        >
          {room.name.length > 8 ? room.name.slice(0, 8) + "…" : room.name}
        </span>
        {/* 投稿0件の場合 */}
        {room.postCount === 0 && (
          <span className="text-[9px] text-muted-foreground">まだ投稿なし</span>
        )}
      </div>

      {/* 参加者ドット */}
      <ParticipantDots count={room.participantCount} size={size} />

      {/* ホバーツールチップ（モバイルでは非表示） */}
      {hovered && !isMobile && (
        <BubbleTooltip room={room} side={tooltipSide} />
      )}
    </div>
  );
}

// ─── 接続線SVG ─────────────────────────────────────────────

function ConnectionLines({
  rooms,
  hoveredId,
}: {
  rooms: ForumRoom[];
  hoveredId: string | null;
}) {
  const roomMap = Object.fromEntries(rooms.map((r) => [r.id, r]));

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

        const isHighlighted =
          hoveredId === from || hoveredId === to;

        return (
          <line
            key={`${from}-${to}`}
            x1={fromPos.cx}
            y1={fromPos.cy}
            x2={toPos.cx}
            y2={toPos.cy}
            stroke="currentColor"
            strokeWidth={isHighlighted ? "0.6" : "0.3"}
            strokeDasharray={isHighlighted ? "none" : "1.5 2"}
            className={isHighlighted ? "text-primary/50" : "text-muted-foreground/30"}
            style={{ transition: "opacity .2s" }}
          />
        );
      })}
    </svg>
  );
}

// ─── 初回訪問ツールチップ ──────────────────────────────────

function OnboardingHint({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute bottom-4 left-1/2 z-40 -translate-x-1/2 flex items-center gap-3 rounded-full border bg-background/95 px-5 py-2.5 shadow-lg backdrop-blur-sm text-sm"
    >
      <span>💡 バブルをタップして議論に参加しよう</span>
      <button
        type="button"
        aria-label="ヒントを閉じる"
        onClick={onClose}
        className="ml-1 rounded-full p-0.5 hover:bg-muted transition-colors"
      >
        <X className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}

// ─── 背景ドットパターン ────────────────────────────────────

function DotBackground() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-40"
    >
      <defs>
        <pattern id="forum-dot-pattern" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" className="fill-muted-foreground/30" />
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

  // 初回訪問チェック
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

  // レスポンシブ判定
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
  const containerHeight = isMobile ? 520 : 460;

  return (
    <>
      <style>{BUBBLE_CSS}</style>

      {/* 説明文（UXルール1） */}
      <p className="mb-4 text-center text-xs text-muted-foreground">
        トピックのバブルをタップして議論に参加しよう
      </p>

      <div
        className="relative w-full overflow-hidden rounded-2xl border bg-gradient-to-br from-background to-muted/20"
        style={{ height: containerHeight }}
        onMouseLeave={() => setHoveredId(null)}
      >
        {/* 背景ドット */}
        <DotBackground />

        {/* 接続線（PCのみ） */}
        {!isMobile && (
          <ConnectionLines rooms={rooms} hoveredId={hoveredId} />
        )}

        {/* バブル */}
        {positions.map((pos) => {
          const room = rooms.find((r) => r.id === pos.id);
          if (!room) return null;
          return (
            <div
              key={pos.id}
              onMouseEnter={() => setHoveredId(pos.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <Bubble
                room={room}
                cx={pos.cx}
                cy={pos.cy}
                isMobile={isMobile}
              />
            </div>
          );
        })}

        {/* 初回ヒント */}
        {showHint && <OnboardingHint onClose={dismissHint} />}
      </div>
    </>
  );
}
