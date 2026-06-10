import type { CSSProperties } from "react";
import type { ForumActivityStats } from "@/lib/forum-hot";

/** 盛り上がり 0〜1（ぷよぷよの振幅・速度に使用） */
export function computePuyoIntensity(stats: ForumActivityStats): number {
  const activity = stats.postCount + (stats.participantCount ?? 0) * 0.55;
  return Math.min(1, Math.sqrt(Math.max(0, activity)) / 4.5);
}

/** ぷよぷよ CSS 変数（--puyo-min / --puyo-max） */
export function puyoScaleVars(intensity: number, hot = false): Record<string, string> {
  const boost = hot ? 0.025 : 0;
  const min = 0.965 - intensity * 0.025;
  const max = 1.025 + intensity * 0.045 + boost;
  return {
    "--puyo-min": String(min.toFixed(3)),
    "--puyo-max": String(max.toFixed(3)),
  };
}

export function puyoAnimationStyle(seed: number, intensity: number, hot = false): CSSProperties {
  const duration = Math.max(5.2, 8 - intensity * 1.8 - (hot ? 0.6 : 0));
  const delay = (seed % 13) * 0.52;
  return {
    animation: `interopPuyopuyo ${duration}s ease-in-out ${delay}s infinite`,
    ...puyoScaleVars(intensity, hot),
  };
}

/** 大カテゴリマップ：ノード数に応じてキャンバスを拡大 */
export function getFillGraphDimensions(nodeCount: number) {
  const countScale = 1 + Math.min(0.55, Math.max(0, nodeCount - 3) * 0.07);
  const aspectBoost = nodeCount <= 4 ? 1.25 : nodeCount <= 8 ? 1.15 : 1.08;
  return {
    width: Math.round(1000 * countScale * aspectBoost),
    height: Math.round(560 * countScale * aspectBoost),
    spreadFactor: 1.08 + Math.min(0.35, nodeCount * 0.045),
    radiusRatio: 0.36 + Math.min(0.14, nodeCount * 0.018),
  };
}

/** Interopトップ（中心＋内側カテゴリ＋外周トピック）向けキャンバス */
export function getInteropTopGraphDimensions(nodeCount: number) {
  const countScale = 1 + Math.min(0.95, Math.max(0, nodeCount - 8) * 0.028);
  return {
    width: Math.round(1180 * countScale),
    height: Math.round(720 * countScale),
    spreadFactor: 1.12,
    radiusRatio: 0.4,
  };
}

/** サブカテゴリ軌道：件数に応じたコンテナサイズ（vmin） */
export function getOrbitContainerSize(count: number): string {
  const vmin = Math.min(82, 58 + Math.max(count, 1) * 6);
  return `min(${vmin}vmin, min(88vw, 680px))`;
}

/** サブカテゴリ軌道半径（コンテナ内 %） */
export function getOrbitRadiusPercent(count: number): number {
  if (count <= 4) return 40;
  return Math.min(44, 32 + Math.max(count, 1) * 3.2);
}

export const INTEROP_PUYO_CSS = `
  @keyframes interopPuyopuyo {
    0%, 100% {
      transform: scale(var(--puyo-min, 0.97)) scaleX(1) scaleY(1);
    }
    50% {
      transform: scale(var(--puyo-max, 1.02)) scaleX(1.015) scaleY(0.985);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .interop-puyo { animation: none !important; }
  }
`;
