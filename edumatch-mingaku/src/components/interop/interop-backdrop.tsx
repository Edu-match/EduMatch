"use client";

import { useEffect, useMemo, useState } from "react";
import type { InteropThemeMode } from "@/lib/interop-settings";

type Period = "dawn" | "day" | "dusk" | "night";

// ── シティスケープ（棒グラフ×ビル型） ──────────────────────

// [x%, w%, h%] — x・w はビューポート幅%、h はビル高さ(0-33の SVG単位)
const BUILDINGS = [
  [0, 4.2, 14], [4.5, 2.8, 22], [7.5, 4.5, 16], [12.2, 2.2, 28],
  [14.7, 3.8, 12], [19, 2.5, 20], [21.8, 3.2, 25], [25.2, 4, 15],
  [29.5, 2.8, 30], [32.6, 3.5, 20], [36.4, 4.8, 13], [41.5, 2.8, 24],
  [44.6, 2.3, 33], [47.2, 4.2, 17], [51.7, 3.2, 21], [55.2, 1.8, 28],
  [57.3, 4.2, 14], [61.8, 2.8, 20], [64.9, 4.5, 25], [69.7, 2.2, 17],
  [72.2, 3.5, 31], [76, 4, 13], [80.3, 2.5, 22], [83.1, 4.8, 16],
  [88.2, 2.8, 26], [91.3, 2.3, 18], [93.9, 2.8, 21], [97, 2.2, 23],
] as const;

type BuildPalette = { fill: string; stroke: string; window: string; glow: string };
const BUILD_PALETTES: Record<Period, BuildPalette> = {
  night: { fill: "rgba(20,35,90,0.28)", stroke: "rgba(120,160,255,0.38)", window: "rgba(255,240,160,0.65)", glow: "rgba(80,120,255,0.12)" },
  dawn:  { fill: "rgba(80,40,60,0.22)", stroke: "rgba(255,170,140,0.38)", window: "rgba(255,230,150,0.60)", glow: "rgba(200,100,80,0.10)" },
  day:   { fill: "rgba(40,80,150,0.14)", stroke: "rgba(180,220,255,0.30)", window: "rgba(255,255,255,0.55)", glow: "rgba(120,180,255,0.08)" },
  dusk:  { fill: "rgba(60,30,80,0.24)", stroke: "rgba(240,130,80,0.38)", window: "rgba(255,200,120,0.60)", glow: "rgba(180,80,60,0.12)" },
};

/** 現在時刻から時間帯を判定 */
function periodFromHour(h: number): Period {
  if (h >= 5 && h < 9) return "dawn";
  if (h >= 9 && h < 16) return "day";
  if (h >= 16 && h < 19) return "dusk";
  return "night";
}

type Palette = {
  /** 空のグラデーション（上→下） */
  sky: string;
  /** 地平線付近の発光バンド */
  horizon: string;
  /** 空気感のオーバーレイ（任意の追加層） */
  haze?: string;
  /** 星の濃さ（0で非表示） */
  star: number;
  /** ビネット */
  vignette: string;
};

const PALETTES: Record<Period, Palette> = {
  // 朝日：藍 → 紫 → 桃 → 金。低い位置から昇る暖かい太陽。
  dawn: {
    sky: "linear-gradient(180deg, #1b2350 0%, #3a2f63 38%, #7d4a72 62%, #c9737a 80%, #f0a878 92%, #f7c98b 100%)",
    horizon: "radial-gradient(120% 60% at 50% 100%, rgba(255,205,150,0.55) 0%, rgba(255,150,110,0.25) 35%, transparent 70%)",
    haze: "radial-gradient(80% 40% at 50% 88%, rgba(255,180,120,0.35) 0%, transparent 60%)",
    star: 0.35,
    vignette: "radial-gradient(ellipse 95% 95% at 50% 40%, transparent 58%, rgba(12,10,32,0.5) 100%)",
  },
  // 昼：澄んだ青空。高い位置の柔らかな太陽。
  day: {
    sky: "linear-gradient(180deg, #1f4ea0 0%, #2f6bc0 40%, #4f93d8 72%, #8fc1ea 100%)",
    horizon: "radial-gradient(120% 55% at 50% 100%, rgba(200,230,255,0.4) 0%, transparent 65%)",
    star: 0,
    vignette: "radial-gradient(ellipse 95% 95% at 50% 45%, transparent 62%, rgba(10,30,70,0.4) 100%)",
  },
  // 夕陽：群青 → 茜 → 橙 → 黄金。大きく沈む太陽。
  dusk: {
    sky: "linear-gradient(180deg, #1a1f4a 0%, #45285f 32%, #8a3a63 54%, #d65a4e 74%, #f0894a 88%, #f6b35f 100%)",
    horizon: "radial-gradient(130% 62% at 50% 100%, rgba(255,170,90,0.6) 0%, rgba(220,90,70,0.3) 38%, transparent 72%)",
    haze: "radial-gradient(90% 45% at 50% 90%, rgba(255,140,80,0.4) 0%, transparent 62%)",
    star: 0.4,
    vignette: "radial-gradient(ellipse 95% 95% at 50% 42%, transparent 56%, rgba(14,8,30,0.55) 100%)",
  },
  // 夜：深い紺。冴えた月と満天の星。
  night: {
    sky: "linear-gradient(180deg, #05060f 0%, #070b1e 45%, #0b1030 75%, #121641 100%)",
    horizon: "radial-gradient(120% 55% at 50% 100%, rgba(60,80,150,0.32) 0%, transparent 68%)",
    star: 0.85,
    vignette: "radial-gradient(ellipse 95% 95% at 50% 46%, transparent 60%, rgba(2,3,12,0.6) 100%)",
  },
};

const FX = `
  @keyframes itmTwinkle { 0%,100% { opacity: 0.15; } 50% { opacity: 1; } }
  @keyframes itmShoot {
    0% { transform: translate(0,0) rotate(18deg); opacity: 0; }
    8% { opacity: 1; }
    20% { transform: translate(-220px,120px) rotate(18deg); opacity: 0; }
    100% { transform: translate(-220px,120px) rotate(18deg); opacity: 0; }
  }
`;

/** 時間帯で配色が変わる、朝日/夕陽/月の美しい背景 */
export function InteropBackdrop({ themeMode = "auto" }: { themeMode?: InteropThemeMode }) {
  // SSRとクライアントの不一致を避けるため、マウント後に時刻判定する
  const [period, setPeriod] = useState<Period>(
    themeMode === "auto" ? "night" : (themeMode as Period)
  );
  useEffect(() => {
    if (themeMode !== "auto") {
      setPeriod(themeMode as Period);
      return;
    }
    const update = () => setPeriod(periodFromHour(new Date().getHours()));
    update();
    const t = setInterval(update, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [themeMode]);

  const pal = PALETTES[period];
  const bp = BUILD_PALETTES[period];
  const isNightLike = pal.star > 0;

  const stars = useMemo(
    () =>
      Array.from({ length: 80 }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 72, // 地平線より上に集中
        d: 0.7 + Math.random() * 1.8,
        delay: Math.random() * 6,
        dur: 3 + Math.random() * 4,
      })),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <style>{FX}</style>

      {/* 空（多段グラデーション） */}
      <div className="absolute inset-0 transition-[background] duration-1000" style={{ background: pal.sky }} />

      {/* 星（夜・朝・夕のみ） */}
      {isNightLike &&
        stars.map((s, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.d,
              height: s.d,
              opacity: pal.star,
              animation: `itmTwinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
              boxShadow: "0 0 4px rgba(255,255,255,0.8)",
            }}
          />
        ))}

      {/* 流れ星（夜のみ・控えめ） */}
      {period === "night" && (
        <span
          className="absolute h-px w-24"
          style={{
            left: "82%",
            top: "16%",
            background: "linear-gradient(90deg, rgba(255,255,255,0.9), transparent)",
            animation: "itmShoot 9s ease-in 3s infinite",
          }}
        />
      )}

      {/* 地平線の発光 */}
      <div className="absolute inset-0" style={{ background: pal.horizon }} />
      {pal.haze && <div className="absolute inset-0" style={{ background: pal.haze }} />}

      {/* ビル型棒グラフ・シティスケープ（リキッドグラス調） */}
      <svg
        className="pointer-events-none absolute inset-x-0 bottom-0 w-full"
        viewBox="0 0 100 33"
        preserveAspectRatio="none"
        style={{ height: "min(28vh, 260px)" }}
        aria-hidden
      >
        <defs>
          <linearGradient id="buildGradFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={bp.stroke} stopOpacity={0.55} />
            <stop offset="60%" stopColor={bp.fill} stopOpacity={0.7} />
            <stop offset="100%" stopColor={bp.fill} stopOpacity={0.9} />
          </linearGradient>
          <linearGradient id="buildGradShine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(255,255,255,0.20)" />
            <stop offset="40%" stopColor="rgba(255,255,255,0.06)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.00)" />
          </linearGradient>
          <filter id="buildBlur" x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur stdDeviation="0.25" />
          </filter>
        </defs>

        {/* グロー（ビルの根元に滲む光） */}
        {BUILDINGS.map(([bx, bw, bh], i) => (
          <rect
            key={`g${i}`}
            x={bx - 0.5} y={33 - bh * 0.4}
            width={bw + 1} height={bh * 0.4}
            fill={bp.glow}
            filter="url(#buildBlur)"
          />
        ))}

        {/* ビル本体 */}
        {BUILDINGS.map(([bx, bw, bh], i) => (
          <g key={`b${i}`}>
            <rect
              x={bx} y={33 - bh}
              width={bw} height={bh}
              fill="url(#buildGradFill)"
            />
            {/* 左面シャイン */}
            <rect
              x={bx} y={33 - bh}
              width={bw * 0.3} height={bh}
              fill="url(#buildGradShine)"
            />
            {/* 上端ハイライト */}
            <line
              x1={bx} y1={33 - bh}
              x2={bx + bw} y2={33 - bh}
              stroke={bp.stroke} strokeWidth="0.18"
            />
          </g>
        ))}

        {/* 窓（行列パターン） */}
        {BUILDINGS.map(([bx, bw, bh], bi) => {
          const cols = Math.max(1, Math.floor(bw / 1.4));
          const rows = Math.max(1, Math.floor(bh / 4.5));
          const wx = bw / (cols + 1);
          const wy = bh / (rows + 1);
          const wins = [];
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const lit = (bi * 7 + r * 3 + c * 5) % 9 !== 0;
              wins.push(
                <rect
                  key={`w${bi}-${r}-${c}`}
                  x={bx + wx * (c + 0.6)}
                  y={33 - bh + wy * (r + 0.6)}
                  width={0.35} height={0.55}
                  fill={bp.window}
                  opacity={lit ? 0.55 : 0.06}
                />
              );
            }
          }
          return wins;
        })}
      </svg>

      {/* ビネット */}
      <div className="absolute inset-0" style={{ background: pal.vignette }} />
    </div>
  );
}
