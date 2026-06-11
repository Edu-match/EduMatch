"use client";

import type { LucideIcon } from "lucide-react";
import { Bot, BookMarked, BookOpen, GraduationCap, Network, Shield, Users } from "lucide-react";
import {
  INTEROP_PRIORITY_TOPICS,
  sortTopicsForBurst,
  type InteropPriorityTopic,
} from "@/lib/interop-priority-topics";
import type { InteropCategory } from "@/components/interop/interop-category-bubble-map";
import { ForumHotFlame } from "@/components/community/forum-hot-flame";
import {
  computeThemeRoomBubbleDiameter,
  formatActivityHint,
  isInteropHot,
  type InteropActivityStats,
} from "@/lib/interop-activity";
import { computePuyoIntensity, INTEROP_PUYO_CSS, puyoAnimationStyle } from "@/lib/interop-puyopuyo";
import { useEffect, useMemo, useState } from "react";

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

// 各教科F(12)：PC=横長2段（上段=上ラベル・下段=下ラベル）
function fRows(): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) pts.push([i - 2.5, -0.55]);
  for (let i = 0; i < 6; i++) pts.push([i - 2.5 + 0.5, 0.55]);
  return pts;
}
const SHAPE_DESKTOP: Record<number, [number, number][]> = {
  2: [[-0.42, -0.32], [0.42, 0.32]],
  4: [[0, -0.62], [-0.56, 0.24], [0.56, 0.24], [0, 0.92]],
  12: fRows(),
};

type Clusters = Record<string, { c: [number, number]; n: number; sx: number; sy: number }>;

// PC：中心インタロップ(50,46)を囲む四隅＋下＋下中央の大塊
const DESKTOP_CLUSTERS: Clusters = {
  A: { c: [20, 28], n: 4, sx: 6.8, sy: 11.6 },  // 左上：AI・テク
  B: { c: [80, 28], n: 4, sx: 6.8, sy: 11.6 },  // 右上：評価・学習
  C: { c: [12, 59], n: 4, sx: 6.8, sy: 11.6 },  // 左下：権利・規律
  D: { c: [90, 52], n: 2, sx: 6.8, sy: 11.6 },  // 右：多様性
  E: { c: [31, 84], n: 2, sx: 6.8, sy: 11.6 },  // 下：教師・学校
  F: { c: [58, 72], n: 12, sx: 8.6, sy: 10.0 }, // 下中央の大塊：各教科
};
type Placement = { pos: [number, number]; dir: [number, number] };

// sortTopicsForBurst 順 = A×4, B×4, C×4, D×2, E×2, F×12 に対応
function buildPlacements(clusters: Clusters, shape: Record<number, [number, number][]>): Placement[] {
  const result: Placement[] = [];
  for (const g of ["A", "B", "C", "D", "E", "F"] as const) {
    const { c, n, sx, sy } = clusters[g];
    const offs = shape[n] ?? hexCluster(n);
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

const DESKTOP_PLACEMENTS: Placement[] = buildPlacements(DESKTOP_CLUSTERS, SHAPE_DESKTOP);

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
  50%     { transform: translate(-50%,-50%) scale(1.06); }
}
@keyframes centerRing {
  0%   { transform: translate(-50%,-50%) scale(0.85); opacity: 0.55; }
  70%  { opacity: 0; }
  100% { transform: translate(-50%,-50%) scale(1.9); opacity: 0; }
}
`;

const BUBBLE_SIZE_DESKTOP = 64;
const CENTER_SIZE_DESKTOP = 132;

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return mobile;
}

function PuyoBubble({
  topic,
  pos,
  dir,
  index,
  bubbleSize,
  stats,
  onActivate,
}: {
  topic: InteropPriorityTopic;
  pos: [number, number];
  dir: [number, number];
  index: number;
  bubbleSize: number;
  stats: InteropActivityStats;
  onActivate: () => void;
}) {
  const hot = isInteropHot(stats);
  // サイズは固定（拡大すると固定配置で隣の玉・ラベルに被るため）。盛り上がりは色/グロー/🔥/炎で表現。
  const size = bubbleSize;
  const hint = formatActivityHint(stats);
  const intensity = computePuyoIntensity(stats);
  // 揺れは控えめに（やかましさ・被り回避）。hot でも大きくは揺らさない。
  const puyoStyle =
    intensity > 0.2
      ? puyoAnimationStyle(topic.no * 7 + index, intensity * 0.3, false)
      : undefined;
  const iconSize = Math.round(size * 0.42);
  const labelFont = size < 56 ? 9.5 : 11;
  const sty = GROUP_STYLE[topic.major] ?? GROUP_STYLE.F;
  const { Icon } = sty;
  const dur = 7 + ((topic.no * 13 + index * 9) % 60) / 10;
  const delay = -((topic.no * 7 + index * 4) % 70) / 10;
  // ラベルを塊の外向き（上/下/左/右）に常時配置して重なりを回避
  const ax = dir[0];
  const ay = dir[1];
  const horizontal = Math.abs(ax) > Math.abs(ay) * 1.15;
  const labelPos: React.CSSProperties = horizontal
    ? ax < 0
      ? { right: "calc(100% + 9px)", top: "50%", transform: "translateY(-50%)" }
      : { left: "calc(100% + 9px)", top: "50%", transform: "translateY(-50%)" }
    : ay < 0
      ? { bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" }
      : { top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" };

  return (
    <button
      type="button"
      onClick={onActivate}
      className="group absolute z-10 hover:z-50 focus:z-50 focus:outline-none"
      style={{
        left: `${pos[0]}%`,
        top: `${pos[1]}%`,
        width: size,
        height: size,
        animation: `puyoAnim ${dur}s ease-in-out ${delay}s infinite`,
      }}
      aria-label={topic.category}
    >
      {/* Glow halo（常時＋ホバーで増強） */}
      <span
        className="pointer-events-none absolute rounded-full transition-opacity duration-300"
        style={{
          inset: hot ? -18 : -16,
          background: hot
            ? "radial-gradient(circle, rgba(255,150,60,0.42) 0%, rgba(255,100,30,0.16) 45%, transparent 68%)"
            : `radial-gradient(circle, ${sty.glow}3d 0%, ${sty.glow}14 45%, transparent 68%)`,
          opacity: hot ? 1 : 0.9,
        }}
      />
      <span
        className="pointer-events-none absolute rounded-full opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{
          inset: -24,
          background: `radial-gradient(circle, ${sty.glow}66 0%, transparent 66%)`,
        }}
      />

      {/* Bubble body — transparent glass */}
      <span
        className={`relative flex h-full w-full items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-[1.10] group-active:scale-[0.92]${puyoStyle ? " interop-puyo" : ""}`}
        style={{
          ...puyoStyle,
          background: hot
            ? "radial-gradient(circle at 35% 28%, rgba(255,255,255,0.50) 0%, rgba(255,200,140,0.22) 42%, rgba(230,140,50,0.28) 100%)"
            : sty.bg,
          border: hot ? "1.5px solid rgba(255,190,120,0.75)" : `1.5px solid ${sty.border}`,
          boxShadow: hot
            ? "0 0 28px rgba(255,130,50,0.42), 0 4px 16px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.60)"
            : `0 0 20px ${sty.glow}22, 0 4px 16px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.60)`,
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
          style={{
            width: iconSize,
            height: iconSize,
            color: hot ? "#ffb870" : sty.glow,
            opacity: 0.95,
            filter: hot ? undefined : `drop-shadow(0 0 4px ${sty.glow}88)`,
          }}
          strokeWidth={1.7}
        />
        {hot && (
          <span className="absolute -right-0.5 -top-0.5 z-20">
            <ForumHotFlame size="sm" />
          </span>
        )}
        {hint && (
          <span
            className="absolute -bottom-1 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[8px] font-bold text-white shadow"
            style={{ background: hot ? "rgba(255,120,40,0.92)" : `${sty.glow}cc` }}
          >
            {hint}
          </span>
        )}
      </span>

      {/* Label — 常時表示・塊の外向き（放射状）に配置 */}
      <span
        className="pointer-events-none absolute text-center transition-transform duration-150 group-hover:scale-[1.06]"
        style={{
          ...labelPos,
          width: "max-content",
          maxWidth: size < 56 ? 92 : 116,
          zIndex: 40,
          fontSize: `${labelFont}px`,
          fontWeight: 700,
          lineHeight: 1.3,
          color: "rgba(255,255,255,0.98)",
          background: `linear-gradient(135deg, rgba(8,11,32,0.86) 0%, ${sty.glow}33 100%)`,
          border: `1px solid ${sty.border}`,
          borderRadius: 9,
          padding: "2.5px 8px",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          boxShadow: `0 2px 12px rgba(0,0,0,0.42), 0 0 12px ${sty.glow}38`,
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

// ───────────────── モバイル専用UI ─────────────────

function MobilePuyoCard({
  topic,
  stats,
  onActivate,
}: {
  topic: InteropPriorityTopic;
  stats: InteropActivityStats;
  onActivate: () => void;
}) {
  const sty = GROUP_STYLE[topic.major] ?? GROUP_STYLE.F;
  const { Icon } = sty;
  const hot = isInteropHot(stats);
  const size = computeThemeRoomBubbleDiameter(60, stats);
  const hint = formatActivityHint(stats);
  return (
    <button
      type="button"
      onClick={onActivate}
      className="flex flex-col items-center gap-1.5 transition-transform focus:outline-none active:scale-95"
    >
      <span
        className="relative grid place-items-center rounded-full"
        style={{
          width: size,
          height: size,
          background: hot
            ? "radial-gradient(circle at 35% 28%, rgba(255,255,255,0.50) 0%, rgba(255,200,140,0.22) 42%, rgba(230,140,50,0.28) 100%)"
            : sty.bg,
          border: hot ? "1.5px solid rgba(255,190,120,0.75)" : `1.5px solid ${sty.border}`,
          boxShadow: hot
            ? "0 0 20px rgba(255,130,50,0.38), 0 4px 12px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.6)"
            : `0 0 16px ${sty.glow}33, 0 4px 12px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.6)`,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <span
          className="pointer-events-none absolute rounded-full"
          style={{ top: "10%", left: "14%", width: "42%", height: "32%", background: sty.shine, filter: "blur(3px)", opacity: 0.55 }}
        />
        <Icon
          style={{
            width: Math.round(size * 0.4),
            height: Math.round(size * 0.4),
            color: hot ? "#ffb870" : sty.glow,
            opacity: 0.95,
            filter: hot ? undefined : `drop-shadow(0 0 3px ${sty.glow}77)`,
          }}
          strokeWidth={1.7}
        />
        {hot && (
          <span className="absolute -right-0.5 -top-0.5 z-10">
            <ForumHotFlame size="sm" />
          </span>
        )}
        {hint && (
          <span
            className="absolute -bottom-1 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full px-1 py-0.5 text-[7px] font-bold text-white"
            style={{ background: "rgba(255,120,40,0.92)" }}
          >
            {hint}
          </span>
        )}
      </span>
      <span
        className="text-center text-[10.5px] font-semibold leading-tight text-white/95"
        style={{ wordBreak: "keep-all", overflowWrap: "anywhere" }}
      >
        {topic.category}
      </span>
    </button>
  );
}

/** モバイル：縦スクロールの分類セクション（玉ビジュアルは維持しつつ一覧性・タップ性を最優先） */
function MobileBubbleMap({
  interopCat,
  activityByRoom,
  onSelectCategory,
  onSelectTopic,
  iconFor,
}: {
  interopCat: InteropCategory | undefined;
  activityByRoom: Map<string, InteropActivityStats>;
  onSelectCategory: (cat: InteropCategory) => void;
  onSelectTopic: (topic: InteropPriorityTopic) => void;
  iconFor: (slug: string) => LucideIcon;
}) {
  const groups = useMemo(() => {
    const m: Record<string, InteropPriorityTopic[]> = {};
    for (const t of sortTopicsForBurst(INTEROP_PRIORITY_TOPICS)) (m[t.major] ??= []).push(t);
    return m;
  }, []);
  const InteropIcon = interopCat ? iconFor(interopCat.slug) : Network;

  return (
    <div className="absolute inset-0 overflow-y-auto overflow-x-hidden">
      <div className="px-4 pb-28 pt-[4.75rem]">
        {/* 中心インタロップ（大バナー） */}
        {interopCat && (
          <button
            type="button"
            onClick={() => onSelectCategory(interopCat)}
            className="relative mb-6 flex w-full items-center gap-3 rounded-3xl px-4 py-3.5 text-left transition-transform focus:outline-none active:scale-[0.98]"
            style={{
              background:
                "radial-gradient(circle at 24% 24%, rgba(255,255,255,0.96) 0%, rgba(218,228,255,0.86) 42%, rgba(150,172,255,0.80) 100%)",
              border: "2px solid rgba(200,218,255,0.8)",
              boxShadow: "0 0 28px rgba(130,160,255,0.45), 0 8px 22px rgba(0,0,0,0.25)",
            }}
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/70">
              <InteropIcon className="h-6 w-6 text-[#1a3a8a]" strokeWidth={1.9} />
            </span>
            <span className="flex flex-col">
              <span className="text-[15px] font-bold text-[#13245e]">インタロップ</span>
              <span className="text-[11px] font-medium text-[#3a4a8a]">展示・セミナー・ご意見はこちら</span>
            </span>
          </button>
        )}

        {/* 分類セクション */}
        {(["A", "B", "C", "D", "E", "F"] as const).map((major) => {
          const sty = GROUP_STYLE[major];
          const list = groups[major] ?? [];
          if (!list.length) return null;
          return (
            <section key={major} className="mb-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full" style={{ background: sty.glow, boxShadow: `0 0 8px ${sty.glow}` }} />
                <h3 className="text-[15px] font-bold text-white">{sty.label}</h3>
                <span className="text-[11px] text-white/45">{list.length}件</span>
              </div>
              <div className="grid grid-cols-3 gap-x-2 gap-y-4">
                {list.map((topic) => (
                  <MobilePuyoCard
                    key={topic.no}
                    topic={topic}
                    stats={activityByRoom.get(topic.roomId) ?? { postCount: 0, participantCount: 0 }}
                    onActivate={() => onSelectTopic(topic)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/** トップ：28ぷよぷよ玉 + 中心インタロップ（中心から放射状配置） */
export function InteropPuyoBubbleMap({
  interopCat,
  activityByRoom,
  onSelectCategory,
  onSelectTopic,
  iconFor,
}: {
  interopCat: InteropCategory | undefined;
  activityByRoom: Map<string, InteropActivityStats>;
  onSelectCategory: (cat: InteropCategory) => void;
  onSelectTopic: (topic: InteropPriorityTopic) => void;
  iconFor: (slug: string) => LucideIcon;
}) {
  const topics = useMemo(() => sortTopicsForBurst(INTEROP_PRIORITY_TOPICS), []);
  const InteropIcon = interopCat ? iconFor(interopCat.slug) : Network;
  const isMobile = useIsMobile();

  // モバイルは専用UI（縦スクロールの分類セクション）
  if (isMobile) {
    return (
      <MobileBubbleMap
        interopCat={interopCat}
        activityByRoom={activityByRoom}
        onSelectCategory={onSelectCategory}
        onSelectTopic={onSelectTopic}
        iconFor={iconFor}
      />
    );
  }

  const placements = DESKTOP_PLACEMENTS;
  const bubbleSize = BUBBLE_SIZE_DESKTOP;
  const centerSize = CENTER_SIZE_DESKTOP;

  return (
    <div className="absolute inset-0 overflow-hidden">
      <style>{PUYO_CSS}{INTEROP_PUYO_CSS}</style>

      {topics.map((topic, i) => {
        const place = placements[i] ?? { pos: [50, 50] as [number, number], dir: [0, 1] as [number, number] };
        return (
          <PuyoBubble
            key={topic.no}
            topic={topic}
            stats={activityByRoom.get(topic.roomId) ?? { postCount: 0, participantCount: 0 }}
            pos={place.pos}
            dir={place.dir}
            index={i}
            bubbleSize={bubbleSize}
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
            top: isMobile ? "30%" : "46%",
            width: centerSize,
            height: centerSize,
            zIndex: 20,
            animation: `centerPulse 8s ease-in-out infinite`,
          }}
          aria-label="インタロップ"
        >
          {/* 放射するパルスリング（2本・時差） */}
          <span
            className="pointer-events-none absolute left-1/2 top-1/2 rounded-full"
            style={{
              width: centerSize,
              height: centerSize,
              border: "2px solid rgba(170,200,255,0.55)",
              animation: "centerRing 3.6s ease-out infinite",
            }}
          />
          <span
            className="pointer-events-none absolute left-1/2 top-1/2 rounded-full"
            style={{
              width: centerSize,
              height: centerSize,
              border: "2px solid rgba(170,200,255,0.45)",
              animation: "centerRing 3.6s ease-out 1.8s infinite",
            }}
          />
          <span
            className="pointer-events-none absolute rounded-full"
            style={{
              inset: -26,
              background: "radial-gradient(circle, rgba(160,190,255,0.28) 0%, transparent 68%)",
            }}
          />
          <span
            className="pointer-events-none absolute rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              inset: -26,
              background: "radial-gradient(circle, rgba(160,190,255,0.5) 0%, transparent 68%)",
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
            <InteropIcon className="relative z-10 h-7 w-7 text-[#1a3a8a]" strokeWidth={1.9} />
            <span className="relative z-10 mt-1 text-[13px] font-bold leading-tight text-[#1a3a8a]">インタロップ</span>
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
