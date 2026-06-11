"use client";

import type { LucideIcon } from "lucide-react";
import { Bot, BookMarked, BookOpen, GraduationCap, Maximize2, Minus, Network, Plus, Shield, Sparkles, Users } from "lucide-react";
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
import { useEffect, useMemo, useRef, useState } from "react";

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
/** 反発計算で「玉を寄せ付けない」固定の占有円（中心ハブ・サテライト）。r は中心からの最小距離(%)。 */
type Obstacle = { x: number; y: number; r: number };

// 2軸座標(-1..1) → 画面%。中心(50,49)、横半幅RX/縦半幅RY。
const AXIS_CX = 50;
const AXIS_CY = 49;
const AXIS_RX = 40;
const AXIS_RY = 36;

// ── 中心ハブ＆3サテライトの固定座標（占有ゾーン＝玉はここに入らない）──
const CENTER_POS = { x: 50, y: 46 };
const SATELLITE_POS: Record<InteropSatellite["place"], { x: number; y: number }> = {
  topLeft: { x: 33, y: 28 },
  topRight: { x: 67, y: 28 },
  bottom: { x: 50, y: 66 },
};

/** 吹き出し(幅約170px)が画面外/隣の玉に被らないよう、玉のx%に応じて水平オフセット(px)を返す。
 *  画面端の玉は中央寄りへ、中央付近の玉は真上/真下に出す。 */
function popupXExtra(xPct: number): number {
  if (xPct > 76) return -135;
  if (xPct > 62) return -85;
  if (xPct < 24) return 135;
  if (xPct < 38) return 85;
  return 0;
}

/** topic ごとの軸座標を画面配置に変換。近接玉は反発で分散（被り回避）。 */
function detectSentimentColor(body: string): string {
  if (/課題|問題|困って|難し|大変|壁|不満|不安|できな|なんで|なぜ/.test(body)) return "#9bc4ff";
  if (/提言|すべき|べきで|提案|改善|必要|変えるべき|実現|目指す|したい|増やし|減らし/.test(body)) return "#7de8a0";
  if (/[?？]|どうすれ|どこが|でしょうか|ますか|どんな|どうすれ/.test(body)) return "#f0d888";
  if (/[!！]{2}|絶対|強く思|情熱|使命|変えたい|変えなければ/.test(body)) return "#d4b0ff";
  if (/素晴らし|いいと思|好き|最高|よかった|嬉しい|ありがとう|楽しみ/.test(body)) return "#c0f0d8";
  return "rgba(255,255,255,0.88)";
}

function computeAxisPlacements(
  topics: InteropPriorityTopic[],
  axisMap: Record<number, AxisPoint>,
  obstacles: Obstacle[] = [],
  /** 各玉の「占有半径(%)」。サイズ可変なので玉ごとに必要な空きが違う。 */
  radii: number[] = [],
  /** y方向の等方圧縮率。縦長画面(スマホ)では大きくして縦に広く散らす。 */
  ys = 0.6
): Placement[] {
  const rOf = (i: number) => radii[i] ?? 6;
  const pts = topics.map((t, i) => {
    const a = axisMap[t.no] ?? { x: 0, y: 0 };
    // 決定論的微小ジッター（全く同じ初期座標の重なり解消、Math.random非依存）
    const jx = ((i * 1234567 + t.no * 7654321) % 200 - 100) * 0.004;
    const jy = ((i * 7654321 + t.no * 1234567) % 200 - 100) * 0.004;
    return { x: AXIS_CX + a.x * AXIS_RX + jx, y: AXIS_CY - a.y * AXIS_RY + jy };
  });
  // 反発で被り回避（y方向は%が大きいので圧縮して等方近似）。
  // 必要間隔は2玉の占有半径の和（大きい玉ほど広く確保）。
  for (let k = 0; k < 220; k++) {
    // 玉どうしの反発
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const minDist = rOf(i) + rOf(j);
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
    // 中心ハブ・サテライトの占有ゾーンから玉を押し出す（玉サイズ分も上乗せ）
    for (let i = 0; i < pts.length; i++) {
      for (const o of obstacles) {
        const clearance = o.r + rOf(i) * 0.6;
        const dx = pts[i].x - o.x;
        const dy = (pts[i].y - o.y) * ys;
        const d = Math.hypot(dx, dy) || 0.01;
        if (d < clearance) {
          const push = clearance - d;
          pts[i].x += (dx / d) * push;
          pts[i].y += ((dy / d) * push) / ys;
        }
      }
    }
  }
  return pts.map((p) => {
    const x = Math.max(5, Math.min(95, p.x));
    const y = Math.max(9, Math.min(90, p.y));
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
@keyframes commentPopCloudAbove {
  0%   { opacity: 0; transform: translate(-50%, calc(-100% + 4px)) scale(0.90); }
  14%  { opacity: 1; transform: translate(-50%, calc(-100% - 6px)) scale(1.00); }
  80%  { opacity: 1; transform: translate(-50%, calc(-100% - 12px)) scale(1.00); }
  100% { opacity: 0; transform: translate(-50%, calc(-100% - 20px)) scale(0.98); }
}
@keyframes commentPopCloudBelow {
  0%   { opacity: 0; transform: translate(-50%, -4px) scale(0.90); }
  14%  { opacity: 1; transform: translate(-50%, 10px) scale(1.00); }
  80%  { opacity: 1; transform: translate(-50%, 16px) scale(1.00); }
  100% { opacity: 0; transform: translate(-50%, 26px) scale(0.98); }
}
@keyframes satRing {
  0%   { transform: translate(-50%,-50%) scale(0.92); opacity: 0.6; }
  70%  { opacity: 0; }
  100% { transform: translate(-50%,-50%) scale(1.75); opacity: 0; }
}
@keyframes satFloat {
  0%,100% { transform: translateY(0); }
  50%     { transform: translateY(-5px); }
}
`;

// ── 玉サイズ：投稿数に応じて連続的に拡大（デフォルト小さめ／上限あり）──
// 直径 +6%/件 ≒ +18%/3件（「3件ごとにちょっと大きく」）。
const BUBBLE_GROWTH_PER_POST = 0.06;
function bubbleSizeFor(postCount: number, base: number, max: number): number {
  const factor = 1 + Math.max(0, postCount) * BUBBLE_GROWTH_PER_POST;
  return Math.min(max, Math.round(base * factor));
}
// 端末別のレイアウト寸法（スマホは画面が狭いので全体を小さく＆間隔を広く取る）
type MapMetrics = {
  base: number;      // 玉デフォルト直径(px)
  max: number;       // 玉上限直径(px)
  refW: number;      // px半径→% 変換の基準幅（≒画面幅）
  labelMargin: number; // 反発時のラベル余白(%)
  centerSize: number;  // 中心ハブ直径(px)
  satOrb: number;      // サテライト直径(px)
  centerR: number;     // 中心ハブ占有半径(%)
  satR: number;        // サテライト占有半径(%)
  ys: number;          // y圧縮率（縦長画面ほど大きく＝縦に散らす）
};
const METRICS_DESKTOP: MapMetrics = { base: 40, max: 150, refW: 1300, labelMargin: 4.2, centerSize: 132, satOrb: 84, centerR: 18, satR: 13, ys: 0.6 };
const METRICS_MOBILE: MapMetrics  = { base: 28, max: 74,  refW: 430,  labelMargin: 4.8, centerSize: 92,  satOrb: 58, centerR: 18, satR: 14, ys: 0.9 };


function PuyoBubble({
  topic,
  pos,
  dir,
  index,
  size,
  stats,
  isHot,
  onActivate,
}: {
  topic: InteropPriorityTopic;
  pos: [number, number];
  dir: [number, number];
  index: number;
  /** 投稿数に応じて算出済みの直径(px) */
  size: number;
  stats: InteropActivityStats;
  /** 炎・盛り上がり配色（全体平均より投稿が多い） */
  isHot: boolean;
  onActivate: () => void;
}) {
  const hot = isHot;
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
        // 投稿増加でサイズ・位置が変わる際になめらかに（ガタつき防止）
        transition: "width 0.5s ease-out, height 0.5s ease-out, left 0.7s ease-out, top 0.7s ease-out",
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
          // 暗い星空の上では半透明グラデ＋ハイライト＋縁で十分にガラス質感が出る。
          // backdrop-filter は28玉×無限アニメで毎フレーム再ブラーになり最重量のため不使用。
          background: sty.bg,
          border: `1.5px solid ${sty.border}`,
          boxShadow: `0 0 20px ${sty.glow}22, 0 4px 16px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.60), inset 0 0 18px ${sty.glow}1a`,
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
          // 不透明寄りのグラデ背景なので blur 無しでも視認性は十分（全玉ぶんの再ブラーを削減）
          background: `linear-gradient(135deg, rgba(8,11,32,0.92) 0%, ${sty.glow}3a 100%)`,
          border: `1px solid ${sty.border}`,
          borderRadius: 9,
          padding: "2.5px 8px",
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
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold text-white/90"
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


/** 中心インタロップ周りの直行カテゴリ玉（投稿ページへ直結） */
export type InteropSatellite = {
  key: string;
  label: string;
  /** 中心からの配置: 左上/右上/真下 */
  place: "topLeft" | "topRight" | "bottom";
  color: string;
  icon: LucideIcon;
  /** 直近投稿数（賑わい表示用） */
  postCount?: number;
  onActivate: () => void;
};

/** トップ：28ぷよぷよ玉 + 中心インタロップ（中心から放射状配置） */
export function InteropPuyoBubbleMap({
  interopCat,
  activityByRoom,
  axisConfig = DEFAULT_AXIS_CONFIG,
  topicPositions,
  satellites = [],
  livePosts = [],
  onSelectCategory,
  onSelectTopic,
  iconFor,
}: {
  interopCat: InteropCategory | undefined;
  activityByRoom: Map<string, InteropActivityStats>;
  axisConfig?: AxisConfig;
  topicPositions?: Record<number, AxisPoint>;
  satellites?: InteropSatellite[];
  /** リアルタイム投稿（オレンジ枠の吹き出しで表示） */
  livePosts?: Array<{ id: string; body: string; authorName: string }>;
  onSelectCategory: (cat: InteropCategory) => void;
  onSelectTopic: (topic: InteropPriorityTopic) => void;
  iconFor: (slug: string) => LucideIcon;
}) {
  const topics = useMemo(() => sortTopicsForBurst(INTEROP_PRIORITY_TOPICS), []);
  const InteropIcon = interopCat ? iconFor(interopCat.slug) : Network;
  const ranking = useMemo(() => computeBubbleRanking(topics, activityByRoom), [topics, activityByRoom]);

  // ── 端末判定（スマホは寸法を別系統に切替）──
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  const m = isMobile ? METRICS_MOBILE : METRICS_DESKTOP;

  // ── パン＆ズーム（ドラッグ移動・ホイール/ピンチ拡縮）──
  const MIN_SCALE = 0.55;
  const MAX_SCALE = 2.6;
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const [grabbing, setGrabbing] = useState(false);
  const dragRef = useRef({ active: false, lastX: 0, lastY: 0, moved: 0 });
  const wasDragRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // 複数ポインタ追跡（ピンチ用）
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{ dist: number; cx: number; cy: number } | null>(null);

  const clampPan = (x: number, y: number, scale: number) => {
    const lim = 560 * scale;
    const limY = 420 * scale;
    return { x: Math.max(-lim, Math.min(lim, x)), y: Math.max(-limY, Math.min(limY, y)) };
  };

  const zoomAt = (factor: number, originX: number, originY: number) => {
    setView((v) => {
      const rect = containerRef.current?.getBoundingClientRect();
      const ox = originX - (rect?.left ?? 0) - (rect?.width ?? 0) / 2;
      const oy = originY - (rect?.top ?? 0) - (rect?.height ?? 0) / 2;
      const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, v.scale * factor));
      const ratio = next / v.scale;
      // ポインタ位置を中心にズーム（その点が動かないように pan を補正）
      const nx = ox - (ox - v.x) * ratio;
      const ny = oy - (oy - v.y) * ratio;
      const c = clampPan(nx, ny, next);
      return { x: c.x, y: c.y, scale: next };
    });
  };

  const resetView = () => setView({ x: 0, y: 0, scale: 1 });

  // ホイールズーム（passive:false で preventDefault）＋タッチスクロール抑制
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      zoomAt(factor, e.clientX, e.clientY);
    };
    const prevent = (e: TouchEvent) => { if (dragRef.current.active || pointersRef.current.size >= 2) e.preventDefault(); };
    // コンテナ外でドラッグを離したときのフォールバック（capture 不使用のため）。
    // コンテナ内での解放は React の onPointerUp が処理するので二重処理しない。
    const endOutside = (ev: PointerEvent) => {
      if (el.contains(ev.target as Node)) return;
      if (dragRef.current.moved > 8) wasDragRef.current = true;
      dragRef.current.active = false;
      pointersRef.current.clear();
      pinchRef.current = null;
      setGrabbing(false);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchmove", prevent, { passive: false });
    window.addEventListener("pointerup", endOutside);
    window.addEventListener("pointercancel", endOutside);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchmove", prevent);
      window.removeEventListener("pointerup", endOutside);
      window.removeEventListener("pointercancel", endOutside);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    // ★setPointerCapture は使わない：コンテナがポインタを捕捉すると click が
    //   コンテナへリターゲットされ、子の玉ボタンの onClick が発火しない（＝押しても入れない）。
    //   pan は子要素からバブリングする pointermove で問題なく動く。
    if (pointersRef.current.size === 1) {
      dragRef.current = { active: true, lastX: e.clientX, lastY: e.clientY, moved: 0 };
      // 新しいジェスチャ開始ごとにドラッグ判定をリセット（前回のドラッグ後にクリックが
      // 発火せず flag が立ちっぱなしになって、次のタップが死ぬ不具合を防ぐ）
      wasDragRef.current = false;
      setGrabbing(true);
    } else if (pointersRef.current.size === 2) {
      // ピンチ開始
      dragRef.current.active = false;
      const pts = [...pointersRef.current.values()];
      pinchRef.current = {
        dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
        cx: (pts[0].x + pts[1].x) / 2,
        cy: (pts[0].y + pts[1].y) / 2,
      };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    // ピンチズーム（2本指）
    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const pts = [...pointersRef.current.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const cx = (pts[0].x + pts[1].x) / 2;
      const cy = (pts[0].y + pts[1].y) / 2;
      const factor = dist / (pinchRef.current.dist || dist);
      if (factor && Math.abs(factor - 1) > 0.005) {
        zoomAt(factor, cx, cy);
        pinchRef.current = { dist, cx, cy };
        wasDragRef.current = true;
      }
      return;
    }
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.lastX;
    const dy = e.clientY - dragRef.current.lastY;
    dragRef.current.moved += Math.hypot(dx, dy);
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;
    setView((v) => {
      const c = clampPan(v.x + dx, v.y + dy, v.scale);
      return { ...v, x: c.x, y: c.y };
    });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size === 0) {
      // このジェスチャで実際に動いた距離だけで判定（前回値を引きずらない）
      if (dragRef.current.moved > 8) wasDragRef.current = true;
      dragRef.current.active = false;
      setGrabbing(false);
    }
  };
  // ドラッグ/ピンチ後のクリックを抑制（バブルが意図せず開くのを防ぐ）。
  // どんな場合でも最後に flag を倒し、次のタップに持ち越さない。
  const onClickCapture = (e: React.MouseEvent) => {
    if (wasDragRef.current) e.stopPropagation();
    wasDragRef.current = false;
  };
  // 中心ハブ＋実在するサテライトを「占有ゾーン」として反発に渡す（玉が下に潜らない）
  const obstacles = useMemo<Obstacle[]>(() => {
    const list: Obstacle[] = [{ x: CENTER_POS.x, y: CENTER_POS.y, r: m.centerR }];
    for (const s of satellites) {
      const p = SATELLITE_POS[s.place];
      // 下サテラはラベルが下に伸びるぶん少し広めに確保
      list.push({ x: p.x, y: p.y, r: s.place === "bottom" ? m.satR + 1.5 : m.satR });
    }
    return list;
  }, [satellites, m.centerR, m.satR]);
  // 各玉の直径(px)＝投稿数で連続拡大。位置計算は3件刻みにバケット化して
  // ポーリング毎の細かな再配置（ガタつき）を抑える。
  const sizes = useMemo(
    () => topics.map((t) => bubbleSizeFor(activityByRoom.get(t.roomId)?.postCount ?? 0, m.base, m.max)),
    [topics, activityByRoom, m.base, m.max]
  );
  const placeRadii = useMemo(
    () =>
      topics.map((t) => {
        const bucketed = bubbleSizeFor(Math.floor((activityByRoom.get(t.roomId)?.postCount ?? 0) / 3) * 3, m.base, m.max);
        // px半径→%換算 ＋ ラベル/余白マージン
        return (bucketed / 2 / m.refW) * 100 + m.labelMargin;
      }),
    [topics, activityByRoom, m.base, m.max, m.refW, m.labelMargin]
  );
  const placements = useMemo(
    () => computeAxisPlacements(topics, topicPositions ?? DEFAULT_TOPIC_AXIS, obstacles, placeRadii, m.ys),
    [topics, topicPositions, obstacles, placeRadii, m.ys]
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
  const [popups, setPopups] = useState<Array<{ id: string; body: string; author: string; pos: [number, number]; size: number; xExtra: number; dir: "above" | "below"; sentimentColor: string; live?: boolean }>>([]);
  useEffect(() => {
    if (comments.length === 0) return;
    const tick = () => {
      const c = comments[Math.floor(Math.random() * comments.length)];
      const idx = topics.findIndex((t) => t.roomId === c.roomId);
      const pos = idx >= 0 ? placements[idx]?.pos : undefined;
      if (!pos) return;
      const size = sizes[idx] ?? m.base;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const dir: "above" | "below" = pos[1] < 32 ? "below" : "above";
      const sentimentColor = detectSentimentColor(c.body);
      const xExtra = popupXExtra(pos[0]);
      // 吹き出しは常に1件のみ（被り・ごちゃつき防止）。新しい1件で置き換える。
      setPopups([{ id, body: c.body, author: c.authorName, pos, size, xExtra, dir, sentimentColor }]);
      window.setTimeout(() => setPopups((prev) => prev.filter((p) => p.id !== id)), 5200);
    };
    const interval = window.setInterval(tick, 5200);
    return () => window.clearInterval(interval);
  }, [comments, topics, placements, sizes]);

  // リアルタイム投稿（実データ）：オレンジ枠の吹き出しでマップ全体に浮かべる
  const liveIdxRef = useRef(0);
  useEffect(() => {
    if (livePosts.length === 0) return;
    const tick = () => {
      const c = livePosts[liveIdxRef.current % livePosts.length];
      liveIdxRef.current += 1;
      // マップ上のランダムな玉位置に出す（実投稿は分類に紐づかないため拡散配置）
      const ridx = Math.floor(Math.random() * Math.max(1, placements.length));
      const place = placements[ridx];
      const pos: [number, number] = place?.pos ?? [50, 40];
      const size = sizes[ridx] ?? m.base;
      const id = `live-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const dir: "above" | "below" = pos[1] < 32 ? "below" : "above";
      const xExtra = popupXExtra(pos[0]);
      // LIVE吹き出しも常に1件のみ（置き換え）
      setPopups([{ id, body: c.body, author: c.authorName, pos, size, xExtra, dir, sentimentColor: "#ffd9a8", live: true }]);
      window.setTimeout(() => setPopups((prev) => prev.filter((p) => p.id !== id)), 6000);
    };
    const interval = window.setInterval(tick, 6500);
    return () => window.clearInterval(interval);
  }, [livePosts, placements, sizes]);

  const centerSize = m.centerSize;

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden select-none touch-none ${grabbing ? "cursor-grabbing" : "cursor-grab"}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClickCapture={onClickCapture}
    >
      <style>{PUYO_CSS}{INTEROP_PUYO_CSS}</style>
      {/* パン＆ズーム可能なキャンバス */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
          transformOrigin: "center center",
          transition: dragRef.current.active ? "none" : "transform 0.12s ease-out",
        }}
      >

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
        return (
          <PuyoBubble
            key={topic.no}
            topic={topic}
            stats={stats}
            isHot={isHot}
            pos={place.pos}
            dir={place.dir}
            index={i}
            size={sizes[i] ?? m.base}
            onActivate={() => onSelectTopic(topic)}
          />
        );
      })}

      {/* 自動コメント吹き出し（玉の上or下に浮かぶ雲形バブル） */}
      {popups.map((p) => {
        const isAbove = p.dir === "above";
        // テイルを元の玉位置へ向ける（吹き出し内に収まるようクランプ）
        const tailOffset = Math.max(-66, Math.min(66, -p.xExtra * 0.55));
        return (
          <div
            key={p.id}
            className="pointer-events-none absolute z-[46] w-[158px]"
            style={{
              left: `calc(${p.pos[0]}% + ${p.xExtra}px)`,
              // 玉本体（サイズ可変）＋件数バッジ＋ラベルを十分に避ける縦クリアランス
              top: isAbove
                ? `calc(${p.pos[1]}% - ${p.size / 2 + 18}px)`
                : `calc(${p.pos[1]}% + ${p.size / 2 + 18}px)`,
              animation: isAbove
                ? "commentPopCloudAbove 5.0s ease-in-out forwards"
                : "commentPopCloudBelow 5.0s ease-in-out forwards",
            }}
          >
            {/* 雲形吹き出し本体（live=実投稿はオレンジ枠） */}
            <div
              className="relative rounded-[18px] px-3 py-2.5 text-left"
              style={{
                background: p.live ? "rgba(46,30,13,0.82)" : "rgba(18,26,58,0.78)",
                border: p.live ? "1.5px solid rgba(255,168,72,0.85)" : "1px solid rgba(255,255,255,0.38)",
                backdropFilter: "blur(10px) saturate(1.2)",
                WebkitBackdropFilter: "blur(10px) saturate(1.2)",
                boxShadow: p.live
                  ? "0 4px 22px rgba(0,0,0,0.30), 0 0 16px rgba(255,150,50,0.35), inset 0 1px 0 rgba(255,210,150,0.40)"
                  : "0 4px 22px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.48), inset 0 -1px 0 rgba(255,255,255,0.08)",
              }}
            >
              <div
                className="pointer-events-none absolute inset-x-3 top-0 h-px rounded-full"
                style={{ background: p.live ? "linear-gradient(90deg, transparent, rgba(255,190,120,0.7) 50%, transparent)" : "linear-gradient(90deg, transparent, rgba(255,255,255,0.60) 40%, rgba(255,255,255,0.70) 60%, transparent)" }}
              />
              {p.live && (
                <span className="mb-0.5 inline-flex items-center gap-1 rounded-full bg-orange-400/90 px-1.5 py-0.5 text-[8px] font-black leading-none text-orange-950">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-950 animate-pulse" /> LIVE投稿
                </span>
              )}
              <p className={`text-[10px] font-bold ${p.live ? "text-orange-100" : "text-indigo-100/90"}`}>{p.author}</p>
              <p className="mt-0.5 text-[11px] leading-snug line-clamp-3" style={{ color: p.sentimentColor }}>{p.body}</p>
            </div>
            {/* テイル: 上に浮いてる → 下向き (▼)、下に浮いてる → 上向き (▲) */}
            <div
              className="absolute"
              style={{
                left: `calc(50% + ${tailOffset}px)`,
                transform: "translateX(-50%)",
                ...(isAbove
                  ? { bottom: -7, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: `8px solid ${p.live ? "rgba(255,168,72,0.55)" : "rgba(215,228,255,0.28)"}` }
                  : { top: -7, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderBottom: `8px solid ${p.live ? "rgba(255,168,72,0.55)" : "rgba(215,228,255,0.28)"}` }),
              }}
            />
          </div>
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

      {/* 中心インタロップ直行の3カテゴリ玉（左上＝最新ニュース／右上＝登壇者への質問／真下＝ご意見BOX）。投稿ページへ直結 */}
      {satellites.map((s, si) => {
        const SIcon = s.icon;
        // 中心ハブを基準にした固定座標（反発の占有ゾーンと一致させて被りを防ぐ）
        const sp = SATELLITE_POS[s.place];
        const placePos = { left: `${sp.x}%`, top: `${sp.y}%` };
        const ORB = m.satOrb;
        return (
          <button
            key={s.key}
            type="button"
            onClick={s.onActivate}
            className="group absolute z-[24] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center focus:outline-none"
            style={{ left: placePos.left, top: placePos.top }}
            aria-label={s.label}
          >
            {/* 脈動リング2本（特別な「直行ポータル」だと一目で分かる目印）。
                keyframe側で translate(-50%,-50%) するので基準点だけ orb 中心に置く */}
            <span
              className="pointer-events-none absolute"
              style={{ left: "50%", top: ORB / 2, width: ORB, height: ORB,
                borderRadius: "9999px", border: `2px solid ${s.color}`,
                animation: `satRing 3.2s ease-out ${si * 0.5}s infinite` }}
            />
            <span
              className="pointer-events-none absolute"
              style={{ left: "50%", top: ORB / 2, width: ORB, height: ORB,
                borderRadius: "9999px", border: `2px solid ${s.color}`,
                animation: `satRing 3.2s ease-out ${si * 0.5 + 1.6}s infinite` }}
            />
            {/* 常時グロー（強め）＋ホバーで増幅 */}
            <span
              className="pointer-events-none absolute rounded-full transition-opacity duration-300 group-hover:opacity-100"
              style={{ top: ORB / 2, left: "50%", width: ORB + 44, height: ORB + 44, transform: "translate(-50%,-50%)",
                background: `radial-gradient(circle, ${s.color}55 0%, ${s.color}1f 45%, transparent 70%)`, opacity: 0.85 }}
            />
            <span
              className="relative grid place-items-center rounded-full transition-transform duration-200 group-hover:scale-[1.08] group-active:scale-95"
              style={{
                width: ORB, height: ORB,
                // トピック玉（半透明ガラス）と差別化：ビビッドで濃い発光球にする
                background: `radial-gradient(circle at 36% 26%, #ffffff 0%, ${s.color} 46%, ${s.color} 100%)`,
                border: `3px solid #ffffff`,
                boxShadow: `0 0 30px ${s.color}aa, 0 0 12px ${s.color}, 0 8px 22px rgba(0,0,0,0.34), inset 0 2px 14px rgba(255,255,255,0.65)`,
                animation: `satFloat ${4.5 + si * 0.6}s ease-in-out ${si * 0.4}s infinite`,
              }}
            >
              <span className="pointer-events-none absolute rounded-full" style={{ top: "12%", left: "16%", width: "40%", height: "30%", background: "rgba(255,255,255,0.9)", filter: "blur(3px)" }} />
              <SIcon className="relative z-10 h-8 w-8" style={{ color: "#15224e" }} strokeWidth={2.1} />
              {typeof s.postCount === "number" && s.postCount > 0 && (
                <span className="absolute -bottom-1.5 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[8px] font-black text-white shadow" style={{ background: "#0b1330", border: `1px solid ${s.color}` }}>
                  {s.postCount}件
                </span>
              )}
            </span>
            {/* ラベル：トピックの暗ラベルと差別化し、ビビッド地＋濃色文字の「タグ」に */}
            <span
              className="mt-3 inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1 text-center text-[12px] font-black leading-tight"
              style={{
                background: s.color,
                color: "#0b1330",
                boxShadow: `0 2px 14px ${s.color}66, 0 0 0 1.5px rgba(255,255,255,0.5) inset`,
              }}
            >
              <Sparkles className="h-3 w-3" strokeWidth={2.4} />
              {s.label}
            </span>
          </button>
        );
      })}

      </div>{/* /パン可能キャンバス */}

      {/* ズーム＆リセット操作（右下・固定） */}
      <div className="absolute bottom-24 right-3 z-40 flex flex-col gap-1.5 md:bottom-16">
        <button
          type="button"
          onClick={() => zoomAt(1.2, (containerRef.current?.getBoundingClientRect().left ?? 0) + (containerRef.current?.clientWidth ?? 0) / 2, (containerRef.current?.getBoundingClientRect().top ?? 0) + (containerRef.current?.clientHeight ?? 0) / 2)}
          className="grid h-9 w-9 place-items-center rounded-xl border border-white/15 bg-[#0a1024]/80 text-white/80 backdrop-blur transition hover:bg-white/15 hover:text-white"
          aria-label="拡大"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => zoomAt(1 / 1.2, (containerRef.current?.getBoundingClientRect().left ?? 0) + (containerRef.current?.clientWidth ?? 0) / 2, (containerRef.current?.getBoundingClientRect().top ?? 0) + (containerRef.current?.clientHeight ?? 0) / 2)}
          className="grid h-9 w-9 place-items-center rounded-xl border border-white/15 bg-[#0a1024]/80 text-white/80 backdrop-blur transition hover:bg-white/15 hover:text-white"
          aria-label="縮小"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={resetView}
          className={`grid h-9 w-9 place-items-center rounded-xl border backdrop-blur transition ${
            view.scale !== 1 || view.x !== 0 || view.y !== 0
              ? "border-indigo-300/50 bg-indigo-500/30 text-white hover:bg-indigo-500/45"
              : "border-white/15 bg-[#0a1024]/80 text-white/60 hover:bg-white/15 hover:text-white"
          }`}
          aria-label="表示をリセット"
          title="表示をリセット"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      {/* 凡例：1つのまとまったガラスバーに収めて下部のごちゃつきを解消。
          スマホ＝横スクロール1行／PC＝折返し */}
      <div className="pointer-events-none absolute bottom-3 left-3 right-16 z-30 md:bottom-5 md:left-5 md:right-20">
        <div className="pointer-events-auto inline-flex max-w-full flex-nowrap items-center gap-1.5 overflow-x-auto rounded-2xl border border-white/10 px-2.5 py-1.5 [scrollbar-width:none] md:pointer-events-none md:flex-wrap md:overflow-visible"
          style={{ background: "rgba(6,9,24,0.72)" }}>
          {Object.entries(GROUP_STYLE).map(([major, sty]) => (
            <GroupChip key={major} label={sty.label} sty={sty} />
          ))}
        </div>
      </div>
    </div>
  );
}
