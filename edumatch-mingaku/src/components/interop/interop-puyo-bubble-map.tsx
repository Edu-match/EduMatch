"use client";

import type { LucideIcon } from "lucide-react";
import { Bot, BookMarked, BookOpen, GraduationCap, Network, Shield, Users } from "lucide-react";
import {
  INTEROP_PRIORITY_TOPICS,
  sortTopicsForBurst,
  type InteropPriorityTopic,
} from "@/lib/interop-priority-topics";
import type { InteropCategory } from "@/components/interop/interop-category-bubble-map";
import { useMemo } from "react";

type GroupStyleEntry = {
  bg: string;
  glow: string;
  border: string;
  shine: string;
  label: string;
  Icon: LucideIcon;
};

// Transparent glass style — mostly clear with subtle color tint + glow
const GROUP_STYLE: Record<string, GroupStyleEntry> = {
  A: {
    bg: "radial-gradient(circle at 35% 28%, rgba(255,255,255,0.45) 0%, rgba(80,160,255,0.10) 55%, rgba(20,80,220,0.18) 100%)",
    glow: "#3a90f0",
    border: "rgba(140,200,255,0.55)",
    shine: "rgba(255,255,255,0.72)",
    label: "AI・テク",
    Icon: Bot,
  },
  B: {
    bg: "radial-gradient(circle at 35% 28%, rgba(255,255,255,0.45) 0%, rgba(60,200,80,0.10) 55%, rgba(10,120,20,0.18) 100%)",
    glow: "#38c038",
    border: "rgba(100,220,110,0.55)",
    shine: "rgba(255,255,255,0.72)",
    label: "評価・学習",
    Icon: BookOpen,
  },
  C: {
    bg: "radial-gradient(circle at 35% 28%, rgba(255,255,255,0.45) 0%, rgba(240,70,60,0.10) 55%, rgba(160,16,12,0.18) 100%)",
    glow: "#e83030",
    border: "rgba(255,120,110,0.55)",
    shine: "rgba(255,255,255,0.72)",
    label: "権利・規律",
    Icon: Shield,
  },
  D: {
    bg: "radial-gradient(circle at 35% 28%, rgba(255,255,255,0.45) 0%, rgba(160,60,240,0.10) 55%, rgba(88,16,168,0.18) 100%)",
    glow: "#9030e0",
    border: "rgba(190,100,255,0.55)",
    shine: "rgba(255,255,255,0.72)",
    label: "多様性",
    Icon: Users,
  },
  E: {
    bg: "radial-gradient(circle at 35% 28%, rgba(255,255,255,0.45) 0%, rgba(230,170,20,0.10) 55%, rgba(140,100,0,0.18) 100%)",
    glow: "#e0a010",
    border: "rgba(235,200,50,0.55)",
    shine: "rgba(255,255,255,0.72)",
    label: "教師・学校",
    Icon: GraduationCap,
  },
  F: {
    bg: "radial-gradient(circle at 35% 28%, rgba(255,255,255,0.45) 0%, rgba(72,100,230,0.10) 55%, rgba(24,40,160,0.18) 100%)",
    glow: "#4860d8",
    border: "rgba(130,155,240,0.55)",
    shine: "rgba(255,255,255,0.72)",
    label: "各教科",
    Icon: BookMarked,
  },
};

// ── 配置：各分類を「密集した塊（ぷよの房）」として中心インタロップの周りに散らす ──
// オフセットはバブル径基準（=1）。各塊ごとに sx/sy で画面%へ変換（縦横比・形状補正）。

// 六角パッキングで n 個を中心から近い順に詰めた塊（円のリングではなく中身の詰まった塊）
function hexCluster(n: number): [number, number][] {
  const raw: { x: number; y: number; d: number }[] = [];
  const R = 4;
  for (let q = -R; q <= R; q++) {
    for (let r = -R; r <= R; r++) {
      const x = q + r / 2;
      const y = r * (Math.sqrt(3) / 2);
      raw.push({ x, y, d: Math.hypot(x, y) });
    }
  }
  raw.sort((a, b) => a.d - b.d);
  return raw.slice(0, n).map((p) => [p.x, p.y] as [number, number]);
}

// 少数個は列にならないよう手動で塊の形を指定
const SHAPE: Record<number, [number, number][]> = {
  2: [[-0.42, -0.32], [0.42, 0.32]],                              // 斜め2個
  4: [[0, -0.62], [-0.56, 0.24], [0.56, 0.24], [0, 0.92]],        // ひし形の4連塊
  12: hexCluster(12),                                             // 六角の大塊
};

// 各分類のクラスター中心（中心インタロップ=50,46 を囲むように配置）
const CLUSTER_CENTER: Record<string, { c: [number, number]; n: number; sx: number; sy: number }> = {
  A: { c: [22, 29], n: 4, sx: 5.6, sy: 9.6 },  // 左上：AI・テク
  B: { c: [78, 29], n: 4, sx: 5.6, sy: 9.6 },  // 右上：評価・学習
  C: { c: [14, 58], n: 4, sx: 5.6, sy: 9.6 },  // 左下：権利・規律
  D: { c: [88, 52], n: 2, sx: 5.6, sy: 9.6 },  // 右：多様性
  E: { c: [33, 82], n: 2, sx: 5.6, sy: 9.6 },  // 下：教師・学校
  F: { c: [60, 74], n: 12, sx: 7.0, sy: 7.8 }, // 下中央の大塊：各教科（横長に展開）
};

type Placement = { pos: [number, number]; dir: [number, number] };

// sortTopicsForBurst 順 = A×4, B×4, C×4, D×2, E×2, F×12 に対応
function buildPlacements(): Placement[] {
  const result: Placement[] = [];
  for (const g of ["A", "B", "C", "D", "E", "F"] as const) {
    const { c, n, sx, sy } = CLUSTER_CENTER[g];
    const offs = SHAPE[n] ?? hexCluster(n);
    // 塊の重心を原点に合わせてからクラスター中心へ
    const mx = offs.reduce((s, o) => s + o[0], 0) / offs.length;
    const my = offs.reduce((s, o) => s + o[1], 0) / offs.length;
    for (const [ox, oy] of offs) {
      const rx = ox - mx;
      const ry = oy - my;
      const len = Math.hypot(rx, ry) || 1;
      result.push({
        pos: [+(c[0] + rx * sx).toFixed(2), +(c[1] + ry * sy).toFixed(2)],
        dir: [rx / len, ry / len], // 塊重心→バブル の向き（ラベル配置に使用）
      });
    }
  }
  return result;
}

const PLACEMENTS: Placement[] = buildPlacements();

// 各塊の上端 y(%)（グループ名ラベルを塊の上に常時表示するため）
function clusterTopPct(g: string): number {
  const { c, n, sy } = CLUSTER_CENTER[g];
  const offs = SHAPE[n] ?? hexCluster(n);
  const my = offs.reduce((s, o) => s + o[1], 0) / offs.length;
  const minRy = Math.min(...offs.map((o) => o[1] - my));
  return c[1] + minRy * sy;
}

const PUYO_CSS = `
@keyframes puyoAnim {
  0%   { transform: translate(-50%, calc(-50% + 0px)) scale(0.96); }
  35%  { transform: translate(-50%, calc(-50% - 8px)) scale(1.03); }
  65%  { transform: translate(-50%, calc(-50% - 11px)) scale(1.06); }
  85%  { transform: translate(-50%, calc(-50% - 3px)) scale(1.01); }
  100% { transform: translate(-50%, calc(-50% + 0px)) scale(0.96); }
}
@keyframes centerPulse {
  0%,100% { transform: translate(-50%,-50%) scale(1.00); }
  50%     { transform: translate(-50%,-50%) scale(1.07); }
}
`;

const BUBBLE_SIZE = 60;
const CENTER_SIZE = 118;

function PuyoBubble({
  topic,
  pos,
  dir,
  index,
  onActivate,
}: {
  topic: InteropPriorityTopic;
  pos: [number, number];
  dir: [number, number];
  index: number;
  onActivate: () => void;
}) {
  const sty = GROUP_STYLE[topic.major] ?? GROUP_STYLE.F;
  const { Icon } = sty;
  const dur = 7 + ((topic.no * 13 + index * 9) % 60) / 10;
  const delay = -((topic.no * 7 + index * 4) % 70) / 10;
  // ラベルを塊の外向き（上/下）に逃がして重なりを抑える
  const labelAbove = dir[1] < -0.25;

  return (
    <button
      type="button"
      onClick={onActivate}
      className="group absolute z-10 hover:z-50 focus:z-50 focus:outline-none"
      style={{
        left: `${pos[0]}%`,
        top: `${pos[1]}%`,
        width: BUBBLE_SIZE,
        height: BUBBLE_SIZE,
        animation: `puyoAnim ${dur}s ease-in-out ${delay}s infinite`,
      }}
      aria-label={topic.category}
    >
      {/* Glow halo */}
      <span
        className="pointer-events-none absolute rounded-full transition-opacity duration-300"
        style={{
          inset: -16,
          background: `radial-gradient(circle, ${sty.glow}2a 0%, transparent 65%)`,
          opacity: 0.85,
        }}
      />
      <span
        className="pointer-events-none absolute rounded-full opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{
          inset: -16,
          background: `radial-gradient(circle, ${sty.glow}55 0%, transparent 65%)`,
        }}
      />

      {/* Bubble body — transparent glass */}
      <span
        className="relative flex h-full w-full items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-[1.10] group-active:scale-[0.92]"
        style={{
          background: sty.bg,
          border: `1.5px solid ${sty.border}`,
          boxShadow: `0 0 20px ${sty.glow}22, 0 4px 16px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.60)`,
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
        }}
      >
        {/* Top-left shine */}
        <span
          className="pointer-events-none absolute rounded-full"
          style={{
            top: "9%", left: "12%",
            width: "44%", height: "36%",
            background: sty.shine,
            filter: "blur(4px)",
            opacity: 0.60,
          }}
        />
        {/* Center icon */}
        <Icon
          className="relative z-10"
          style={{ width: 22, height: 22, color: sty.glow, opacity: 0.88 }}
          strokeWidth={1.6}
        />
      </span>

      {/* Label — ホバー/フォーカス時のみ表示（常時表示すると塊内で重なるため） */}
      <span
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-center opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus:opacity-100"
        style={{
          ...(labelAbove ? { bottom: `calc(100% + 6px)` } : { top: `calc(100% + 6px)` }),
          width: 120,
          zIndex: 60,
          fontSize: "11px",
          fontWeight: 700,
          lineHeight: 1.35,
          color: "rgba(255,255,255,0.98)",
          background: "rgba(4,6,24,0.88)",
          border: `1px solid ${sty.border}`,
          borderRadius: 10,
          padding: "3px 9px",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          boxShadow: `0 2px 12px rgba(0,0,0,0.45), 0 0 10px ${sty.glow}40`,
          wordBreak: "keep-all",
          overflowWrap: "anywhere",
          whiteSpace: "normal",
        } as React.CSSProperties}
      >
        {topic.category}
      </span>
    </button>
  );
}

function GroupChip({ label, sty }: { label: string; sty: GroupStyleEntry }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold text-white/90"
      style={{
        background: `${sty.glow}22`,
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

      {/* 各塊の分類名（常時表示・1塊1つ） */}
      {(Object.keys(CLUSTER_CENTER) as Array<keyof typeof CLUSTER_CENTER>).map((g) => {
        const { c } = CLUSTER_CENTER[g];
        const sty = GROUP_STYLE[g];
        return (
          <span
            key={`group-label-${g}`}
            className="pointer-events-none absolute z-30 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[12.5px] font-bold text-white"
            style={{
              left: `${c[0]}%`,
              top: `${clusterTopPct(g) - 4}%`,
              background: `${sty.glow}d8`,
              border: `1px solid ${sty.border}`,
              boxShadow: `0 2px 12px ${sty.glow}66`,
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
            }}
          >
            {sty.label}
          </span>
        );
      })}

      {topics.map((topic, i) => {
        const place = PLACEMENTS[i] ?? { pos: [50, 50] as [number, number], dir: [0, 1] as [number, number] };
        return (
          <PuyoBubble
            key={topic.no}
            topic={topic}
            pos={place.pos}
            dir={place.dir}
            index={i}
            onActivate={() => onSelectTopic(topic)}
          />
        );
      })}

      {interopCat && (
        <button
          type="button"
          onClick={() => onSelectCategory(interopCat)}
          className="group absolute focus:outline-none"
          style={{
            left: "50%",
            top: "46%",
            width: CENTER_SIZE,
            height: CENTER_SIZE,
            zIndex: 20,
            animation: `centerPulse 8s ease-in-out infinite`,
          }}
          aria-label="インタロップ"
        >
          <span
            className="pointer-events-none absolute rounded-full"
            style={{
              inset: -20,
              background: "radial-gradient(circle, rgba(160,190,255,0.20) 0%, transparent 68%)",
            }}
          />
          <span
            className="pointer-events-none absolute rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              inset: -20,
              background: "radial-gradient(circle, rgba(160,190,255,0.42) 0%, transparent 68%)",
            }}
          />
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
            <span
              className="pointer-events-none absolute rounded-full"
              style={{ top: "10%", left: "14%", width: "44%", height: "34%", background: "rgba(255,255,255,0.90)", filter: "blur(4px)" }}
            />
            <InteropIcon className="relative z-10 h-6 w-6 text-[#1a3a8a]" strokeWidth={1.8} />
            <span className="relative z-10 mt-1 text-[11px] font-bold leading-tight text-[#1a3a8a]">インタロップ</span>
          </span>
        </button>
      )}

      <div className="pointer-events-none absolute bottom-20 left-4 right-4 z-30 flex flex-wrap gap-1.5 md:bottom-6">
        {Object.entries(GROUP_STYLE).map(([major, sty]) => (
          <GroupChip key={major} label={sty.label} sty={sty} />
        ))}
      </div>
    </div>
  );
}
