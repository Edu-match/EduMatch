"use client";

import type { LucideIcon } from "lucide-react";
import { Network } from "lucide-react";
import {
  INTEROP_PRIORITY_TOPICS,
  sortTopicsForBurst,
  type InteropPriorityTopic,
} from "@/lib/interop-priority-topics";
import type { InteropCategory } from "@/components/interop/interop-category-bubble-map";
import { useMemo } from "react";

// Glass-vivid colors per major group
const GROUP_STYLE: Record<string, {
  bg: string; glow: string; border: string; shine: string; label: string;
}> = {
  A: {
    bg: "radial-gradient(circle at 34% 26%, rgba(210,240,255,0.94) 0%, rgba(58,144,240,0.65) 42%, rgba(18,72,196,0.76) 100%)",
    glow: "#3a90f0",
    border: "rgba(130,195,255,0.70)",
    shine: "rgba(210,240,255,0.88)",
    label: "AI・テク",
  },
  B: {
    bg: "radial-gradient(circle at 34% 26%, rgba(200,255,200,0.94) 0%, rgba(50,192,56,0.62) 42%, rgba(10,120,20,0.76) 100%)",
    glow: "#38c038",
    border: "rgba(120,220,120,0.70)",
    shine: "rgba(200,255,200,0.88)",
    label: "評価・学習",
  },
  C: {
    bg: "radial-gradient(circle at 34% 26%, rgba(255,210,200,0.94) 0%, rgba(232,60,50,0.62) 42%, rgba(160,16,12,0.76) 100%)",
    glow: "#e83030",
    border: "rgba(255,130,120,0.70)",
    shine: "rgba(255,210,200,0.88)",
    label: "権利・規律",
  },
  D: {
    bg: "radial-gradient(circle at 34% 26%, rgba(230,200,255,0.94) 0%, rgba(152,48,224,0.62) 42%, rgba(88,16,168,0.76) 100%)",
    glow: "#9030e0",
    border: "rgba(200,110,255,0.70)",
    shine: "rgba(230,200,255,0.88)",
    label: "多様性",
  },
  E: {
    bg: "radial-gradient(circle at 34% 26%, rgba(255,248,180,0.94) 0%, rgba(224,160,16,0.62) 42%, rgba(144,112,0,0.76) 100%)",
    glow: "#e0a010",
    border: "rgba(240,208,64,0.70)",
    shine: "rgba(255,248,180,0.88)",
    label: "教師・学校",
  },
  F: {
    bg: "radial-gradient(circle at 34% 26%, rgba(198,210,255,0.94) 0%, rgba(72,96,216,0.62) 42%, rgba(24,40,160,0.76) 100%)",
    glow: "#4860d8",
    border: "rgba(144,168,240,0.70)",
    shine: "rgba(198,210,255,0.88)",
    label: "各教科",
  },
};

// Radial positions from center (50%, 47%) — sortTopicsForBurst order: A×4, B×4, C×4, D×2, E×2, F×12
// Groups are clustered by color and radiate outward from center.
const POSITIONS: [number, number][] = [
  // A (blue, AI・テク): upper-left cluster
  [28, 38], [20, 30], [36, 29], [14, 44],
  // B (green, 評価・学習): upper-right cluster
  [65, 32], [74, 24], [60, 21], [80, 37],
  // C (red, 権利・規律): lower-left cluster
  [21, 60], [10, 53], [27, 68], [13, 72],
  // D (purple, 多様性): right cluster
  [84, 53], [88, 63],
  // E (yellow, 教師・学校): bottom cluster
  [44, 75], [56, 79],
  // F (indigo, 各教科): fill remaining areas around the perimeter
  [48, 14], [59, 18],   // top center
  [80, 18], [90, 30],   // top-right far
  [77, 44], [85, 56],   // right mid (between B and D)
  [63, 68], [52, 67],   // lower right (between D and E)
  [36, 75], [27, 71],   // lower left (between E and C)
  [7, 36], [6, 50],     // far left (above C cluster)
];

const PUYO_CSS = `
@keyframes puyoAnim {
  0%   { transform: translate(-50%, calc(-50% + 0px)) scale(0.95); }
  30%  { transform: translate(-50%, calc(-50% - 7px)) scale(1.02); }
  60%  { transform: translate(-50%, calc(-50% - 10px)) scale(1.05); }
  80%  { transform: translate(-50%, calc(-50% - 4px)) scale(1.01); }
  100% { transform: translate(-50%, calc(-50% + 0px)) scale(0.95); }
}
@keyframes centerPulse {
  0%,100% { transform: translate(-50%,-50%) scale(1.0); }
  50%     { transform: translate(-50%,-50%) scale(1.06); }
}
`;

const BUBBLE_SIZE = 82;  // px — larger than before
const CENTER_SIZE = 112; // px

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
  // Slow animation: 7–13s per cycle, staggered delay
  const dur = 7 + ((topic.no * 13 + index * 9) % 60) / 10;
  const delay = -((topic.no * 7 + index * 4) % 70) / 10; // negative = pre-start, avoids initial pop

  return (
    <button
      type="button"
      onClick={onActivate}
      className="group absolute focus:outline-none"
      style={{
        left: `${pos[0]}%`,
        top: `${pos[1]}%`,
        width: BUBBLE_SIZE,
        height: BUBBLE_SIZE,
        zIndex: 10,
        animation: `puyoAnim ${dur}s ease-in-out ${delay}s infinite`,
      }}
      aria-label={topic.category}
    >
      {/* Glow halo (always visible, brighter on hover) */}
      <span
        className="pointer-events-none absolute rounded-full transition-opacity duration-300"
        style={{
          inset: -14,
          background: `radial-gradient(circle, ${sty.glow}30 0%, transparent 65%)`,
          opacity: 0.7,
        }}
      />
      <span
        className="pointer-events-none absolute rounded-full opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{
          inset: -14,
          background: `radial-gradient(circle, ${sty.glow}60 0%, transparent 65%)`,
        }}
      />

      {/* Bubble body — glass morphism */}
      <span
        className="relative flex h-full w-full items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-[1.08] group-active:scale-[0.93]"
        style={{
          background: sty.bg,
          border: `1.5px solid ${sty.border}`,
          boxShadow: `0 0 22px ${sty.glow}38, 0 6px 18px rgba(0,0,0,0.28), inset 0 1px 1px rgba(255,255,255,0.55)`,
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}
      >
        {/* Top-left highlight blob */}
        <span
          className="pointer-events-none absolute rounded-full"
          style={{
            top: "11%", left: "14%",
            width: "42%", height: "34%",
            background: sty.shine,
            filter: "blur(3px)",
            opacity: 0.68,
          }}
        />
        {/* Bottom-right subtle dark shadow for depth */}
        <span
          className="pointer-events-none absolute rounded-full"
          style={{
            bottom: "8%", right: "8%",
            width: "38%", height: "30%",
            background: "rgba(0,0,0,0.14)",
            filter: "blur(5px)",
          }}
        />
      </span>

      {/* Label */}
      <span
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-center"
        style={{
          top: `calc(100% + 5px)`,
          maxWidth: 100,
          fontSize: "10.5px",
          fontWeight: 700,
          lineHeight: 1.3,
          color: "rgba(255,255,255,0.95)",
          background: "rgba(4,6,20,0.68)",
          border: `1px solid ${sty.border}`,
          borderRadius: 9999,
          padding: "2px 8px",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.32)",
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
function GroupChip({ label, sty }: { label: string; sty: typeof GROUP_STYLE.A }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold text-white/90"
      style={{
        background: `${sty.glow}28`,
        border: `1px solid ${sty.border}`,
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
    >
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ background: sty.glow, boxShadow: `0 0 5px ${sty.glow}` }}
      />
      {label}
    </span>
  );
}

/** トップ：28ぷよぷよ玉 + 中心インタロップ（中心から放射状配置） */
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

      {/* Center: インタロップ */}
      {interopCat && (
        <button
          type="button"
          onClick={() => onSelectCategory(interopCat)}
          className="group absolute focus:outline-none"
          style={{
            left: "50%",
            top: "47%",
            width: CENTER_SIZE,
            height: CENTER_SIZE,
            zIndex: 20,
            animation: `centerPulse 8s ease-in-out infinite`,
          }}
          aria-label="インタロップ"
        >
          {/* Outer ring glow */}
          <span
            className="pointer-events-none absolute rounded-full"
            style={{
              inset: -18,
              background: "radial-gradient(circle, rgba(160,190,255,0.22) 0%, transparent 68%)",
            }}
          />
          <span
            className="pointer-events-none absolute rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              inset: -18,
              background: "radial-gradient(circle, rgba(160,190,255,0.45) 0%, transparent 68%)",
            }}
          />

          {/* Button body */}
          <span
            className="relative flex h-full w-full flex-col items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-[1.06] group-active:scale-95"
            style={{
              background: "radial-gradient(circle at 36% 26%, rgba(255,255,255,0.96) 0%, rgba(218,228,255,0.88) 38%, rgba(150,172,255,0.82) 100%)",
              border: "2px solid rgba(200,218,255,0.80)",
              boxShadow: "0 0 36px rgba(130,160,255,0.50), 0 8px 24px rgba(0,0,0,0.28), inset 0 2px 12px rgba(255,255,255,0.55)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
          >
            {/* Shine */}
            <span
              className="pointer-events-none absolute rounded-full"
              style={{ top: "10%", left: "14%", width: "44%", height: "34%", background: "rgba(255,255,255,0.90)", filter: "blur(4px)" }}
            />
            <InteropIcon className="relative z-10 h-6 w-6 text-[#1a3a8a]" strokeWidth={1.8} />
            <span className="relative z-10 mt-1 text-[11px] font-bold leading-tight text-[#1a3a8a]">インタロップ</span>
          </span>
        </button>
      )}

      {/* Group legend */}
      <div className="pointer-events-none absolute bottom-20 left-4 right-4 z-30 flex flex-wrap gap-1.5 md:bottom-6">
        {Object.entries(GROUP_STYLE).map(([major, sty]) => (
          <GroupChip key={major} label={sty.label} sty={sty} />
        ))}
      </div>
    </div>
  );
}
