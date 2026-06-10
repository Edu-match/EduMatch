"use client";

import type { LucideIcon } from "lucide-react";
import { Network, MessageCircle } from "lucide-react";
import { ForumHotFlame } from "@/components/community/forum-hot-flame";
import {
  INTEROP_PRIORITY_TOPICS,
  sortTopicsForBurst,
  type InteropPriorityTopic,
} from "@/lib/interop-priority-topics";
import type { InteropCategory } from "@/components/interop/interop-category-bubble-map";
import type { InteropActivityStats } from "@/lib/interop-activity";
import { isInteropHot } from "@/lib/interop-activity";
import { useMemo } from "react";

// Vivid puyo colors by major group
const GROUP_STYLE: Record<string, {
  bg: string; glow: string; border: string; shine: string; label: string;
}> = {
  A: {
    bg: "radial-gradient(circle at 32% 28%, #9de0ff 0%, #3a90f0 46%, #1850b8 100%)",
    glow: "#3a90f0",
    border: "#6ab5ff",
    shine: "rgba(190,235,255,0.82)",
    label: "AI・テク",
  },
  B: {
    bg: "radial-gradient(circle at 32% 28%, #9ef09e 0%, #38c038 46%, #107810 100%)",
    glow: "#38c038",
    border: "#70d870",
    shine: "rgba(190,255,190,0.82)",
    label: "評価・学習",
  },
  C: {
    bg: "radial-gradient(circle at 32% 28%, #ffb0a0 0%, #e83030 46%, #a01010 100%)",
    glow: "#e83030",
    border: "#ff8070",
    shine: "rgba(255,200,180,0.82)",
    label: "権利・規律",
  },
  D: {
    bg: "radial-gradient(circle at 32% 28%, #d898f8 0%, #9030e0 46%, #5810a8 100%)",
    glow: "#9030e0",
    border: "#c060f8",
    shine: "rgba(220,180,255,0.82)",
    label: "多様性",
  },
  E: {
    bg: "radial-gradient(circle at 32% 28%, #ffe880 0%, #e0a010 46%, #907000 100%)",
    glow: "#e0a010",
    border: "#f0d040",
    shine: "rgba(255,245,160,0.82)",
    label: "教師・学校",
  },
  F: {
    bg: "radial-gradient(circle at 32% 28%, #a8b8f8 0%, #4860d8 46%, #1828a0 100%)",
    glow: "#4860d8",
    border: "#8098f0",
    shine: "rgba(180,195,255,0.82)",
    label: "各教科",
  },
};

// Pre-defined positions [left%, top%] for each topic in sortTopicsForBurst order
// A(4) → B(4) → C(4) → D(2) → E(2) → F(12)
const POSITIONS: [number, number][] = [
  // A: top-left cluster
  [7, 7], [26, 5], [7, 21], [26, 21],
  // B: top-right cluster
  [58, 7], [76, 5], [58, 21], [76, 21],
  // C: left-center cluster
  [6, 36], [23, 34], [5, 51], [22, 51],
  // D: right cluster
  [91, 36], [91, 51],
  // E: bottom-center
  [40, 77], [59, 78],
  // F: scattered center/right
  [41, 6], [43, 21], [25, 51], [59, 36],
  [77, 36], [93, 22], [77, 51], [59, 64],
  [41, 64], [7, 64], [93, 65], [41, 88],
];

const PUYO_CSS = `
@keyframes puyoFloat {
  0%, 100% { transform: translate(-50%, -50%) scaleX(1) scaleY(1); }
  25%       { transform: translate(-50%, calc(-50% - 5px)) scaleX(1.04) scaleY(0.97); }
  50%       { transform: translate(-50%, calc(-50% - 6px)) scaleX(1.00) scaleY(1.00); }
  75%       { transform: translate(-50%, calc(-50% - 3px)) scaleX(0.97) scaleY(1.03); }
}
@keyframes puyoLand {
  0%, 100% { transform: translate(-50%, -50%) scaleX(1.00) scaleY(1.00); }
  40%      { transform: translate(-50%, -50%) scaleX(1.14) scaleY(0.86); }
  70%      { transform: translate(-50%, -50%) scaleX(0.94) scaleY(1.06); }
}
`;

function PuyoBubble({
  topic,
  pos,
  index,
  onActivate,
}: {
  topic: InteropPriorityTopic;
  pos: [number, number];
  index: number;
  onActivate: () => void;
}) {
  const sty = GROUP_STYLE[topic.major] ?? GROUP_STYLE.F;
  const size = 66;
  const dur = 3.4 + ((topic.no * 17 + index * 11) % 34) / 10;
  const delay = ((topic.no * 7 + index * 3) % 22) / 10;
  const isLand = index % 7 === 0;

  return (
    <button
      type="button"
      onClick={onActivate}
      className="group absolute focus:outline-none"
      style={{
        left: `${pos[0]}%`,
        top: `${pos[1]}%`,
        width: size,
        height: size,
        zIndex: 10,
        animation: `${isLand ? "puyoLand" : "puyoFloat"} ${dur}s ease-in-out ${delay}s infinite`,
      }}
      aria-label={topic.category}
    >
      {/* Glow aura */}
      <span
        className="pointer-events-none absolute opacity-0 rounded-full transition-opacity duration-200 group-hover:opacity-100"
        style={{
          inset: -10,
          background: `radial-gradient(circle, ${sty.glow}55 0%, transparent 68%)`,
        }}
      />

      {/* Bubble body */}
      <span
        className="relative flex h-full w-full items-center justify-center rounded-full transition-transform duration-150 group-hover:scale-[1.06] group-active:scale-95"
        style={{
          background: sty.bg,
          border: `2px solid ${sty.border}`,
          boxShadow: `0 0 16px ${sty.glow}45, 0 4px 14px rgba(0,0,0,0.38), inset 0 2px 6px rgba(255,255,255,0.12)`,
        }}
      >
        {/* Highlight shine */}
        <span
          className="pointer-events-none absolute rounded-full"
          style={{ top: "13%", left: "17%", width: "37%", height: "30%", background: sty.shine, filter: "blur(2px)", opacity: 0.72 }}
        />
        {/* Eyes */}
        <span className="pointer-events-none absolute" style={{ top: "33%", left: "24%", width: "16%", height: "20%", background: "#fff", borderRadius: "50%", boxShadow: "0 1px 2px rgba(0,0,0,0.45)" }} />
        <span className="pointer-events-none absolute" style={{ top: "33%", right: "24%", width: "16%", height: "20%", background: "#fff", borderRadius: "50%", boxShadow: "0 1px 2px rgba(0,0,0,0.45)" }} />
        <span className="pointer-events-none absolute" style={{ top: "37%", left: "28%", width: "9%", height: "12%", background: "#0e133a", borderRadius: "50%" }} />
        <span className="pointer-events-none absolute" style={{ top: "37%", right: "28%", width: "9%", height: "12%", background: "#0e133a", borderRadius: "50%" }} />
      </span>

      {/* Hot flame */}
      {/* (hot detection requires stats which aren't passed here; kept as placeholder) */}

      {/* Label */}
      <span
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-center"
        style={{
          top: "calc(100% + 4px)",
          maxWidth: 84,
          fontSize: "8.5px",
          fontWeight: 700,
          lineHeight: 1.25,
          color: "rgba(255,255,255,0.92)",
          background: "rgba(5,7,22,0.72)",
          border: `1px solid ${sty.border}55`,
          borderRadius: 9999,
          padding: "1px 6px",
          backdropFilter: "blur(5px)",
          boxShadow: "0 2px 6px rgba(0,0,0,0.28)",
          whiteSpace: "normal",
          wordBreak: "break-all",
          display: "block",
        }}
      >
        {topic.category}
      </span>
    </button>
  );
}

// Legend chip
function GroupChip({ major, label, sty }: { major: string; label: string; sty: typeof GROUP_STYLE.A }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold text-white/90"
      style={{
        background: `${sty.glow}30`,
        border: `1px solid ${sty.border}66`,
        backdropFilter: "blur(4px)",
      }}
    >
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: sty.glow, boxShadow: `0 0 4px ${sty.glow}` }} />
      {label}
    </span>
  );
}

/** トップ：28ぷよぷよ玉（大カテゴリ）＋中心インタロップ */
export function InteropPuyoBubbleMap({
  interopCat,
  onSelectCategory,
  onSelectTopic,
  iconFor,
}: {
  interopCat: InteropCategory | undefined;
  onSelectCategory: (cat: InteropCategory) => void;
  onSelectTopic: (topic: InteropPriorityTopic) => void;
  iconFor: (slug: string) => LucideIcon;
}) {
  const topics = useMemo(() => sortTopicsForBurst(INTEROP_PRIORITY_TOPICS), []);
  const InteropIcon = interopCat ? iconFor(interopCat.slug) : Network;

  return (
    <div className="absolute inset-0 overflow-hidden">
      <style>{PUYO_CSS}</style>

      {/* Group legend */}
      <div className="pointer-events-none absolute bottom-20 left-4 right-4 z-30 flex flex-wrap gap-1.5 md:bottom-6">
        {Object.entries(GROUP_STYLE).map(([major, sty]) => (
          <GroupChip key={major} major={major} label={sty.label} sty={sty} />
        ))}
      </div>

      {/* Topic bubbles */}
      {topics.map((topic, i) => (
        <PuyoBubble
          key={topic.no}
          topic={topic}
          pos={POSITIONS[i] ?? [50, 50]}
          index={i}
          onActivate={() => onSelectTopic(topic)}
        />
      ))}

      {/* Center: インタロップ hub button */}
      {interopCat && (
        <button
          type="button"
          onClick={() => onSelectCategory(interopCat)}
          className="group absolute focus:outline-none"
          style={{ left: "49%", top: "44%", width: 84, height: 84, zIndex: 20 }}
          aria-label="インタロップ"
        >
          <span
            className="relative flex h-full w-full flex-col items-center justify-center rounded-full transition-all duration-200 group-hover:scale-[1.07] group-active:scale-95"
            style={{
              background: "radial-gradient(circle at 35% 28%, rgba(255,255,255,0.95) 0%, rgba(220,228,255,0.90) 38%, rgba(160,180,255,0.82) 100%)",
              border: "2px solid rgba(180,200,255,0.80)",
              boxShadow: "0 0 28px rgba(140,170,255,0.55), 0 6px 20px rgba(0,0,0,0.30), inset 0 2px 10px rgba(255,255,255,0.50)",
              backdropFilter: "blur(4px)",
            }}
          >
            <span
              className="pointer-events-none absolute rounded-full"
              style={{ top: "12%", left: "16%", width: "40%", height: "32%", background: "rgba(255,255,255,0.88)", filter: "blur(3px)" }}
            />
            <InteropIcon className="relative z-10 h-5 w-5 text-[#1a3a8a]" strokeWidth={1.8} />
            <span className="relative z-10 mt-0.5 text-[9px] font-bold leading-none text-[#1a3a8a]">インタロップ</span>
          </span>
          <span
            className="pointer-events-none absolute inset-[-6px] animate-ping rounded-full opacity-0 group-hover:opacity-30"
            style={{ background: "rgba(100,130,255,0.35)" }}
          />
        </button>
      )}
    </div>
  );
}
