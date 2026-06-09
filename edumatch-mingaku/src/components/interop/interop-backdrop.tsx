"use client";

import { useEffect, useMemo, useState } from "react";
import type { InteropThemeMode } from "@/lib/interop-settings";

type Period = "dawn" | "day" | "dusk" | "night";

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
  /** 天体（太陽/月） */
  orb: { color: string; glow: string; x: string; y: string; size: number };
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
    orb: { color: "#fff3d6", glow: "rgba(255,196,128,0.95)", x: "50%", y: "82%", size: 150 },
    horizon: "radial-gradient(120% 60% at 50% 100%, rgba(255,205,150,0.55) 0%, rgba(255,150,110,0.25) 35%, transparent 70%)",
    haze: "radial-gradient(80% 40% at 50% 88%, rgba(255,180,120,0.35) 0%, transparent 60%)",
    star: 0.35,
    vignette: "radial-gradient(ellipse 95% 95% at 50% 40%, transparent 58%, rgba(12,10,32,0.5) 100%)",
  },
  // 昼：澄んだ青空。高い位置の柔らかな太陽。
  day: {
    sky: "linear-gradient(180deg, #1f4ea0 0%, #2f6bc0 40%, #4f93d8 72%, #8fc1ea 100%)",
    orb: { color: "#ffffff", glow: "rgba(255,250,230,0.85)", x: "72%", y: "24%", size: 120 },
    horizon: "radial-gradient(120% 55% at 50% 100%, rgba(200,230,255,0.4) 0%, transparent 65%)",
    star: 0,
    vignette: "radial-gradient(ellipse 95% 95% at 50% 45%, transparent 62%, rgba(10,30,70,0.4) 100%)",
  },
  // 夕陽：群青 → 茜 → 橙 → 黄金。大きく沈む太陽。
  dusk: {
    sky: "linear-gradient(180deg, #1a1f4a 0%, #45285f 32%, #8a3a63 54%, #d65a4e 74%, #f0894a 88%, #f6b35f 100%)",
    orb: { color: "#fff0c4", glow: "rgba(255,150,80,0.95)", x: "50%", y: "86%", size: 190 },
    horizon: "radial-gradient(130% 62% at 50% 100%, rgba(255,170,90,0.6) 0%, rgba(220,90,70,0.3) 38%, transparent 72%)",
    haze: "radial-gradient(90% 45% at 50% 90%, rgba(255,140,80,0.4) 0%, transparent 62%)",
    star: 0.4,
    vignette: "radial-gradient(ellipse 95% 95% at 50% 42%, transparent 56%, rgba(14,8,30,0.55) 100%)",
  },
  // 夜：深い紺。冴えた月と満天の星。
  night: {
    sky: "linear-gradient(180deg, #05060f 0%, #070b1e 45%, #0b1030 75%, #121641 100%)",
    orb: { color: "#eef3ff", glow: "rgba(170,195,255,0.7)", x: "76%", y: "20%", size: 96 },
    horizon: "radial-gradient(120% 55% at 50% 100%, rgba(60,80,150,0.32) 0%, transparent 68%)",
    star: 0.85,
    vignette: "radial-gradient(ellipse 95% 95% at 50% 46%, transparent 60%, rgba(2,3,12,0.6) 100%)",
  },
};

const FX = `
  @keyframes itmTwinkle { 0%,100% { opacity: 0.15; } 50% { opacity: 1; } }
  @keyframes itmOrbBreathe { 0%,100% { transform: translate(-50%,-50%) scale(1); } 50% { transform: translate(-50%,-50%) scale(1.04); } }
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

      {/* 天体（太陽 / 月）＋外周のハロー */}
      <div
        className="absolute"
        style={{ left: pal.orb.x, top: pal.orb.y, width: pal.orb.size, height: pal.orb.size, transform: "translate(-50%,-50%)" }}
      >
        {/* 広がるグロー */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: pal.orb.size * 3.4,
            height: pal.orb.size * 3.4,
            background: `radial-gradient(circle, ${pal.orb.glow} 0%, transparent 62%)`,
          }}
        />
        {/* 本体 */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 50% 42%, #fff 0%, ${pal.orb.color} 38%, ${pal.orb.color} 60%, transparent 72%)`,
            boxShadow: `0 0 60px 12px ${pal.orb.glow}`,
            animation: "itmOrbBreathe 7s ease-in-out infinite",
          }}
        />
        {/* 月のクレーター風陰影（夜のみ） */}
        {period === "night" && (
          <div
            className="absolute inset-0 rounded-full"
            style={{ background: "radial-gradient(circle at 64% 38%, transparent 60%, rgba(120,140,190,0.25) 100%)" }}
          />
        )}
      </div>

      {/* 地平線の発光 */}
      <div className="absolute inset-0" style={{ background: pal.horizon }} />
      {pal.haze && <div className="absolute inset-0" style={{ background: pal.haze }} />}

      {/* ビネット */}
      <div className="absolute inset-0" style={{ background: pal.vignette }} />
    </div>
  );
}
