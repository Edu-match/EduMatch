"use client";

import { useEffect, useMemo, useState, type ReactElement } from "react";
import type { InteropThemeMode } from "@/lib/interop-settings";

type Period = "dawn" | "day" | "dusk" | "night";

// ── 丘陵シルエット（24時間帯別リアルデータ×木/花の高さ） ───────────

type NaturePalette = { hill: string; hillEdge: string; tree: string; treeTrunk: string; flower: string; grass: string };
const NATURE_PALETTES: Record<Period, NaturePalette> = {
  night: { hill: "rgba(15,35,50,0.85)", hillEdge: "rgba(40,70,100,0.50)", tree: "rgba(20,50,60,0.80)", treeTrunk: "rgba(30,25,20,0.70)", flower: "rgba(180,200,255,0.50)", grass: "rgba(25,60,50,0.60)" },
  dawn:  { hill: "rgba(60,90,50,0.75)", hillEdge: "rgba(140,180,90,0.45)", tree: "rgba(50,100,40,0.80)", treeTrunk: "rgba(80,55,30,0.75)", flower: "rgba(255,200,140,0.70)", grass: "rgba(80,130,60,0.55)" },
  day:   { hill: "rgba(70,140,60,0.70)", hillEdge: "rgba(120,190,80,0.40)", tree: "rgba(40,120,50,0.75)", treeTrunk: "rgba(90,65,35,0.80)", flower: "rgba(255,180,200,0.70)", grass: "rgba(90,160,70,0.50)" },
  dusk:  { hill: "rgba(80,60,50,0.75)", hillEdge: "rgba(180,120,70,0.45)", tree: "rgba(50,70,40,0.80)", treeTrunk: "rgba(70,45,25,0.75)", flower: "rgba(255,160,100,0.65)", grass: "rgba(70,100,50,0.55)" },
};

function HillscapeLayer({ period }: { period: Period }) {
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

  const np = NATURE_PALETTES[period];

  const fallback = useMemo(
    () => Array.from({ length: 24 }, (_, i) =>
      4 + ((i * 1234567 + 3456789) % 1000) / 1000 * 18
    ),
    []
  );

  const data = hourly ?? fallback;
  const maxCount = Math.max(1, ...data);

  return (
    <svg
      className="pointer-events-none absolute inset-x-0 bottom-0 w-full"
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      style={{ height: "min(22vh, 200px)" }}
      aria-hidden
    >
      {/* なだらかな丘陵（ベジェ曲線） */}
      <path
        d="M0,28 C8,22 15,18 25,20 C35,22 40,15 50,16 C60,17 65,12 75,14 C85,16 92,20 100,18 L100,30 L0,30 Z"
        fill={np.hill}
      />
      <path
        d="M0,28 C8,22 15,18 25,20 C35,22 40,15 50,16 C60,17 65,12 75,14 C85,16 92,20 100,18"
        fill="none"
        stroke={np.hillEdge}
        strokeWidth={0.3}
      />

      {/* 手前の丘 */}
      <path
        d="M0,30 C10,25 20,23 30,26 C40,29 50,22 60,24 C70,26 80,23 90,25 C95,26 100,28 100,30 Z"
        fill={np.grass}
      />

      {/* 木（アクティビティに応じた高さ） */}
      {data.map((count, i) => {
        const h = 3 + 10 * (count / maxCount);
        const x = 2 + i * 4.05;
        const isCurrent = i === currentHour;
        const treeH = h * 0.7;
        const trunkH = h * 0.3;
        const baseY = 26 - Math.sin(i * 0.6 + 1) * 3;

        return (
          <g key={i}>
            {/* 幹 */}
            <rect
              x={x + 0.8} y={baseY - trunkH}
              width={0.4} height={trunkH + 1}
              fill={np.treeTrunk}
              opacity={isCurrent ? 1 : 0.7}
            />
            {/* 樹冠（丸い緑） */}
            <ellipse
              cx={x + 1} cy={baseY - trunkH - treeH * 0.4}
              rx={treeH * 0.35} ry={treeH * 0.45}
              fill={np.tree}
              opacity={isCurrent ? 0.95 : 0.7}
            />
            {/* 花（アクティブな時間帯のみ） */}
            {isCurrent && (
              <circle
                cx={x + 1} cy={baseY - trunkH - treeH * 0.4 - treeH * 0.2}
                r={0.35}
                fill={np.flower}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** 現在時刻から時間帯を判定 */
function periodFromHour(h: number): Period {
  if (h >= 4 && h < 5)  return "dusk";
  if (h >= 5 && h < 10) return "dawn";
  if (h >= 10 && h < 15) return "day";
  if (h >= 15 && h < 17) return "dusk";
  return "night";
}

type Palette = {
  sky: string;
  horizon: string;
  haze?: string;
  cloudOpacity: number;
  starOpacity: number;
  vignette: string;
};

const PALETTES: Record<Period, Palette> = {
  dawn: {
    sky: "linear-gradient(180deg, #2a4a7a 0%, #5a7ab0 30%, #d4a574 60%, #f0c896 80%, #fce4b8 100%)",
    horizon: "radial-gradient(120% 60% at 50% 100%, rgba(255,220,170,0.55) 0%, rgba(255,180,140,0.25) 35%, transparent 70%)",
    haze: "radial-gradient(80% 40% at 50% 88%, rgba(255,200,150,0.30) 0%, transparent 60%)",
    cloudOpacity: 0.6,
    starOpacity: 0.15,
    vignette: "radial-gradient(ellipse 95% 95% at 50% 40%, transparent 62%, rgba(30,20,10,0.3) 100%)",
  },
  day: {
    sky: "linear-gradient(180deg, #3a8fd4 0%, #5aabee 35%, #7ec8f8 65%, #b8e0f8 85%, #e3f2fd 100%)",
    horizon: "radial-gradient(120% 55% at 50% 100%, rgba(200,235,255,0.4) 0%, transparent 65%)",
    cloudOpacity: 0.8,
    starOpacity: 0,
    vignette: "radial-gradient(ellipse 95% 95% at 50% 45%, transparent 65%, rgba(20,60,120,0.2) 100%)",
  },
  dusk: {
    sky: "linear-gradient(180deg, #3a4a8a 0%, #6a4a7a 28%, #c06858 54%, #e88a50 74%, #f0b060 88%, #fcd088 100%)",
    horizon: "radial-gradient(130% 62% at 50% 100%, rgba(255,180,100,0.5) 0%, rgba(230,100,70,0.25) 38%, transparent 72%)",
    haze: "radial-gradient(90% 45% at 50% 90%, rgba(255,160,100,0.35) 0%, transparent 62%)",
    cloudOpacity: 0.5,
    starOpacity: 0.2,
    vignette: "radial-gradient(ellipse 95% 95% at 50% 42%, transparent 58%, rgba(30,15,10,0.4) 100%)",
  },
  night: {
    sky: "linear-gradient(180deg, #0c1a3a 0%, #152550 40%, #1e3a60 70%, #2a4a70 100%)",
    horizon: "radial-gradient(120% 55% at 50% 100%, rgba(40,70,120,0.35) 0%, transparent 68%)",
    cloudOpacity: 0.25,
    starOpacity: 0.7,
    vignette: "radial-gradient(ellipse 95% 95% at 50% 46%, transparent 60%, rgba(5,10,25,0.5) 100%)",
  },
};

const FX = `
  @keyframes nlCloud {
    from { transform: translateX(0); }
    to { transform: translateX(-50%); }
  }
  @keyframes nlTwinkle { 0%,100% { opacity: 0.15; } 50% { opacity: 1; } }
  @keyframes nlFirefly {
    0%,100% { opacity: 0; transform: translateY(0); }
    30% { opacity: 0.8; }
    70% { opacity: 0.6; }
    100% { transform: translateY(-20px); opacity: 0; }
  }
  @keyframes nlBird {
    0% { transform: translateX(-20px); }
    100% { transform: translateX(calc(100vw + 40px)); }
  }
`;

export function InteropBackdrop({
  themeMode = "auto",
  showCityscape = true,
}: {
  themeMode?: InteropThemeMode;
  showCityscape?: boolean;
}) {
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
  const showStars = pal.starOpacity > 0;
  const showClouds = pal.cloudOpacity > 0.1;

  const elements = useMemo(() => {
    let seed = 42;
    const rand = () => {
      seed = (seed * 16807 + 0) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const stars = Array.from({ length: 30 }, () => ({
      left: rand() * 100,
      top: rand() * 55,
      d: 0.6 + rand() * 1.4,
      delay: rand() * 6,
      dur: 3 + rand() * 4,
    }));
    const clouds = Array.from({ length: 6 }, () => ({
      top: 5 + rand() * 40,
      w: 80 + rand() * 160,
      h: 20 + rand() * 30,
      speed: 60 + rand() * 80,
      offset: rand() * 100,
    }));
    const fireflies = Array.from({ length: 8 }, () => ({
      left: 10 + rand() * 80,
      bottom: 5 + rand() * 25,
      delay: rand() * 8,
      dur: 4 + rand() * 5,
    }));
    return { stars, clouds, fireflies };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <style>{FX}</style>

      {/* 空 */}
      <div className="absolute inset-0 transition-[background] duration-1000" style={{ background: pal.sky }} />

      {/* 雲 */}
      {showClouds &&
        elements.clouds.map((c, i) => (
          <div
            key={`cloud-${i}`}
            className="absolute"
            style={{
              top: `${c.top}%`,
              left: `${c.offset}%`,
              width: c.w * 2,
              animation: `nlCloud ${c.speed}s linear infinite`,
            }}
          >
            <div
              className="rounded-full"
              style={{
                width: c.w,
                height: c.h,
                background: `radial-gradient(ellipse at 50% 60%, rgba(255,255,255,${pal.cloudOpacity}) 0%, rgba(255,255,255,${pal.cloudOpacity * 0.3}) 60%, transparent 80%)`,
                filter: "blur(4px)",
              }}
            />
            <div
              className="rounded-full -mt-3 ml-6"
              style={{
                width: c.w * 0.7,
                height: c.h * 0.8,
                background: `radial-gradient(ellipse at 50% 60%, rgba(255,255,255,${pal.cloudOpacity * 0.7}) 0%, transparent 75%)`,
                filter: "blur(5px)",
              }}
            />
          </div>
        ))}

      {/* 星（夜・夕方のみ） */}
      {showStars &&
        elements.stars.map((s, i) => (
          <span
            key={`star-${i}`}
            className="absolute rounded-full bg-white"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.d,
              height: s.d,
              opacity: pal.starOpacity,
              animation: `nlTwinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
            }}
          />
        ))}

      {/* 蛍（夜のみ） */}
      {period === "night" &&
        elements.fireflies.map((f, i) => (
          <span
            key={`fly-${i}`}
            className="absolute rounded-full"
            style={{
              left: `${f.left}%`,
              bottom: `${f.bottom}%`,
              width: 4,
              height: 4,
              background: "radial-gradient(circle, rgba(180,255,160,0.9) 0%, rgba(120,255,100,0.3) 50%, transparent 70%)",
              animation: `nlFirefly ${f.dur}s ease-in-out ${f.delay}s infinite`,
            }}
          />
        ))}

      {/* 鳥のシルエット（昼のみ） */}
      {period === "day" && (
        <div
          className="absolute"
          style={{
            top: "18%",
            left: 0,
            fontSize: 12,
            opacity: 0.25,
            animation: "nlBird 25s linear 5s infinite",
          }}
        >
          ~&nbsp;&nbsp;~
        </div>
      )}

      {/* 地平線 */}
      <div className="absolute inset-0" style={{ background: pal.horizon }} />
      {pal.haze && <div className="absolute inset-0" style={{ background: pal.haze }} />}

      {/* 丘陵シルエット */}
      {showCityscape && <HillscapeLayer period={period} />}

      {/* ビネット */}
      <div className="absolute inset-0" style={{ background: pal.vignette }} />
    </div>
  );
}
