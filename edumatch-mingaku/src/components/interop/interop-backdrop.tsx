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

/** 時間帯ごとの配色（落ち着いたトーンを維持） */
const PALETTES: Record<Period, { layers: string[]; star: number; vignette: string }> = {
  dawn: {
    layers: [
      "radial-gradient(ellipse 70% 50% at 50% 70%, rgba(255,150,120,0.14) 0%, transparent 65%)",
      "radial-gradient(ellipse 60% 45% at 50% 35%, rgba(120,110,200,0.16) 0%, transparent 65%)",
      "linear-gradient(180deg, #10142e 0%, #1a1838 50%, #2a2148 100%)",
    ],
    star: 0.22,
    vignette: "radial-gradient(ellipse 90% 90% at 50% 48%, transparent 62%, rgba(10,8,26,0.55) 100%)",
  },
  day: {
    layers: [
      "radial-gradient(ellipse 65% 50% at 50% 38%, rgba(120,180,230,0.18) 0%, transparent 68%)",
      "radial-gradient(ellipse 70% 50% at 18% 14%, rgba(90,150,210,0.14) 0%, transparent 60%)",
      "linear-gradient(180deg, #122244 0%, #16306a 55%, #1c3f86 100%)",
    ],
    star: 0.12,
    vignette: "radial-gradient(ellipse 90% 90% at 50% 48%, transparent 65%, rgba(8,18,44,0.5) 100%)",
  },
  dusk: {
    layers: [
      "radial-gradient(ellipse 75% 50% at 50% 72%, rgba(255,120,90,0.16) 0%, transparent 66%)",
      "radial-gradient(ellipse 65% 48% at 50% 32%, rgba(150,80,170,0.18) 0%, transparent 64%)",
      "linear-gradient(180deg, #14112e 0%, #281640 52%, #3a1c46 100%)",
    ],
    star: 0.26,
    vignette: "radial-gradient(ellipse 90% 90% at 50% 48%, transparent 60%, rgba(12,6,24,0.6) 100%)",
  },
  night: {
    layers: [
      "radial-gradient(ellipse 60% 45% at 50% 40%, rgba(70,90,180,0.16) 0%, transparent 65%)",
      "radial-gradient(ellipse 70% 50% at 15% 12%, rgba(40,120,170,0.12) 0%, transparent 60%)",
      "linear-gradient(180deg, #060816 0%, #080b22 55%, #0a0e2e 100%)",
    ],
    star: 0.32,
    vignette: "radial-gradient(ellipse 90% 90% at 50% 48%, transparent 62%, rgba(3,5,16,0.6) 100%)",
  },
};

const TWINKLE = `@keyframes itmTwinkle { 0%,100% { opacity: 0.12; } 50% { opacity: 0.6; } }`;

/** 時間帯で配色が変わる星図の背景 */
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
    const t = setInterval(update, 5 * 60 * 1000); // 5分ごとに見直し
    return () => clearInterval(t);
  }, [themeMode]);

  const pal = PALETTES[period];
  const stars = useMemo(
    () =>
      Array.from({ length: 64 }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        d: 0.8 + Math.random() * 1.6,
        delay: Math.random() * 6,
        dur: 3.5 + Math.random() * 4,
      })),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <style>{TWINKLE}</style>
      <div
        className="absolute inset-0 transition-[background] duration-1000"
        style={{ background: pal.layers.join(", ") }}
      />
      {stars.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.d,
            height: s.d,
            animation: `itmTwinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
            opacity: pal.star,
          }}
        />
      ))}
      <div className="absolute inset-0" style={{ background: pal.vignette }} />
    </div>
  );
}
