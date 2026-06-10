import type { CSSProperties } from "react";
import type { ForumActivityStats } from "@/lib/forum-hot";

/** 盛り上がり 0〜1（ぷよぷよの振幅・速度に使用） */
export function computePuyoIntensity(stats: ForumActivityStats): number {
  const activity = stats.postCount + (stats.participantCount ?? 0) * 0.55;
  return Math.min(1, Math.sqrt(Math.max(0, activity)) / 4.5);
}

/** ぷよぷよ CSS 変数（--puyo-min / --puyo-max） */
export function puyoScaleVars(intensity: number, hot = false): Record<string, string> {
  const boost = hot ? 0.06 : 0;
  const min = 0.88 - intensity * 0.06;
  const max = 1.06 + intensity * 0.14 + boost;
  return {
    "--puyo-min": String(min.toFixed(3)),
    "--puyo-max": String(max.toFixed(3)),
  };
}

export function puyoAnimationStyle(seed: number, intensity: number, hot = false): CSSProperties {
  const duration = Math.max(2.1, 3.6 - intensity * 1.3 - (hot ? 0.4 : 0));
  const delay = (seed % 11) * 0.31;
  return {
    animation: `interopPuyopuyo ${duration}s cubic-bezier(0.34, 1.45, 0.64, 1) ${delay}s infinite`,
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

/** サブカテゴリ軌道：件数に応じたコンテナサイズ（vmin） */
export function getOrbitContainerSize(count: number): string {
  const vmin = Math.min(94, 50 + Math.max(count, 1) * 10);
  return `min(${vmin}vmin, min(94vw, 880px))`;
}

/** サブカテゴリ軌道半径（コンテナ内 %） */
export function getOrbitRadiusPercent(count: number): number {
  return Math.min(49, 28 + Math.max(count, 1) * 5.2);
}

export const INTEROP_PUYO_CSS = `
  @keyframes interopPuyopuyo {
    0%, 100% {
      transform: scale(var(--puyo-min, 0.9)) scaleX(1) scaleY(1);
    }
    20% {
      transform: scale(calc(var(--puyo-max, 1.1) * 1.02)) scaleX(1.1) scaleY(0.9);
    }
    45% {
      transform: scale(calc(var(--puyo-min, 0.9) * 0.96)) scaleX(0.92) scaleY(1.08);
    }
    70% {
      transform: scale(var(--puyo-max, 1.1)) scaleX(0.96) scaleY(1.06);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .interop-puyo { animation: none !important; }
  }
`;
