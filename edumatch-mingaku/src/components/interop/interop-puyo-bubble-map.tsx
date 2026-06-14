"use client";

import type { LucideIcon } from "lucide-react";
import { Bot, BookMarked, BookOpen, GraduationCap, Minus, Network, Plus, RotateCcw, Shield, Sparkles, Users } from "lucide-react";
import {
  INTEROP_PRIORITY_TOPICS,
  sortTopicsForBurst,
  type InteropPriorityTopic,
} from "@/lib/interop-priority-topics";
import type { InteropCategory } from "@/components/interop/interop-category-bubble-map";
import { ForumHotFlame } from "@/components/community/forum-hot-flame";
import { isInteropRecentPost, type InteropActivityStats } from "@/lib/interop-activity";
import { interopBoardPath } from "@/lib/interop-paths";
import { computePuyoIntensity, INTEROP_PUYO_CSS, puyoAnimationStyle } from "@/lib/interop-puyopuyo";
import {
  DEFAULT_AXIS_CONFIG,
  DEFAULT_TOPIC_AXIS,
  type AxisConfig,
  type AxisPoint,
} from "@/lib/interop-topic-axis";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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
// RX/RY は初期配置の広がり。小さくすると全体が中心へ寄る（最小間隔は反発計算で保証されるので
// 玉どうしの間隔は変わらず、クラスタだけ中央に集まる）。
const AXIS_CX = 50;
const AXIS_CY = 49;
const AXIS_RX = 33;
const AXIS_RY = 29;

// ── 中心ハブ＆3サテライトの固定座標（占有ゾーン＝玉はここに入らない）──
const CENTER_POS = { x: 50, y: 46 };
const SATELLITE_POS: Record<InteropSatellite["place"], { x: number; y: number }> = {
  topLeft: { x: 33, y: 28 },
  topRight: { x: 67, y: 28 },
  bottom: { x: 50, y: 66 },
};

/** 拡大時は中心から外側へアンカーを少しずらし、中心ハブ・隣接サテライトとの被りを抑える */
function adjustSatelliteAnchor(
  place: InteropSatellite["place"],
  orbPx: number,
  baseOrbPx: number,
): { x: number; y: number } {
  const base = SATELLITE_POS[place];
  const growth = Math.max(0, orbPx - baseOrbPx);
  const pushPct = Math.min(5.5, (growth / baseOrbPx) * 3.2);
  const cx = CENTER_POS.x;
  const cy = CENTER_POS.y;
  const dx = base.x - cx;
  const dy = base.y - cy;
  const len = Math.hypot(dx, dy) || 1;
  let x = base.x + (dx / len) * pushPct;
  let y = base.y + (dy / len) * pushPct;
  if (place === "topLeft" && growth > baseOrbPx * 0.15) x -= 1.2;
  if (place === "topRight" && growth > baseOrbPx * 0.15) x += 1.2;
  if (place === "bottom" && growth > baseOrbPx * 0.12) y += 1.8;
  return { x, y };
}

/** 吹き出し(幅約170px)が画面外/隣の玉に被らないよう、玉のx%に応じて水平オフセット(px)を返す。
 *  画面端の玉は中央寄りへ、中央付近の玉は真上/真下に出す。 */
function popupXExtra(xPct: number): number {
  if (xPct > 76) return -135;
  if (xPct > 62) return -85;
  if (xPct < 24) return 135;
  if (xPct < 38) return 85;
  return 0;
}

/** 玉どうしの反発用半径(px)。物理計算はピクセル空間で行う
 *  （x=幅%・y=高さ%を混在させるとアスペクト比で分布が崩れるため）。
 *
 *  ★重要: 半径は「玉本体＋わずかな余白」のみ。以前はラベル・バッジの固定px拡張まで含めて
 *  いたため、小さな玉でも中心間124px等の過大間隔を要求し、狭い画面では28玉が物理的に
 *  収まらず必ず重なっていた。ラベルの被りは assignLabelSides が空き方向へ逃がして吸収する。 */
function orbCollisionRadiusPx(diameterPx: number): number {
  // 小さい玉は従来どおり「本体＋わずかな余白(12)」のみ（28玉が画面に収まる前提を維持）。
  // 投稿増で大きく育った玉だけ、隣やラベルと被らないよう余白を比例して上乗せする
  // （70pxを超えた分の0.16倍。基準サイズの玉には影響しない）。
  return diameterPx / 2 + 12 + Math.max(0, diameterPx - 70) * 0.16;
}

function pxToPctRadius(px: number, containerW: number): number {
  return (Math.max(0, px) / containerW) * 100;
}

function detectSentimentColor(body: string): string {
  if (/課題|問題|困って|難し|大変|壁|不満|不安|できな|なんで|なぜ/.test(body)) return "#9bc4ff";
  if (/提言|すべき|べきで|提案|改善|必要|変えるべき|実現|目指す|したい|増やし|減らし/.test(body)) return "#7de8a0";
  if (/[?？]|どうすれ|どこが|でしょうか|ますか|どんな|どうすれ/.test(body)) return "#f0d888";
  if (/[!！]{2}|絶対|強く思|情熱|使命|変えたい|変えなければ/.test(body)) return "#d4b0ff";
  if (/素晴らし|いいと思|好き|最高|よかった|嬉しい|ありがとう|楽しみ/.test(body)) return "#c0f0d8";
  return "rgba(255,255,255,0.88)";
}

/**
 * topic ごとの軸座標(-1..1) を画面配置に変換する。
 *
 * 【設計の要点】
 * 物理計算はすべて **ピクセル空間** で行う。以前は「%」で計算していたが、x は幅基準%・
 * y は高さ基準% という別単位を反発の距離計算で同一視していたため、ブラウザ幅・アスペクト比
 * が変わると分布が大きく崩れていた。px に統一することで縦横の見た目の距離が一致し、比率が
 * 変わっても分布の形が安定する。
 *
 * さらに各玉を「軸が示すターゲット座標」へ引き戻す**アンカーばね**を毎反復かける。これにより
 * 重なりを解消しつつも、技術寄りは右・制度寄りは上…という軸の意味を保った分布になる
 * （以前は反発だけが強く、軸の意味が消えて団子状になっていた）。
 *
 * @param radiiPx  各玉の反発用半径(px)
 * @param mapW/mapH コンテナ実寸(px)
 * @param *Pct      クランプ範囲（%指定。内部で px へ変換）
 */
function computeAxisPlacements(
  topics: InteropPriorityTopic[],
  axisMap: Record<number, AxisPoint>,
  obstaclesPct: Obstacle[] = [],
  radiiPx: number[] = [],
  mapW = 1200,
  mapH = 600,
  yMinPct = 9,
  yMaxPct = 90,
  xMinPct = 5,
  xMaxPct = 95
): Placement[] {
  const W = Math.max(mapW, 320);
  const H = Math.max(mapH, 320);
  const rOf = (i: number) => radiiPx[i] ?? 26;
  const axisOf = (no: number) => axisMap[no] ?? DEFAULT_TOPIC_AXIS[no] ?? { x: 0, y: 0 };
  const GAP = 5; // 玉どうしの最小間隔(px)

  // 軸中心(px)。W/H は固定リファレンス寸法（呼び出し側が m.layoutW/H を渡す）なので、
  // ここで得られる %座標はコンテナサイズに依存しない＝凍結された安定配置になる。
  const cx = (AXIS_CX / 100) * W;
  const cy = (AXIS_CY / 100) * H;
  // 広がりは W/H に比例。target% = AXIS_CX + a.x*AXIS_RX（= 50 + 33·a.x）となり、
  // W に依らず一定の%に着地する（縦も同様）。
  const rx = (AXIS_RX / 100) * W;
  const ry = (AXIS_RY / 100) * H;

  // クランプ範囲(px)
  const xMin = (xMinPct / 100) * W;
  const xMax = (xMaxPct / 100) * W;
  const yMin = (yMinPct / 100) * H;
  const yMax = (yMaxPct / 100) * H;

  // 障害物(%; x=幅基準・y=高さ基準・r=幅基準) → px
  const obstacles = obstaclesPct.map((o) => ({
    x: (o.x / 100) * W,
    y: (o.y / 100) * H,
    r: (o.r / 100) * W,
  }));

  // 軸が示す目標座標(px)。ばねでここへ引き戻す＝分布が軸の意味を保つ。
  const target = topics.map((t) => {
    const a = axisOf(t.no);
    return { x: cx + a.x * rx, y: cy - a.y * ry };
  });
  const pts = target.map((t, i) => ({ x: t.x, y: t.y, idx: i, no: topics[i].no }));

  // 同一目標の玉は黄金角で初期分散（重なり初期値からの脱出を速める）
  const bucket = new Map<string, number>();
  for (let i = 0; i < pts.length; i++) {
    const key = `${Math.round(target[i].x)}:${Math.round(target[i].y)}`;
    const n = bucket.get(key) ?? 0;
    if (n > 0) {
      const ang = (n * 137.508 * Math.PI) / 180;
      const rad = (rOf(i) + GAP) * 0.85 * n;
      pts[i].x += Math.cos(ang) * rad;
      pts[i].y += Math.sin(ang) * rad;
    }
    bucket.set(key, n + 1);
  }

  const dist = (i: number, j: number) => Math.hypot(pts[j].x - pts[i].x, pts[j].y - pts[i].y);

  const separatePair = (i: number, j: number, strength = 1) => {
    const minD = rOf(i) + rOf(j) + GAP;
    let dx = pts[j].x - pts[i].x;
    let dy = pts[j].y - pts[i].y;
    let d = Math.hypot(dx, dy);
    if (d < 0.5) {
      const ang = (((pts[i].no + 1) * 97 + (pts[j].no + 1) * 53) % 360) * (Math.PI / 180);
      dx = Math.cos(ang);
      dy = Math.sin(ang);
      d = 1;
    }
    if (d >= minD) return;
    const push = ((minD - d) / 2) * strength;
    pts[i].x -= (dx / d) * push;
    pts[i].y -= (dy / d) * push;
    pts[j].x += (dx / d) * push;
    pts[j].y += (dy / d) * push;
  };

  const repelObstacles = (strength = 1) => {
    for (let i = 0; i < pts.length; i++) {
      for (const o of obstacles) {
        const clearance = o.r + rOf(i) + GAP;
        const dx = pts[i].x - o.x;
        const dy = pts[i].y - o.y;
        const d = Math.hypot(dx, dy) || 0.01;
        if (d < clearance) {
          const push = (clearance - d) * strength;
          pts[i].x += (dx / d) * push;
          pts[i].y += (dy / d) * push;
        }
      }
    }
  };

  // 軸ターゲットへ引き戻すばね（分布の軸らしさを保つ）
  const springToTarget = (k: number) => {
    for (let i = 0; i < pts.length; i++) {
      pts[i].x += (target[i].x - pts[i].x) * k;
      pts[i].y += (target[i].y - pts[i].y) * k;
    }
  };

  const keepInBounds = () => {
    for (let i = 0; i < pts.length; i++) {
      const ri = rOf(i);
      pts[i].x = Math.max(xMin + ri, Math.min(xMax - ri, pts[i].x));
      pts[i].y = Math.max(yMin + ri, Math.min(yMax - ri, pts[i].y));
    }
  };

  // フェーズ1: 軸配置＋分離を両立（ばねで軸の形を保ちつつ、重なりを押し返す）
  for (let k = 0; k < 260; k++) {
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) separatePair(i, j, 1.1);
    }
    repelObstacles(1.1);
    springToTarget(0.06);
    keepInBounds();
  }

  // フェーズ2: 重なりゼロを保証する純分離（★ばね無し）。ばねが残ると重なる目標へ
  // 引き戻し続けて残留重なりが消えないため、ここでは分離だけに専念する。
  // 軸の大局的な形はフェーズ1で既に決まっているので、ここでの移動は局所的で済む。
  for (let k = 0; k < 320; k++) {
    let overlapped = false;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        if (dist(i, j) < rOf(i) + rOf(j) + GAP - 0.5) {
          separatePair(i, j, 1.6);
          overlapped = true;
        }
      }
    }
    repelObstacles(1.4);
    keepInBounds();
    if (!overlapped) break;
  }

  // px → %（x=幅基準・y=高さ基準）。dir は中心からの放射方向（%差分でよい）。
  return pts.map((p) => {
    const xPct = (p.x / W) * 100;
    const yPct = (p.y / H) * 100;
    const dx = xPct - AXIS_CX;
    const dy = yPct - AXIS_CY;
    const len = Math.hypot(dx, dy) || 1;
    return {
      pos: [+xPct.toFixed(2), +yPct.toFixed(2)] as [number, number],
      dir: [dx / len, dy / len] as [number, number],
    };
  });
}


type LabelSide = "up" | "down" | "left" | "right";

/** 各玉のラベルを、近隣の玉・既に置いたラベル・画面端から最も離れた向きへ割り当てて被りを抑える。
 *  x/y は別尺度（%）なので yAspect で縦を画面比に合わせて距離評価する。 */
function assignLabelSides(
  pts: Array<[number, number]>,
  bodyR: number[],
  yMin: number,
  yMax: number,
  xMin: number,
  xMax: number,
  yAspect = 0.62,
): LabelSide[] {
  const n = pts.length;
  const sides: LabelSide[] = [];
  const placed: Array<[number, number]> = []; // 確定済みラベル中心（相互回避）
  for (let i = 0; i < n; i++) {
    const [x, y] = pts[i];
    const r = bodyR[i] ?? 6;
    const offV = r + 6;
    const offH = r + 9;
    const cands: Array<{ side: LabelSide; cx: number; cy: number }> = [
      { side: "down", cx: x, cy: y + offV },
      { side: "up", cx: x, cy: y - offV },
      { side: "right", cx: x + offH, cy: y },
      { side: "left", cx: x - offH, cy: y },
    ];
    // 上端付近は必ず「下」、下端付近は必ず「上」（ヘッダー/フッター・画面外回避）
    const forced: LabelSide | null = y < yMin + 9 ? "down" : y > yMax - 9 ? "up" : null;
    let best: LabelSide = "down";
    let bestScore = -Infinity;
    for (const c of cands) {
      if (forced && c.side !== forced) continue;
      let score = 0;
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const dx = c.cx - pts[j][0];
        const dy = (c.cy - pts[j][1]) * yAspect;
        const dist = Math.sqrt(dx * dx + dy * dy);
        // 相手の玉の「縁」までの距離。ラベル中心が他の玉の本体に重なる候補は強く排除する
        // （タイトルが玉に被る不具合の主因。中心間距離だけだと半径を無視して被っていた）。
        const edge = dist - (bodyR[j] ?? 6);
        if (edge < 2.5) score -= 500;
        else if (edge < 5) score -= 90;
        score -= 70 / (dx * dx + dy * dy + 1.5);
      }
      for (const p of placed) {
        const dx = c.cx - p[0];
        const dy = (c.cy - p[1]) * yAspect;
        score -= 55 / (dx * dx + dy * dy + 1.5);
      }
      if (c.cx < xMin + 5 || c.cx > xMax - 5) score -= 60; // 横ラベルが画面外
      if (c.cy < yMin || c.cy > yMax) score -= 60;
      if (c.side === "up") score -= 1.2; // 上はわずかに敬遠（上部の密集回避）
      if (score > bestScore) {
        bestScore = score;
        best = c.side;
      }
    }
    sides.push(best);
    const chosen = cands.find((c) => c.side === best)!;
    placed.push([chosen.cx, chosen.cy]);
  }
  return sides;
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
  0%,100% { transform: scale(1.00); }
  50%     { transform: scale(1.06); }
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

// ── 玉サイズ：全体平均(avg)を基準に、平均以下は base のまま／平均を超えた分だけ拡大 ──
// 「件数が少ないうちは現状サイズ・増えたら大きく」。平均を1件超えるごとに直径 +11%。
const BUBBLE_GROWTH_PER_POST = 0.11;
function bubbleSizeFor(postCount: number, base: number, max: number, avg = 0): number {
  const over = Math.max(0, postCount - avg);
  const factor = 1 + over * BUBBLE_GROWTH_PER_POST;
  return Math.min(max, Math.round(base * factor));
}

// サテライト（最新ニュース等）：投稿が増えるほど目立つよう、トピック玉より速く・大きく拡大
const SATELLITE_GROWTH_PER_POST = 0.09;
function satelliteSizeFor(postCount: number, base: number, max: number): number {
  const bucketed = Math.floor(Math.max(0, postCount) / 2) * 2;
  const factor = 1 + bucketed * SATELLITE_GROWTH_PER_POST;
  return Math.min(max, Math.round(base * factor));
}
// 端末別のレイアウト寸法（スマホは画面が狭いので全体を小さく＆間隔を広く取る）
type MapMetrics = {
  base: number;      // 玉デフォルト直径(px)
  max: number;       // 玉上限直径(px)
  refW: number;      // px半径→% 変換の基準幅（≒画面幅）
  labelMargin: number; // 反発時のラベル余白(%)
  centerSize: number;  // 中心ハブ直径(px)
  satOrb: number;      // サテライト初期直径(px)
  satOrbMax: number;   // サテライト上限直径(px)
  centerR: number;     // 中心ハブ占有半径(%)
  ys: number;          // y圧縮率（小さいほど縦に大きく散らす）
  yMin: number;        // 配置の上端クランプ(%)
  yMax: number;        // 配置の下端クランプ(%)。100超で画面より下へ展開→パンで探索
  xMin: number;        // 配置の左端クランプ(%)
  xMax: number;        // 配置の右端クランプ(%)
  panLimY: number;     // 縦パンの可動域(px)
  // ★レイアウト固定用リファレンス寸法(px)。配置計算は実際のコンテナ寸法ではなく
  //   常にこの寸法で行い、%座標を凍結する。実コンテナがこれ以上に大きい限り
  //   px間隔は広がるだけ＝重なりは増えず、リサイズで配置が動かない（分布が安定する）。
  //   想定される最小コンテナ相当に設定する。
  layoutW: number;
  layoutH: number;
};
// スマホは1画面に玉が多すぎてゴチャつくため、縦に大きく展開して画面あたりの玉数を減らし、
// 下へパンして探索できるようにする。
// ★layoutW/H は「配置を1回だけ解く仮想キャンバス寸法」。実描画はこの仮想キャンバスを
//   コンテナへ contain で一律スケールするので、ここで重なりゼロに収束する寸法・比率を選ぶ。
//   yMax は仮想キャンバス内(≤100%)に収め、全玉が画面内に入るようにする（パン不要）。
const METRICS_DESKTOP: MapMetrics = { base: 40, max: 132, refW: 1300, labelMargin: 2.2, centerSize: 132, satOrb: 84, satOrbMax: 200, centerR: 20, ys: 0.62, yMin: 14, yMax: 97, xMin: 6, xMax: 92, panLimY: 840, layoutW: 1100, layoutH: 780 };
const METRICS_MOBILE: MapMetrics  = { base: 30, max: 80,  refW: 400,  labelMargin: 0.8, centerSize: 72,  satOrb: 44, satOrbMax: 80,  centerR: 16, ys: 0.5, yMin: 16, yMax: 97, xMin: 5, xMax: 95, panLimY: 1700, layoutW: 560, layoutH: 820 };
// 短い埋め込み枠（トップページの 480px など）用。中心ハブ・玉を小さくし、ほぼ1画面に収める。
const METRICS_COMPACT: MapMetrics  = { base: 26, max: 72,  refW: 720,  labelMargin: 1.0, centerSize: 92,  satOrb: 50, satOrbMax: 104, centerR: 15, ys: 0.58, yMin: 13, yMax: 97, xMin: 5, xMax: 95, panLimY: 320, layoutW: 820, layoutH: 560 };


function PuyoBubble({
  topic,
  pos,
  side,
  index,
  size,
  stats,
  isHot,
  onActivate,
}: {
  topic: InteropPriorityTopic;
  pos: [number, number];
  /** ラベルを出す向き（assignLabelSides で被りを避けて決定） */
  side: LabelSide;
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
  const isRecent = isInteropRecentPost(stats);
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
  // ラベルは assignLabelSides が選んだ「最も空いている向き」に配置（隣の玉・ラベルとの被り回避）。
  // 「下」は件数バッジ(玉の真下)を避けるため少し離す。
  const below: React.CSSProperties = { top: "calc(100% + 18px)", left: "50%", transform: "translateX(-50%)" };
  const above: React.CSSProperties = { bottom: "calc(100% + 9px)", left: "50%", transform: "translateX(-50%)" };
  const leftPos: React.CSSProperties = { right: "calc(100% + 10px)", top: "50%", transform: "translateY(-50%)" };
  const rightPos: React.CSSProperties = { left: "calc(100% + 10px)", top: "50%", transform: "translateY(-50%)" };
  const labelPos: React.CSSProperties =
    side === "up" ? above : side === "down" ? below : side === "left" ? leftPos : rightPos;

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
            className="absolute left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full font-extrabold leading-none text-white"
            style={{
              bottom: -9,
              background: sty.glow,
              border: "1.5px solid rgba(255,255,255,0.9)",
              fontSize: size < 56 ? 9.5 : 11.5,
              padding: size < 56 ? "1.5px 6px" : "2px 8px",
              boxShadow: `0 2px 8px rgba(0,0,0,0.5), 0 0 8px ${sty.glow}aa`,
            }}
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
          maxWidth: size < 56 ? 66 : 96,
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
  centerLabel,
  groupFilter,
  initialScale = 1,
  activityByRoom,
  axisConfig = DEFAULT_AXIS_CONFIG,
  topicPositions,
  topics: topicsProp,
  topicEdges,
  satellites = [],
  livePosts = [],
  livePostsReady = false,
  aiBarReserved = false,
  onSelectCategory,
  onSelectTopic,
  iconFor,
}: {
  interopCat: InteropCategory | undefined;
  /** 中心の玉に表示する文言（未指定なら interopCat.name → "インタロップ"）。長文は折返し表示。 */
  centerLabel?: string;
  /** 指定時、その major(A〜F)のトピックだけに絞り込む（ミニマップからのフォーカス遷移用）。 */
  groupFilter?: string;
  /** 初期ズーム倍率（ミニマップで拡大表示＆ドラッグ可動域を確保するため）。既定1。 */
  initialScale?: number;
  activityByRoom: Map<string, InteropActivityStats>;
  axisConfig?: AxisConfig;
  topicPositions?: Record<number, AxisPoint>;
  /** DB管理の話題玉（未指定/空ならハードコードのデフォルトを使用） */
  topics?: InteropPriorityTopic[];
  /** 内容ベースのノード接続（Gemma生成。未指定/空なら幾何的な近さで接続） */
  topicEdges?: Array<{ a: number; b: number }>;
  satellites?: InteropSatellite[];
  /** 右端の縦長AIバー(48px)が存在するか。false ならその余白・障害物を予約しない */
  aiBarReserved?: boolean;
  /** リアルタイム投稿（オレンジ枠の吹き出しで表示）。subId があればその投稿ページへ飛べる */
  livePosts?: Array<{ id: string; body: string; authorName: string; subId?: string }>;
  /** 初回の recent-posts 取得完了後に true（既存投稿を新着扱いしないため） */
  livePostsReady?: boolean;
  onSelectCategory: (cat: InteropCategory) => void;
  onSelectTopic: (topic: InteropPriorityTopic) => void;
  iconFor: (slug: string) => LucideIcon;
}) {
  const router = useRouter();
  const topics = useMemo(() => {
    const base = topicsProp && topicsProp.length > 0 ? topicsProp : INTEROP_PRIORITY_TOPICS;
    const scoped = groupFilter ? base.filter((t) => t.major === groupFilter) : base;
    // 念のため：絞り込み結果が空なら全件にフォールバック（不正なgroup値対策）
    return sortTopicsForBurst(scoped.length > 0 ? scoped : base);
  }, [topicsProp, groupFilter]);
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

  // ── パン＆ズーム（ドラッグ移動・ホイール/ピンチ拡縮）──
  const MIN_SCALE = 0.55;
  const MAX_SCALE = 2.6;
  const [view, setView] = useState({ x: 0, y: 0, scale: initialScale });
  const [grabbing, setGrabbing] = useState(false);
  const dragRef = useRef({ active: false, lastX: 0, lastY: 0, moved: 0 });
  const wasDragRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<HTMLDivElement>(null);
  const [mapW, setMapW] = useState(1200);
  const [mapH, setMapH] = useState(600);
  // 実測した枠の高さで寸法セットを選ぶ。短い枠（トップの埋め込み等）はコンパクト寸法で
  // ほぼ1画面に収める。配置自体はメトリクスの固定リファレンス寸法で凍結されるため、
  // mapW/mapH はメトリクス選択とパン制限のためだけに使う（配置は再計算されない）。
  const compact = mapH <= 560;
  const m = compact ? METRICS_COMPACT : isMobile ? METRICS_MOBILE : METRICS_DESKTOP;
  const measure = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    setMapW(Math.max(el.clientWidth, 320));
    setMapH(Math.max(el.clientHeight, 320));
  }, []);
  useLayoutEffect(() => {
    measure();
  }, [measure]);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);
  // 複数ポインタ追跡（ピンチ用）
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{ dist: number; cx: number; cy: number } | null>(null);

  // 仮想キャンバス(m.layoutW×layoutH)をコンテナへ contain で収める基準スケール。
  // これに view.scale（ユーザーのピンチ/ホイール拡縮）を掛けたものが実表示倍率。
  // 一律スケールなので玉サイズも位置も同率で拡縮し、重なりは原理的に発生しない。
  const fitScale = Math.min(mapW / m.layoutW, mapH / m.layoutH);

  // パン可動域：拡大表示でコンテンツがコンテナをはみ出した分だけ動かせる（はみ出しが
  // 無いときはほぼ動かない＝中央固定）。
  const clampPan = (x: number, y: number, scale: number) => {
    const sw = m.layoutW * fitScale * scale;
    const sh = m.layoutH * fitScale * scale;
    const limX = Math.max(0, (sw - mapW) / 2 + 30);
    const limY = Math.max(0, (sh - mapH) / 2 + 30);
    return { x: Math.max(-limX, Math.min(limX, x)), y: Math.max(-limY, Math.min(limY, y)) };
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

  const resetView = () => setView({ x: 0, y: 0, scale: initialScale });

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
  // サテライト直径：投稿数に応じて拡大（2件刻みでバケット化しポーリング時のガタつきを抑制）
  const satelliteSizes = useMemo(
    () => satellites.map((s) => satelliteSizeFor(s.postCount ?? 0, m.satOrb, m.satOrbMax)),
    [satellites, m.satOrb, m.satOrbMax]
  );
  const satelliteAnchors = useMemo(
    () => satellites.map((s, i) => adjustSatelliteAnchor(s.place, satelliteSizes[i] ?? m.satOrb, m.satOrb)),
    [satellites, satelliteSizes, m.satOrb]
  );

  // 中心ハブ＋サテライト＋固定UI（凡例・ズーム・ガイドピル）を「占有ゾーン」として反発に渡す。
  // ★安定化のため、実コンテナ寸法ではなく固定リファレンス寸法(m.layoutW/H)で計算する。
  //   位置は%（x=幅基準・y=高さ基準）／半径は「幅に対する%」。コンテナサイズに依存しないので
  //   配置がリサイズで動かない。凡例等の固定UIは実測ではなく余裕を持った固定ゾーンで予約する
  //   （実コンテナが大きいほどUIは%的に小さくなるため、固定ゾーンは安全側の過大予約になる）。
  const obstacles = useMemo<Obstacle[]>(() => {
    const w = m.layoutW;
    const h = m.layoutH;
    const pxX = (px: number) => (px / w) * 100;
    const pxY = (px: number) => (px / h) * 100;
    const maxSat = satelliteSizes.length > 0 ? Math.max(...satelliteSizes) : m.satOrb;
    // 中心ハブ・サテライトの占有半径は「実体サイズ＋わずかな余白」のみ。過大予約すると
    // 中央にリングができて密集バンドの玉が入りきらず重なり残りが出るため控えめにする。
    const centerFootprint = pxToPctRadius(m.centerSize / 2 + 12, w);
    const centerBoost = pxToPctRadius(Math.max(0, maxSat - m.satOrb) * 0.3, w);
    const list: Obstacle[] = [{ x: CENTER_POS.x, y: CENTER_POS.y, r: Math.max(m.centerR, centerFootprint + centerBoost) }];
    satellites.forEach((s, i) => {
      const anchor = satelliteAnchors[i] ?? SATELLITE_POS[s.place];
      const orbPx = satelliteSizes[i] ?? m.satOrb;
      list.push({ x: anchor.x, y: anchor.y, r: pxToPctRadius(orbPx / 2 + 18, w) });
    });

    // ── 固定UI（凡例＝左下の横帯／ズーム＝右下）の反発ゾーン（固定ゾーンで近似）──
    const legendR = pxX(20);
    const legendY = pxY(h - 22);
    list.push({ x: pxX(50), y: legendY, r: legendR });
    list.push({ x: pxX(130), y: legendY, r: legendR });
    list.push({ x: pxX(210), y: legendY, r: legendR });
    // ズーム操作（右下）
    list.push({ x: 100 - pxX(30), y: pxY(h - 64), r: pxX(30) });

    // 上部中央のガイドピル（sm以上で表示）。上端中央に玉を寄せない。
    if (!isMobile) {
      list.push({ x: 50, y: pxY(70), r: pxX(110) });
    }
    return list;
  }, [satellites, satelliteSizes, satelliteAnchors, m.centerR, m.centerSize, m.satOrb, m.layoutW, m.layoutH, isMobile]);
  const sizes = useMemo(
    () => topics.map((t) => bubbleSizeFor(activityByRoom.get(t.roomId)?.postCount ?? 0, m.base, m.max, ranking.avg)),
    [topics, activityByRoom, m.base, m.max, ranking.avg]
  );
  const placeRadiiPx = useMemo(
    () => sizes.map((px) => orbCollisionRadiusPx(px)),
    [sizes]
  );
  // ★配置計算は固定リファレンス寸法(m.layoutW/H)で実施。実コンテナ mapW/mapH には依存しない
  //   ＝リサイズで再計算・再配置されず、分布が凍結されて安定する。
  const placements = useMemo(
    () => computeAxisPlacements(topics, topicPositions ?? DEFAULT_TOPIC_AXIS, obstacles, placeRadiiPx, m.layoutW, m.layoutH, m.yMin, m.yMax, m.xMin, m.xMax),
    [topics, topicPositions, obstacles, placeRadiiPx, m.layoutW, m.layoutH, m.yMin, m.yMax, m.xMin, m.xMax]
  );
  // 各玉のラベル向き（玉本体半径ぶん外側へ出し、近隣と被らない側を選ぶ）
  const bodyRadiiPct = useMemo(
    // 物理衝突半径(px/2+12)と揃える。ラベル逃がしの基準が小さい(+6)と、玉の縁ぎりぎりに
    // ラベルが置かれて被って見えるため、外縁をしっかり取る。
    () => sizes.map((px) => pxToPctRadius(px / 2 + 12, m.layoutW)),
    [sizes, m.layoutW]
  );
  const labelSides = useMemo(
    () => assignLabelSides(placements.map((p) => p.pos), bodyRadiiPct, m.yMin, m.yMax, m.xMin, m.xMax),
    [placements, bodyRadiiPct, m.yMin, m.yMax, m.xMin, m.xMax]
  );
  // ノード接続線。Gemma生成の「内容ベース」エッジ(topicEdges)があればそれを優先し、
  // 無ければ従来どおり「座標が近いトピック同士」を幾何的に結ぶ。
  const connections = useMemo(() => {
    const pts = placements.map((p) => p.pos);
    const res: Array<{ a: [number, number]; b: [number, number] }> = [];

    if (topicEdges && topicEdges.length > 0) {
      // topic.no → placement index
      const idxByNo = new Map<number, number>();
      topics.forEach((t, i) => idxByNo.set(t.no, i));
      const seen = new Set<string>();
      for (const e of topicEdges) {
        const i = idxByNo.get(e.a);
        const j = idxByNo.get(e.b);
        if (i == null || j == null || i === j) continue;
        const key = i < j ? `${i}:${j}` : `${j}:${i}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (pts[i] && pts[j]) res.push({ a: pts[i], b: pts[j] });
      }
      return res;
    }

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
  }, [placements, topicEdges, topics]);

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
  type MapPopup = {
    id: string;
    body: string;
    author: string;
    pos: [number, number];
    size: number;
    xExtra: number;
    dir: "above" | "below";
    sentimentColor: string;
    live?: boolean;
    href?: string;
  };
  const [popups, setPopups] = useState<MapPopup[]>([]);
  const liveQueueRef = useRef<Array<{ id: string; body: string; authorName: string; subId?: string }>>([]);
  const seenLiveIdsRef = useRef<Set<string>>(new Set());
  const liveBaselineReadyRef = useRef(false);
  const tickRef = useRef<(() => void) | null>(null);

  // 新着投稿をキューへ（ポーリングのたびに effect を張り直さない）
  useEffect(() => {
    if (!livePostsReady) return;
    if (!liveBaselineReadyRef.current) {
      for (const p of livePosts) seenLiveIdsRef.current.add(p.id);
      liveBaselineReadyRef.current = true;
      return;
    }
    const fresh = livePosts.filter((p) => !seenLiveIdsRef.current.has(p.id));
    if (fresh.length === 0) return;
    for (const p of fresh) seenLiveIdsRef.current.add(p.id);
    liveQueueRef.current.push(...fresh);
    tickRef.current?.();
  }, [livePosts, livePostsReady]);

  // 吹き出しは常に1件のみ。LIVE新着を優先し、無いときだけ井戸端サンプルコメントを表示。
  useEffect(() => {
    if (!livePostsReady) return;

    const showLive = (c: { id: string; body: string; authorName: string; subId?: string }) => {
      const ridx = Math.floor(Math.random() * Math.max(1, placements.length));
      const place = placements[ridx];
      const pos: [number, number] = place?.pos ?? [50, 40];
      const size = sizes[ridx] ?? m.base;
      const id = `live-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const dir: "above" | "below" = pos[1] < 32 ? "below" : "above";
      const xExtra = popupXExtra(pos[0]);
      const href = c.subId ? interopBoardPath(c.subId, { postId: c.id }) : undefined;
      setPopups([{ id, body: c.body, author: c.authorName, pos, size, xExtra, dir, sentimentColor: "#ffd9a8", live: true, href }]);
      window.setTimeout(() => setPopups((prev) => prev.filter((p) => p.id !== id)), 6000);
    };

    const showSample = () => {
      if (comments.length === 0) return;
      const c = comments[Math.floor(Math.random() * comments.length)];
      const idx = topics.findIndex((t) => t.roomId === c.roomId);
      const pos = idx >= 0 ? placements[idx]?.pos : undefined;
      if (!pos) return;
      const size = sizes[idx] ?? m.base;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const dir: "above" | "below" = pos[1] < 32 ? "below" : "above";
      const sentimentColor = detectSentimentColor(c.body);
      const xExtra = popupXExtra(pos[0]);
      const href = c.roomId ? `/forum/${c.roomId}?from=interop` : undefined;
      setPopups([{ id, body: c.body, author: c.authorName, pos, size, xExtra, dir, sentimentColor, href }]);
      window.setTimeout(() => setPopups((prev) => prev.filter((p) => p.id !== id)), 5200);
    };

    const tick = () => {
      const queued = liveQueueRef.current.shift();
      if (queued) {
        showLive(queued);
        return;
      }
      showSample();
    };
    tickRef.current = tick;

    const interval = window.setInterval(tick, 6000);
    return () => {
      tickRef.current = null;
      window.clearInterval(interval);
    };
  }, [comments, topics, placements, sizes, livePostsReady, m.base]);

  const centerSize = m.centerSize;

  return (
    <div
      ref={containerRef}
      // 右端の縦長AIバー(48px)がある時だけ右を空け、玉・ラベルがバーに潜らないようにする
      className={`absolute inset-y-0 left-0 right-0 overflow-hidden select-none touch-none ${aiBarReserved ? "sm:right-12" : ""} ${grabbing ? "cursor-grabbing" : "cursor-grab"}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClickCapture={onClickCapture}
    >
      <style>{PUYO_CSS}{INTEROP_PUYO_CSS}</style>
      {/* 仮想キャンバスをコンテナ中央に置き、contain で一律スケールする外枠 */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {/* パン＆ズーム可能な仮想キャンバス（固定サイズ m.layoutW×layoutH）。
          配置はこの仮想座標で凍結され、fitScale で画面に合わせて一括拡縮されるので、
          ブラウザサイズが変わっても分布は不変・重なりゼロ。 */}
      <div
        className="pointer-events-auto relative shrink-0"
        style={{
          width: m.layoutW,
          height: m.layoutH,
          transform: `translate(${view.x}px, ${view.y}px) scale(${fitScale * view.scale})`,
          transformOrigin: "center center",
          transition: dragRef.current.active ? "none" : "transform 0.12s ease-out",
        }}
      >

      {/* 2軸の線とラベル（現場↔制度 × 人間↔技術）。スマホでも初期ビューの方位ガイドとして表示。 */}
      {(
        <>
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
        </>
      )}

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
            side={labelSides[i] ?? "down"}
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
            className="pointer-events-none absolute z-[46] w-[146px]"
            style={{
              left: `calc(${p.pos[0]}% + ${p.xExtra}px)`,
              // 玉本体（サイズ可変）＋件数バッジ＋ラベルを十分に避ける縦クリアランス
              top: isAbove
                ? `calc(${p.pos[1]}% - ${p.size / 2 + 26}px)`
                : `calc(${p.pos[1]}% + ${p.size / 2 + 26}px)`,
              animation: isAbove
                ? "commentPopCloudAbove 5.0s ease-in-out forwards"
                : "commentPopCloudBelow 5.0s ease-in-out forwards",
            }}
          >
            {/* 雲形吹き出し本体（live=実投稿はオレンジ枠）。href があればクリックでその投稿へ */}
            <div
              role={p.href ? "button" : undefined}
              onClick={p.href ? () => router.push(p.href as string) : undefined}
              className={`relative rounded-[18px] px-3 py-2.5 text-left ${p.href ? "pointer-events-auto cursor-pointer transition-transform hover:scale-[1.04] active:scale-95" : ""}`}
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
              {p.href && (
                <p className={`mt-1 text-[9.5px] font-bold ${p.live ? "text-orange-200/80" : "text-indigo-200/70"}`}>投稿を見る →</p>
              )}
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
          className="group absolute left-1/2 top-[46%] z-20 -translate-x-1/2 -translate-y-1/2 focus:outline-none"
          style={{
            width: centerSize,
            height: centerSize,
            animation: `centerPulse 8s ease-in-out infinite`,
          }}
          aria-label={centerLabel ?? interopCat?.name ?? "インタロップ"}
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
            className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-full transition-transform duration-200 group-hover:scale-[1.06] group-active:scale-95"
            style={{
              // 透明感のあるガラス球。半透明レイヤーを重ねて虹色のグラデーションを表現する。
              // backdrop-filter は centerPulse のスケールで毎フレーム再ブラーになり最重量のため不使用、
              // 代わりにアルファ付きグラデーションで透明感を出す。
              background:
                "radial-gradient(circle at 34% 24%, rgba(255,255,255,0.90) 0%, rgba(216,234,255,0.55) 26%, rgba(170,198,255,0.40) 52%, rgba(152,156,255,0.36) 74%, rgba(128,134,248,0.48) 100%)",
              border: "1.5px solid rgba(214,228,255,0.62)",
              boxShadow:
                "0 0 40px rgba(130,170,255,0.45), 0 0 72px rgba(150,120,255,0.28), 0 8px 26px rgba(0,0,0,0.30), inset 0 2px 14px rgba(255,255,255,0.55), inset 0 -10px 24px rgba(110,130,255,0.32)",
            }}
          >
            {/* 虹色イリデッセンス層（conic）。screen 合成で光沢にきらめきを与える */}
            <span
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{
                background:
                  "conic-gradient(from 210deg at 50% 50%, rgba(120,220,255,0.42), rgba(168,150,255,0.40), rgba(255,170,225,0.32), rgba(150,210,255,0.40), rgba(120,220,255,0.42))",
                mixBlendMode: "screen",
                opacity: 0.6,
                filter: "blur(3px)",
              }}
            />
            {/* 下方の冷色グロー（球の奥行き・透明感を強調） */}
            <span
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{
                background: "radial-gradient(circle at 72% 80%, rgba(120,96,255,0.42) 0%, transparent 54%)",
                mixBlendMode: "screen",
              }}
            />
            <span
              className="pointer-events-none absolute rounded-full"
              style={{ top: "10%", left: "14%", width: "44%", height: "34%", background: "rgba(255,255,255,0.85)", filter: "blur(4px)" }}
            />
            <InteropIcon className="relative z-10 text-[#1a3a8a]" strokeWidth={1.9} style={{ width: Math.round(centerSize * 0.22), height: Math.round(centerSize * 0.22) }} />
            {(() => {
              const label = centerLabel ?? interopCat?.name ?? "インタロップ";
              const isLong = label.length > 6;
              return (
                <span
                  className="relative z-10 mt-0.5 px-1 text-center font-bold leading-[1.15] text-[#1a3a8a] [word-break:keep-all]"
                  style={{
                    // 長文は玉幅に収めて折返し・小フォント。短い名称は従来サイズ。
                    fontSize: isLong
                      ? Math.max(8, Math.round(centerSize * 0.092))
                      : Math.max(10, Math.round(centerSize * 0.13)),
                    maxWidth: isLong ? centerSize * 0.92 : undefined,
                    whiteSpace: isLong ? "normal" : "nowrap",
                  }}
                >
                  {label}
                </span>
              );
            })()}
          </span>
        </button>
      )}

      {/* 中心インタロップ直行の3カテゴリ玉（左上＝最新ニュース／右上＝登壇者への質問／真下＝ご意見BOX）。投稿ページへ直結 */}
      {satellites.map((s, si) => {
        const SIcon = s.icon;
        const sp = satelliteAnchors[si] ?? SATELLITE_POS[s.place];
        const placePos = { left: `${sp.x}%`, top: `${sp.y}%` };
        const ORB = satelliteSizes[si] ?? m.satOrb;
        const iconSize = Math.round(ORB * 0.38);
        const glowPad = Math.round(ORB * 0.52);
        const borderW = ORB >= 120 ? 3 : 2;
        return (
          <button
            key={s.key}
            type="button"
            onClick={s.onActivate}
            className="group absolute z-[24] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center focus:outline-none transition-[left,top] duration-500 ease-out"
            style={{ left: placePos.left, top: placePos.top }}
            aria-label={s.label}
          >
            {/* 脈動リング2本（特別な「直行ポータル」だと一目で分かる目印）。
                keyframe側で translate(-50%,-50%) するので基準点だけ orb 中心に置く */}
            <span
              className="pointer-events-none absolute transition-[width,height] duration-500 ease-out"
              style={{ left: "50%", top: ORB / 2, width: ORB, height: ORB,
                borderRadius: "9999px", border: `${borderW}px solid ${s.color}`,
                animation: `satRing 3.2s ease-out ${si * 0.5}s infinite` }}
            />
            <span
              className="pointer-events-none absolute transition-[width,height] duration-500 ease-out"
              style={{ left: "50%", top: ORB / 2, width: ORB, height: ORB,
                borderRadius: "9999px", border: `${borderW}px solid ${s.color}`,
                animation: `satRing 3.2s ease-out ${si * 0.5 + 1.6}s infinite` }}
            />
            {/* 常時グロー（強め）＋ホバーで増幅 */}
            <span
              className="pointer-events-none absolute rounded-full transition-[width,height,opacity] duration-500 ease-out group-hover:opacity-100"
              style={{ top: ORB / 2, left: "50%", width: ORB + glowPad, height: ORB + glowPad, transform: "translate(-50%,-50%)",
                background: `radial-gradient(circle, ${s.color}55 0%, ${s.color}1f 45%, transparent 70%)`, opacity: 0.85 }}
            />
            <span
              className="relative grid place-items-center rounded-full transition-[width,height,transform] duration-500 ease-out group-hover:scale-[1.08] group-active:scale-95"
              style={{
                width: ORB, height: ORB,
                // トピック玉（半透明ガラス）と差別化：ビビッドで濃い発光球にする
                background: `radial-gradient(circle at 36% 26%, #ffffff 0%, ${s.color} 46%, ${s.color} 100%)`,
                border: `${borderW}px solid #ffffff`,
                boxShadow: `0 0 ${Math.round(ORB * 0.36)}px ${s.color}aa, 0 0 ${Math.round(ORB * 0.14)}px ${s.color}, 0 8px 22px rgba(0,0,0,0.34), inset 0 2px 14px rgba(255,255,255,0.65)`,
                animation: `satFloat ${4.5 + si * 0.6}s ease-in-out ${si * 0.4}s infinite`,
              }}
            >
              <span className="pointer-events-none absolute rounded-full" style={{ top: "12%", left: "16%", width: "40%", height: "30%", background: "rgba(255,255,255,0.9)", filter: "blur(3px)" }} />
              <SIcon className="relative z-10" style={{ color: "#15224e", width: iconSize, height: iconSize }} strokeWidth={2.1} />
              {typeof s.postCount === "number" && s.postCount > 0 && (
                <span className="absolute -bottom-1.5 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 py-0.5 font-black text-white shadow" style={{ background: "#0b1330", border: `1px solid ${s.color}`, fontSize: ORB >= 120 ? 10 : 8 }}>
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

      </div>{/* /仮想キャンバス */}
      </div>{/* /centeringラッパー */}

      {/* ズーム＆リセット操作（右下・固定）。AIバーがある時だけ左へ寄せる */}
      <div ref={zoomRef} className={`absolute bottom-24 right-3 z-40 flex flex-col gap-1.5 md:bottom-6 ${aiBarReserved ? "md:right-16" : "md:right-6"}`}>
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
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* 凡例：常に横1行のスクロールバーに収める（折返しで縦に伸びて玉と重なるのを防ぐ）。
          高さが一定なので反発ゾーンの計測も安定する。 */}
      <div className={`pointer-events-none absolute bottom-3 left-3 z-30 md:bottom-5 md:left-5 ${aiBarReserved ? "right-16 md:right-20" : "right-14 md:right-16"}`}>
        <div ref={legendRef} className="pointer-events-auto inline-flex max-w-full flex-nowrap items-center gap-1.5 overflow-x-auto rounded-2xl border border-white/10 px-2.5 py-1.5 [scrollbar-width:none]"
          style={{ background: "rgba(6,9,24,0.72)" }}>
          {Object.entries(GROUP_STYLE).map(([major, sty]) => (
            <GroupChip key={major} label={sty.label} sty={sty} />
          ))}
        </div>
      </div>
    </div>
  );
}
