"use client";

import { useEffect, useMemo, useState } from "react";

type Period = "dawn" | "day" | "dusk" | "night";

function periodFromHour(h: number): Period {
  if (h >= 5 && h < 9) return "dawn";
  if (h >= 9 && h < 16) return "day";
  if (h >= 16 && h < 19) return "dusk";
  return "night";
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

export function ForumBackdrop() {
  const [period, setPeriod] = useState<Period>("night");
  useEffect(() => {
    const update = () => setPeriod(periodFromHour(new Date().getHours()));
    update();
    const t = setInterval(update, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const pal = PALETTES[period];
  const isNightLike = pal.star > 0;

  const stars = useMemo(
    () =>
      Array.from({ length: 80 }, () => ({
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
      <div className="absolute inset-0 transition-[background] duration-1000" style={{ background: pal.sky }} />
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
      <div className="absolute inset-0" style={{ background: pal.horizon }} />
      {pal.haze && <div className="absolute inset-0" style={{ background: pal.haze }} />}
      <div className="absolute inset-0" style={{ background: pal.vignette }} />
    </div>
  );
}
