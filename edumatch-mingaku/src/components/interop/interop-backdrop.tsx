"use client";

import { useEffect, useMemo, useState } from "react";
import type { InteropThemeMode } from "@/lib/interop-settings";

type Period = "dawn" | "day" | "dusk" | "night";

// ── シティスケープ（24時間帯別リアルデータ棒グラフ×ビル型） ───────────

type BuildPalette = { fill: string; stroke: string; window: string; glow: string; accent: string };
const BUILD_PALETTES: Record<Period, BuildPalette> = {
  night: { fill: "rgba(20,35,90,0.28)", stroke: "rgba(120,160,255,0.40)", window: "rgba(255,240,160,0.70)", glow: "rgba(80,120,255,0.14)", accent: "rgba(140,190,255,0.55)" },
  dawn:  { fill: "rgba(80,40,60,0.22)", stroke: "rgba(255,170,140,0.40)", window: "rgba(255,230,150,0.65)", glow: "rgba(200,100,80,0.12)", accent: "rgba(255,190,150,0.55)" },
  day:   { fill: "rgba(40,80,150,0.14)", stroke: "rgba(180,220,255,0.32)", window: "rgba(255,255,255,0.60)", glow: "rgba(120,180,255,0.10)", accent: "rgba(180,220,255,0.50)" },
  dusk:  { fill: "rgba(60,30,80,0.24)", stroke: "rgba(240,130,80,0.40)", window: "rgba(255,200,120,0.65)", glow: "rgba(180,80,60,0.14)", accent: "rgba(240,150,90,0.55)" },
};

const BAR_W = 3.83;
const BAR_GAP = 0.35;
const MIN_H = 4;
const MAX_H = 31;

function CityscapeLayer({ period }: { period: Period }) {
  const [hourly, setHourly] = useState<number[] | null>(null);
  const currentHour = new Date().getHours();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/interop/hourly-activity")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && Array.isArray(d.hourly)) setHourly(d.hourly);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const bp = BUILD_PALETTES[period];

  // フォールバック: データ未到着時はデコラティブな固定高さ
  const fallback = useMemo(
    () => Array.from({ length: 24 }, (_, i) =>
      MIN_H + ((i * 1234567 + 3456789) % 1000) / 1000 * (MAX_H - MIN_H) * 0.6
    ),
    []
  );

  const data = hourly ?? fallback;
  const maxCount = Math.max(1, ...data);

  const bars = data.map((count, i) => {
    const h = MIN_H + (MAX_H - MIN_H) * (count / maxCount);
    const x = i * (BAR_W + BAR_GAP);
    const isCurrent = i === currentHour;
    return { x, h, count, isCurrent };
  });

  const hourLabels = [0, 6, 12, 18, 23];
  const midY = 33 - MAX_H * 0.55;

  return (
    <svg
      className="pointer-events-none absolute inset-x-0 bottom-0 w-full"
      viewBox="0 0 100 36"
      preserveAspectRatio="none"
      style={{ height: "min(28vh, 260px)" }}
      aria-hidden
    >
      <defs>
        <linearGradient id="bldFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={bp.stroke} stopOpacity={0.60} />
          <stop offset="55%" stopColor={bp.fill} stopOpacity={0.75} />
          <stop offset="100%" stopColor={bp.fill} stopOpacity={0.92} />
        </linearGradient>
        <linearGradient id="bldFillHot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={bp.accent} stopOpacity={0.85} />
          <stop offset="50%" stopColor={bp.stroke} stopOpacity={0.70} />
          <stop offset="100%" stopColor={bp.fill} stopOpacity={0.88} />
        </linearGradient>
        <linearGradient id="bldShine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
          <stop offset="45%" stopColor="rgba(255,255,255,0.06)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.00)" />
        </linearGradient>
        <filter id="bldGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.3" />
        </filter>
      </defs>

      {/* グロー層 */}
      {bars.map(({ x, h, isCurrent }, i) => (
        <rect
          key={`g${i}`}
          x={x - 0.4} y={33 - h * 0.5}
          width={BAR_W + 0.8} height={h * 0.5}
          fill={isCurrent ? bp.accent : bp.glow}
          filter="url(#bldGlow)"
          opacity={isCurrent ? 0.7 : 0.5}
        />
      ))}

      {/* ビル本体 */}
      {bars.map(({ x, h, isCurrent }, i) => (
        <g key={`b${i}`}>
          <rect
            x={x} y={33 - h}
            width={BAR_W} height={h}
            fill={isCurrent ? "url(#bldFillHot)" : "url(#bldFill)"}
          />
          {/* 左縁シャイン */}
          <rect
            x={x} y={33 - h}
            width={BAR_W * 0.28} height={h}
            fill="url(#bldShine)"
          />
          {/* 上端ハイライト */}
          <line
            x1={x} y1={33 - h}
            x2={x + BAR_W} y2={33 - h}
            stroke={isCurrent ? bp.accent : bp.stroke}
            strokeWidth={isCurrent ? 0.28 : 0.15}
          />
        </g>
      ))}

      {/* 中間グリッドライン */}
      <line x1={0} y1={midY} x2={100} y2={midY} stroke={bp.stroke} strokeWidth={0.18} strokeDasharray="1.5 1.5" opacity={0.35} />

      {/* ベースライン */}
      <line x1={0} y1={33} x2={100} y2={33} stroke={bp.accent} strokeWidth={0.22} opacity={0.55} />

      {/* 時間ラベル */}
      {hourLabels.map((h) => {
        const x = h * (BAR_W + BAR_GAP) + BAR_W / 2;
        return (
          <g key={h}>
            <line x1={x} y1={33} x2={x} y2={34.2} stroke={bp.accent} strokeWidth={0.22} opacity={0.5} />
            <text x={x} y={35.8} textAnchor="middle" fontSize={1.6} fill={bp.accent} opacity={0.65} fontFamily="sans-serif">{h}</text>
          </g>
        );
      })}

      {/* 「直近24h」ラベル */}
      <text x={1} y={midY - 0.8} fontSize={1.5} fill={bp.accent} opacity={0.55} fontFamily="sans-serif">投稿数 / 24h</text>

      {/* 窓（点灯パターン） */}
      {bars.map(({ x, h }, bi) => {
        const cols = Math.max(1, Math.floor(BAR_W / 1.5));
        const rows = Math.max(1, Math.floor(h / 5));
        const wx = BAR_W / (cols + 1);
        const wy = h / (rows + 1);
        return Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols }, (_, c) => {
            const lit = (bi * 7 + r * 3 + c * 5) % 9 !== 0;
            return (
              <rect
                key={`w${bi}-${r}-${c}`}
                x={x + wx * (c + 0.65)}
                y={33 - h + wy * (r + 0.7)}
                width={0.32} height={0.52}
                fill={BUILD_PALETTES[period].window}
                opacity={lit ? 0.58 : 0.06}
              />
            );
          })
        );
      })}
    </svg>
  );
}

/** 現在時刻から時間帯を判定 */
function periodFromHour(h: number): Period {
  if (h >= 4 && h < 5)  return "dusk";  // 4〜5時: 夕方と同じ配色
  if (h >= 5 && h < 10) return "dawn";  // 5〜10時: 朝
  if (h >= 10 && h < 15) return "day";  // 10〜15時: 昼
  if (h >= 15 && h < 17) return "dusk"; // 15〜17時: 夕方
  return "night";                        // 17〜翌4時: 夜
}

type Palette = {
  sky: string;
  horizon: string;
  haze?: string;
  star: number;
  vignette: string;
};

const PALETTES: Record<Period, Palette> = {
  dawn: {
    sky: "linear-gradient(180deg, #1b2350 0%, #3a2f63 38%, #7d4a72 62%, #c9737a 80%, #f0a878 92%, #f7c98b 100%)",
    horizon: "radial-gradient(120% 60% at 50% 100%, rgba(255,205,150,0.55) 0%, rgba(255,150,110,0.25) 35%, transparent 70%)",
    haze: "radial-gradient(80% 40% at 50% 88%, rgba(255,180,120,0.35) 0%, transparent 60%)",
    star: 0.35,
    vignette: "radial-gradient(ellipse 95% 95% at 50% 40%, transparent 58%, rgba(12,10,32,0.5) 100%)",
  },
  day: {
    sky: "linear-gradient(180deg, #1f4ea0 0%, #2f6bc0 40%, #4f93d8 72%, #8fc1ea 100%)",
    horizon: "radial-gradient(120% 55% at 50% 100%, rgba(200,230,255,0.4) 0%, transparent 65%)",
    star: 0,
    vignette: "radial-gradient(ellipse 95% 95% at 50% 45%, transparent 62%, rgba(10,30,70,0.4) 100%)",
  },
  dusk: {
    sky: "linear-gradient(180deg, #1a1f4a 0%, #45285f 32%, #8a3a63 54%, #d65a4e 74%, #f0894a 88%, #f6b35f 100%)",
    horizon: "radial-gradient(130% 62% at 50% 100%, rgba(255,170,90,0.6) 0%, rgba(220,90,70,0.3) 38%, transparent 72%)",
    haze: "radial-gradient(90% 45% at 50% 90%, rgba(255,140,80,0.4) 0%, transparent 62%)",
    star: 0.4,
    vignette: "radial-gradient(ellipse 95% 95% at 50% 42%, transparent 56%, rgba(14,8,30,0.55) 100%)",
  },
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
  const isNightLike = pal.star > 0;

  const stars = useMemo(
    () =>
      Array.from({ length: 56 }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 72,
        d: 0.7 + Math.random() * 1.8,
        delay: Math.random() * 6,
        dur: 3 + Math.random() * 4,
      })),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <style>{FX}</style>

      {/* 空 */}
      <div className="absolute inset-0 transition-[background] duration-1000" style={{ background: pal.sky }} />

      {/* 星 */}
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

      {/* 流れ星 */}
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

      {/* 地平線 */}
      <div className="absolute inset-0" style={{ background: pal.horizon }} />
      {pal.haze && <div className="absolute inset-0" style={{ background: pal.haze }} />}

      {/* 24時間帯別リアルデータ シティスケープ */}
      <CityscapeLayer period={period} />

      {/* ビネット */}
      <div className="absolute inset-0" style={{ background: pal.vignette }} />
    </div>
  );
}
