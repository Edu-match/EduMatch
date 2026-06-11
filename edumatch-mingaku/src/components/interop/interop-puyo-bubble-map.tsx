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
import type { InteropActivityStats } from "@/lib/interop-activity";
import { computePuyoIntensity, INTEROP_PUYO_CSS, puyoAnimationStyle } from "@/lib/interop-puyopuyo";
import { DEFAULT_AXIS_CONFIG, DEFAULT_TOPIC_AXIS, type AxisConfig, type AxisPoint } from "@/lib/interop-topic-axis";
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

type Placement = { pos: [number, number]; dir: [number, number] };

// 2軸座標(-1..1) → 画面%。中心(50,49)、横半幅RX/縦半幅RY。
const AXIS_CX = 50;
const AXIS_CY = 49;
const AXIS_RX = 40;
const AXIS_RY = 36;

/** topic ごとの軸座標を画面配置に変換。近接玉は反発で分散（被り回避）。 */
function computeAxisPlacements(
  topics: InteropPriorityTopic[],
  axisMap: Record<number, AxisPoint>
): Placement[] {
  const pts = topics.map((t) => {
    const a = axisMap[t.no] ?? { x: 0, y: 0 };
    return { x: AXIS_CX + a.x * AXIS_RX, y: AXIS_CY - a.y * AXIS_RY };
  });
  // 反発で被り回避（y方向は%が大きいので圧縮して等方近似）
  const minDist = 8.5;
  const ys = 0.55;
  for (let k = 0; k < 90; k++) {
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[j].x - pts[i].x;
        const dy = (pts[j].y - pts[i].y) * ys;
        const d = Math.hypot(dx, dy) || 0.01;
        if (d < minDist) {
          const push = (minDist - d) / 2;
          const ux = dx / d;
          const uy = dy / d;
          pts[i].x -= ux * push;
          pts[i].y -= (uy * push) / ys;
          pts[j].x += ux * push;
          pts[j].y += (uy * push) / ys;
        }
      }
    }
  }
  return pts.map((p) => {
    const x = Math.max(8, Math.min(92, p.x));
    const y = Math.max(13, Math.min(86, p.y));
    const dx = x - AXIS_CX;
    const dy = y - AXIS_CY;
    const len = Math.hypot(dx, dy) || 1;
    return {
      pos: [+x.toFixed(2), +y.toFixed(2)] as [number, number],
      dir: [dx / len, dy / len] as [number, number],
    };
  });
}


/** 全玉の投稿数から「炎=全体平均より上」「拡大=上位5」を判定するためのランキング */
function computeBubbleRanking(
  topics: InteropPriorityTopic[],
  activityByRoom: Map<string, InteropActivityStats>
): { avg: number; big: Set<string> } {
  const counts = topics.map((t) => activityByRoom.get(t.roomId)?.postCount ?? 0);
  const avg = counts.reduce((a, b) => a + b, 0) / (counts.length || 1);
  const ranked = topics
    .map((t) => ({ id: t.roomId, c: activityByRoom.get(t.roomId)?.postCount ?? 0 }))
    .filter((x) => x.c > 0)
    .sort((a, b) => b.c - a.c);
  const big = new Set(ranked.slice(0, 5).map((x) => x.id));
  return { avg, big };
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
  50%     { transform: translate(-50%,-50%) scale(1.06); }
}
@keyframes centerRing {
  0%   { transform: translate(-50%,-50%) scale(0.85); opacity: 0.55; }
  70%  { opacity: 0; }
  100% { transform: translate(-50%,-50%) scale(1.9); opacity: 0; }
}
@keyframes commentPop {
  0%   { opacity: 0; transform: translate(-50%, -4px) scale(0.92); }
  12%  { opacity: 1; transform: translate(-50%, -12px) scale(1); }
  82%  { opacity: 1; transform: translate(-50%, -16px) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -24px) scale(0.98); }
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
  isHot,
  isBig,
  onActivate,
}: {
  topic: InteropPriorityTopic;
  pos: [number, number];
  dir: [number, number];
  index: number;
  bubbleSize: number;
  stats: InteropActivityStats;
  /** 炎・盛り上がり配色（全体平均より投稿が多い） */
  isHot: boolean;
  /** 拡大対象（投稿数 上位5） */
  isBig: boolean;
  onActivate: () => void;
}) {
  const hot = isHot;
  // 拡大は上位5のみ・控えめ（1.15倍）。間隔に余裕があるので被らない。
  const size = isBig ? Math.round(bubbleSize * 1.15) : bubbleSize;
  // 件数表示（炎マークは付けない）。直近24hに新着があれば「！」を出す。
  const hint = stats.postCount > 0 ? `${stats.postCount}件` : undefined;
  const isRecent = stats.lastPostedAt
    ? Date.now() - new Date(stats.lastPostedAt).getTime() < 86_400_000
    : false;
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
      {/* Glow halo（常時・分類色を維持。盛り上がりでもオレンジにしない） */}
      <span
        className="pointer-events-none absolute rounded-full transition-opacity duration-300"
        style={{
          inset: -16,
          background: `radial-gradient(circle, ${sty.glow}3d 0%, ${sty.glow}14 45%, transparent 68%)`,
          opacity: 0.9,
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
          style={{
            width: iconSize,
            height: iconSize,
            color: sty.glow,
            opacity: 0.95,
            filter: `drop-shadow(0 0 4px ${sty.glow}88)`,
          }}
          strokeWidth={1.7}
        />
        {/* 盛り上がり（全体平均超え）＝炎マークのみ。玉の色は分類色を維持 */}
        {hot && (
          <span className="absolute -right-0.5 -top-0.5 z-20">
            <ForumHotFlame size="sm" />
          </span>
        )}
        {/* 直近24h新着＝「！」マーク */}
        {isRecent && (
          <span
            className="absolute -left-1 -top-1 z-20 grid h-4 w-4 place-items-center rounded-full text-[10px] font-black leading-none text-white shadow"
            style={{ background: "#ff3b30" }}
            title="24時間以内に新しい投稿があります"
          >
            !
          </span>
        )}
        {hint && (
          <span
            className="absolute -bottom-1 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[8px] font-bold text-white shadow"
            style={{ background: `${sty.glow}cc` }}
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
  isHot,
  isBig,
  onActivate,
}: {
  topic: InteropPriorityTopic;
  stats: InteropActivityStats;
  isHot: boolean;
  isBig: boolean;
  onActivate: () => void;
}) {
  const sty = GROUP_STYLE[topic.major] ?? GROUP_STYLE.F;
  const { Icon } = sty;
  const hot = isHot;
  const size = isBig ? 69 : 60; // 上位5のみ控えめに拡大
  const hint = stats.postCount > 0 ? `${stats.postCount}件` : undefined;
  const isRecent = stats.lastPostedAt
    ? Date.now() - new Date(stats.lastPostedAt).getTime() < 86_400_000
    : false;
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
          background: sty.bg,
          border: `1.5px solid ${sty.border}`,
          boxShadow: `0 0 16px ${sty.glow}33, 0 4px 12px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.6)`,
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
            color: sty.glow,
            opacity: 0.95,
            filter: `drop-shadow(0 0 3px ${sty.glow}77)`,
          }}
          strokeWidth={1.7}
        />
        {hot && (
          <span className="absolute -right-0.5 -top-0.5 z-10">
            <ForumHotFlame size="sm" />
          </span>
        )}
        {isRecent && (
          <span
            className="absolute -left-1 -top-1 z-10 grid h-4 w-4 place-items-center rounded-full text-[10px] font-black leading-none text-white shadow"
            style={{ background: "#ff3b30" }}
            title="24時間以内に新しい投稿があります"
          >
            !
          </span>
        )}
        {hint && (
          <span
            className="absolute -bottom-1 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full px-1 py-0.5 text-[7px] font-bold text-white"
            style={{ background: `${sty.glow}cc` }}
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
  ranking,
  onSelectCategory,
  onSelectTopic,
  iconFor,
}: {
  interopCat: InteropCategory | undefined;
  activityByRoom: Map<string, InteropActivityStats>;
  ranking: { avg: number; big: Set<string> };
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
                {list.map((topic) => {
                  const stats = activityByRoom.get(topic.roomId) ?? { postCount: 0, participantCount: 0 };
                  const isHot = stats.postCount > 0 && stats.postCount > ranking.avg;
                  const isBig = ranking.big.has(topic.roomId);
                  return (
                    <MobilePuyoCard
                      key={topic.no}
                      topic={topic}
                      stats={stats}
                      isHot={isHot}
                      isBig={isBig}
                      onActivate={() => onSelectTopic(topic)}
                    />
                  );
                })}
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
  axisConfig = DEFAULT_AXIS_CONFIG,
  topicPositions,
  onSelectCategory,
  onSelectTopic,
  iconFor,
}: {
  interopCat: InteropCategory | undefined;
  activityByRoom: Map<string, InteropActivityStats>;
  axisConfig?: AxisConfig;
  topicPositions?: Record<number, AxisPoint>;
  onSelectCategory: (cat: InteropCategory) => void;
  onSelectTopic: (topic: InteropPriorityTopic) => void;
  iconFor: (slug: string) => LucideIcon;
}) {
  const topics = useMemo(() => sortTopicsForBurst(INTEROP_PRIORITY_TOPICS), []);
  const InteropIcon = interopCat ? iconFor(interopCat.slug) : Network;
  const isMobile = useIsMobile();
  const ranking = useMemo(() => computeBubbleRanking(topics, activityByRoom), [topics, activityByRoom]);
  const placements = useMemo(
    () => computeAxisPlacements(topics, topicPositions ?? DEFAULT_TOPIC_AXIS),
    [topics, topicPositions]
  );
  // 関連カテゴリのノード接続線（座標が近いトピック同士を結ぶ）
  const connections = useMemo(() => {
    const pts = placements.map((p) => p.pos);
    const res: Array<{ a: [number, number]; b: [number, number] }> = [];
    for (let i = 0; i < pts.length; i++) {
      const near = pts
        .map((q, j) => ({ j, d: Math.hypot(q[0] - pts[i][0], (q[1] - pts[i][1]) * 0.55) }))
        .filter((x) => x.j !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 2);
      for (const n of near) {
        if (n.j > i && n.d < 22) res.push({ a: pts[i], b: pts[n.j] });
      }
    }
    return res;
  }, [placements]);

  // 自動コメント吹き出し（来場者向けの賑わい演出・ユーザー操作なし）
  const [comments, setComments] = useState<Array<{ roomId: string; body: string; authorName: string }>>([]);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/interop/sample-comments")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setComments(Array.isArray(d.comments) ? d.comments : []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  const [popups, setPopups] = useState<Array<{ id: string; body: string; author: string; pos: [number, number]; xExtra: number }>>([]);
  useEffect(() => {
    if (isMobile || comments.length === 0) return;
    const tick = () => {
      const c = comments[Math.floor(Math.random() * comments.length)];
      const idx = topics.findIndex((t) => t.roomId === c.roomId);
      const pos = idx >= 0 ? placements[idx]?.pos : undefined;
      if (!pos) return;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setPopups((prev) => {
        // 近い位置に既存の吹き出しがあれば x方向にずらして被りを回避
        const nearby = prev.filter(
          (p) => Math.abs(p.pos[0] - pos[0]) < 22 && Math.abs(p.pos[1] - pos[1]) < 22
        );
        const xExtra = nearby.length > 0 ? (pos[0] > 50 ? -185 : 185) : 0;
        return [...prev.slice(-1), { id, body: c.body, author: c.authorName, pos, xExtra }];
      });
      window.setTimeout(() => setPopups((prev) => prev.filter((p) => p.id !== id)), 5200);
    };
    const interval = window.setInterval(tick, 3200);
    return () => window.clearInterval(interval);
  }, [comments, isMobile, topics, placements]);

  // モバイルは専用UI（縦スクロールの分類セクション）
  if (isMobile) {
    return (
      <MobileBubbleMap
        interopCat={interopCat}
        activityByRoom={activityByRoom}
        ranking={ranking}
        onSelectCategory={onSelectCategory}
        onSelectTopic={onSelectTopic}
        iconFor={iconFor}
      />
    );
  }

  const bubbleSize = BUBBLE_SIZE_DESKTOP;
  const centerSize = CENTER_SIZE_DESKTOP;

  return (
    <div className="absolute inset-0 overflow-hidden">
      <style>{PUYO_CSS}{INTEROP_PUYO_CSS}</style>

      {/* 2軸の線とラベル（現場↔制度 × 人間↔技術） */}
      <div
        className="pointer-events-none absolute"
        style={{
          left: `${AXIS_CX}%`, top: "9%", bottom: "13%", width: 1,
          transform: "translateX(-50%)",
          background: "linear-gradient(rgba(255,255,255,0.02), rgba(255,255,255,0.15) 30%, rgba(255,255,255,0.15) 70%, rgba(255,255,255,0.02))",
        }}
      />
      <div
        className="pointer-events-none absolute"
        style={{
          top: `${AXIS_CY}%`, left: "6%", right: "6%", height: 1,
          transform: "translateY(-50%)",
          background: "linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.15) 30%, rgba(255,255,255,0.15) 70%, rgba(255,255,255,0.02))",
        }}
      />
      <span className="pointer-events-none absolute z-[5] -translate-x-1/2 whitespace-nowrap text-[11px] font-bold tracking-wide text-white/55" style={{ left: `${AXIS_CX}%`, top: "5.5%" }}>↑ {axisConfig.yTop}</span>
      <span className="pointer-events-none absolute z-[5] -translate-x-1/2 whitespace-nowrap text-[11px] font-bold tracking-wide text-white/55" style={{ left: `${AXIS_CX}%`, bottom: "8.5%" }}>{axisConfig.yBottom} ↓</span>
      <span className="pointer-events-none absolute z-[5] -translate-y-1/2 whitespace-nowrap text-[11px] font-bold tracking-wide text-white/55" style={{ top: `${AXIS_CY}%`, left: "1.5%" }}>← {axisConfig.xLeft}</span>
      <span className="pointer-events-none absolute z-[5] -translate-y-1/2 whitespace-nowrap text-[11px] font-bold tracking-wide text-white/55" style={{ top: `${AXIS_CY}%`, right: "1.5%" }}>{axisConfig.xRight} →</span>

      {/* 関連カテゴリのノード接続線 */}
      <svg className="pointer-events-none absolute inset-0 z-[4] h-full w-full">
        {connections.map((c, i) => (
          <line
            key={i}
            x1={`${c.a[0]}%`}
            y1={`${c.a[1]}%`}
            x2={`${c.b[0]}%`}
            y2={`${c.b[1]}%`}
            stroke="rgba(180,200,255,0.12)"
            strokeWidth={1}
          />
        ))}
      </svg>

      {topics.map((topic, i) => {
        const place = placements[i] ?? { pos: [50, 50] as [number, number], dir: [0, 1] as [number, number] };
        const stats = activityByRoom.get(topic.roomId) ?? { postCount: 0, participantCount: 0 };
        const isHot = stats.postCount > 0 && stats.postCount > ranking.avg;
        const isBig = ranking.big.has(topic.roomId);
        return (
          <PuyoBubble
            key={topic.no}
            topic={topic}
            stats={stats}
            isHot={isHot}
            isBig={isBig}
            pos={place.pos}
            dir={place.dir}
            index={i}
            bubbleSize={bubbleSize}
            onActivate={() => onSelectTopic(topic)}
          />
        );
      })}

      {/* 自動コメント吹き出し（ふわっと出て消える） */}
      {popups.map((p) => (
        <div
          key={p.id}
          className="pointer-events-none absolute z-[45] w-[170px]"
          style={{
            left: `calc(${p.pos[0]}% + ${p.xExtra}px)`,
            top: `calc(${p.pos[1]}% - ${bubbleSize / 2 + 12}px)`,
            transform: "translate(-50%, 0)",
            animation: "commentPop 5.2s ease-in-out forwards",
          }}
        >
          <div
            className="rounded-2xl rounded-bl-sm px-3 py-2 text-left shadow-lg"
            style={{
              background: "rgba(10,14,34,0.92)",
              border: "1px solid rgba(255,255,255,0.16)",
              backdropFilter: "blur(8px)",
            }}
          >
            <p className="text-[10px] font-bold text-indigo-200">{p.author}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-white/90 line-clamp-3">{p.body}</p>
          </div>
        </div>
      ))}

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
