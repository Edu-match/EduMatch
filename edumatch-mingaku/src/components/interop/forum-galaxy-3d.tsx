"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { Html, OrbitControls, Line } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  INTEROP_PRIORITY_TOPICS,
  MAJOR_META,
  type InteropPriorityTopic,
} from "@/lib/interop-priority-topics";
import {
  DEFAULT_AXIS_CONFIG,
  DEFAULT_TOPIC_AXIS,
  type AxisConfig,
  type AxisPoint,
} from "@/lib/interop-topic-axis";
import type { Axis3 } from "@/lib/interop-axis-db";

const S = 18;
const TOPIC_BY_NO = new Map(
  INTEROP_PRIORITY_TOPICS.map((t) => [t.no, t])
);

/* ── 時間帯演出（interop-backdrop.tsx と同期） ── */

type Period = "dawn" | "day" | "dusk" | "night";

function periodFromHour(h: number): Period {
  if (h >= 4 && h < 5) return "dusk";
  if (h >= 5 && h < 10) return "dawn";
  if (h >= 10 && h < 15) return "day";
  if (h >= 15 && h < 17) return "dusk";
  return "night";
}

type BgPalette = {
  sky: string;
  horizon: string;
  haze?: string;
  vignette: string;
  cloudOpacity: number;
  starOpacity: number;
  hill: string;
  hillEdge: string;
  grass: string;
};

const BG_PALETTES: Record<Period, BgPalette> = {
  dawn: {
    sky: "linear-gradient(180deg, #2a4a7a 0%, #5a7ab0 30%, #d4a574 60%, #f0c896 80%, #fce4b8 100%)",
    horizon:
      "radial-gradient(120% 60% at 50% 100%, rgba(255,220,170,0.55) 0%, rgba(255,180,140,0.25) 35%, transparent 70%)",
    haze: "radial-gradient(80% 40% at 50% 88%, rgba(255,200,150,0.30) 0%, transparent 60%)",
    vignette:
      "radial-gradient(ellipse 95% 95% at 50% 40%, transparent 62%, rgba(30,20,10,0.3) 100%)",
    cloudOpacity: 0.6,
    starOpacity: 0.15,
    hill: "rgba(60,90,50,0.75)",
    hillEdge: "rgba(140,180,90,0.45)",
    grass: "rgba(80,130,60,0.55)",
  },
  day: {
    sky: "linear-gradient(180deg, #3a8fd4 0%, #5aabee 35%, #7ec8f8 65%, #b8e0f8 85%, #e3f2fd 100%)",
    horizon:
      "radial-gradient(120% 55% at 50% 100%, rgba(200,235,255,0.4) 0%, transparent 65%)",
    vignette:
      "radial-gradient(ellipse 95% 95% at 50% 45%, transparent 65%, rgba(20,60,120,0.2) 100%)",
    cloudOpacity: 0.8,
    starOpacity: 0,
    hill: "rgba(70,140,60,0.70)",
    hillEdge: "rgba(120,190,80,0.40)",
    grass: "rgba(90,160,70,0.50)",
  },
  dusk: {
    sky: "linear-gradient(180deg, #3a4a8a 0%, #6a4a7a 28%, #c06858 54%, #e88a50 74%, #f0b060 88%, #fcd088 100%)",
    horizon:
      "radial-gradient(130% 62% at 50% 100%, rgba(255,180,100,0.5) 0%, rgba(230,100,70,0.25) 38%, transparent 72%)",
    haze: "radial-gradient(90% 45% at 50% 90%, rgba(255,160,100,0.35) 0%, transparent 62%)",
    vignette:
      "radial-gradient(ellipse 95% 95% at 50% 42%, transparent 58%, rgba(30,15,10,0.4) 100%)",
    cloudOpacity: 0.5,
    starOpacity: 0.2,
    hill: "rgba(80,60,50,0.75)",
    hillEdge: "rgba(180,120,70,0.45)",
    grass: "rgba(70,100,50,0.55)",
  },
  night: {
    sky: "linear-gradient(180deg, #0c1a3a 0%, #152550 40%, #1e3a60 70%, #2a4a70 100%)",
    horizon:
      "radial-gradient(120% 55% at 50% 100%, rgba(40,70,120,0.35) 0%, transparent 68%)",
    vignette:
      "radial-gradient(ellipse 95% 95% at 50% 46%, transparent 60%, rgba(5,10,25,0.5) 100%)",
    cloudOpacity: 0.25,
    starOpacity: 0.7,
    hill: "rgba(15,35,50,0.85)",
    hillEdge: "rgba(40,70,100,0.50)",
    grass: "rgba(25,60,50,0.60)",
  },
};

const BG_FX = `
  @keyframes g3dCloud { from { transform: translateX(0); } to { transform: translateX(-50%); } }
  @keyframes g3dTwinkle { 0%,100% { opacity: 0.15; } 50% { opacity: 1; } }
  @keyframes g3dFirefly { 0%,100% { opacity: 0; transform: translateY(0); } 30% { opacity: 0.8; } 70% { opacity: 0.6; } 100% { transform: translateY(-20px); opacity: 0; } }
`;

function useBgElements() {
  return useMemo(() => {
    let seed = 42;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
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
}

function useTimePeriod(): Period {
  const [period, setPeriod] = useState<Period>(() =>
    periodFromHour(new Date().getHours())
  );
  useEffect(() => {
    const update = () => setPeriod(periodFromHour(new Date().getHours()));
    update();
    const t = setInterval(update, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, []);
  return period;
}

/* ── ラベルスタイル ── */

const labelStyle = (
  color: string,
  size = 11
): React.CSSProperties => ({
  whiteSpace: "nowrap",
  fontSize: size,
  fontWeight: 700,
  color: "#fff",
  background: `linear-gradient(135deg, rgba(8,11,32,0.82), ${color}55)`,
  border: `1px solid ${color}aa`,
  borderRadius: 8,
  padding: "1.5px 7px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.45)",
  textShadow: "0 1px 2px rgba(0,0,0,0.55)",
});

const axisLabelStyle: React.CSSProperties = {
  whiteSpace: "nowrap",
  fontSize: 12,
  fontWeight: 800,
  color: "rgba(210,224,255,0.9)",
  background: "rgba(8,11,32,0.55)",
  border: "1px solid rgba(150,175,255,0.3)",
  borderRadius: 6,
  padding: "2px 8px",
};

/* ── ユーティリティ ── */

function nodeSize(posts: number): number {
  return 0.55 + Math.min(0.7, posts * 0.05);
}

/* ── TopicNode（散布図の各トピック） ── */

function TopicNode({
  topic,
  posts,
  position,
  onSelect,
}: {
  topic: InteropPriorityTopic;
  posts: number;
  position: [number, number, number];
  onSelect: () => void;
}) {
  const [hover, setHover] = useState(false);
  const color = MAJOR_META[topic.major]?.color ?? "#C9D4F6";
  const r = nodeSize(posts);
  const enter = () => {
    setHover(true);
    document.body.style.cursor = "pointer";
  };
  const leave = () => {
    setHover(false);
    document.body.style.cursor = "auto";
  };
  return (
    <group position={position}>
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          enter();
        }}
        onPointerOut={leave}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        <sphereGeometry args={[Math.max(1.3, r * 2.4), 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh raycast={() => null} scale={hover ? 1.25 : 1}>
        <sphereGeometry args={[r, 24, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hover ? 0.85 : 0.45}
          roughness={0.45}
          metalness={0.05}
        />
      </mesh>
      <mesh raycast={() => null} scale={hover ? 1.7 : 1.45}>
        <sphereGeometry args={[r, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={hover ? 0.18 : 0.1}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
      {position[1] > 0.01 && (
        <Line
          points={[
            [0, 0, 0],
            [0, -position[1], 0],
          ]}
          color={color}
          lineWidth={1}
          transparent
          opacity={0.25}
          dashed
          dashScale={3}
        />
      )}
      <Html
        center
        distanceFactor={hover ? 16 : 22}
        position={[0, r + 0.7, 0]}
        zIndexRange={[16, 2]}
        style={{ pointerEvents: "auto" }}
      >
        <button
          type="button"
          onMouseEnter={enter}
          onMouseLeave={leave}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          style={{
            ...labelStyle(color, hover ? 12 : 10.5),
            cursor: "pointer",
            appearance: "none",
          }}
        >
          {topic.category}
          {posts > 0 ? ` · ${posts}` : ""}
        </button>
      </Html>
    </group>
  );
}

/* ── AxisFrame（2軸 + 第3軸） ── */

function AxisFrame({
  config,
  axis3Label,
}: {
  config: AxisConfig;
  axis3Label?: string;
}) {
  const grid = "#2a3566";
  const axisColor = "#6f86d6";
  return (
    <group>
      <gridHelper args={[S * 2, 16, grid, "#1c2444"]} position={[0, 0, 0]} />
      <Line
        points={[
          [-S, 0, 0],
          [S, 0, 0],
        ]}
        color={axisColor}
        lineWidth={1.5}
      />
      <Line
        points={[
          [0, 0, S],
          [0, 0, -S],
        ]}
        color={axisColor}
        lineWidth={1.5}
      />
      <Html
        center
        position={[S + 2.5, 0, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div style={axisLabelStyle}>{config.xRight} →</div>
      </Html>
      <Html
        center
        position={[-S - 2.5, 0, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div style={axisLabelStyle}>← {config.xLeft}</div>
      </Html>
      <Html
        center
        position={[0, 0, -S - 2.5]}
        style={{ pointerEvents: "none" }}
      >
        <div style={axisLabelStyle}>{config.yTop} ↑</div>
      </Html>
      <Html
        center
        position={[0, 0, S + 2.5]}
        style={{ pointerEvents: "none" }}
      >
        <div style={axisLabelStyle}>{config.yBottom} ↓</div>
      </Html>
      {axis3Label && (
        <>
          <Line
            points={[
              [0, 0, 0],
              [0, 15, 0],
            ]}
            color="#7fd6ff"
            lineWidth={1.5}
          />
          <Html
            center
            position={[0, 16, 0]}
            style={{ pointerEvents: "none" }}
          >
            <div
              style={{
                ...axisLabelStyle,
                color: "#bfeaff",
                borderColor: "rgba(127,214,255,0.5)",
              }}
            >
              {axis3Label} ↑
            </div>
          </Html>
        </>
      )}
    </group>
  );
}

/* ── CenterHub（中心ハブ） ── */

function CenterHub({
  label,
  onSelect,
}: {
  label: string;
  onSelect: () => void;
}) {
  const [hover, setHover] = useState(false);
  const enter = () => {
    setHover(true);
    document.body.style.cursor = "pointer";
  };
  const leave = () => {
    setHover(false);
    document.body.style.cursor = "auto";
  };
  return (
    <group position={[0, 1.4, 0]}>
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          enter();
        }}
        onPointerOut={leave}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        <sphereGeometry args={[2.4, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh raycast={() => null} scale={hover ? 1.12 : 1}>
        <sphereGeometry args={[1.4, 32, 32]} />
        <meshStandardMaterial
          color="#eaf2ff"
          emissive="#9db8ff"
          emissiveIntensity={hover ? 1.1 : 0.7}
          roughness={0.3}
        />
      </mesh>
      <mesh raycast={() => null} scale={1.6}>
        <sphereGeometry args={[1.4, 20, 20]} />
        <meshBasicMaterial
          color="#9db8ff"
          transparent
          opacity={0.14}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
      <Html
        center
        distanceFactor={hover ? 20 : 26}
        position={[0, 2.4, 0]}
        zIndexRange={[40, 30]}
        style={{ pointerEvents: "auto" }}
      >
        <button
          type="button"
          onMouseEnter={enter}
          onMouseLeave={leave}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          style={{
            ...labelStyle("#9db8ff", 13),
            cursor: "pointer",
            appearance: "none",
            fontWeight: 800,
          }}
        >
          {label}
        </button>
      </Html>
    </group>
  );
}

/* ── Controls ── */

function Controls() {
  const ref = useRef<any>(null);
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.key === "Shift" && ref.current)
        ref.current.mouseButtons.LEFT = THREE.MOUSE.PAN;
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === "Shift" && ref.current)
        ref.current.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);
  return (
    <OrbitControls
      ref={ref}
      makeDefault
      enablePan
      screenSpacePanning
      minDistance={10}
      maxDistance={90}
      maxPolarAngle={Math.PI * 0.49}
      target={[0, 1, 0]}
      enableDamping
      dampingFactor={0.08}
    />
  );
}

/* ── Scene ── */

function Scene({
  centerLabel,
  config,
  positions,
  counts,
  axis3,
  threeAxis,
  onSelectTopic,
  onSelectCenter,
}: {
  centerLabel: string;
  config: AxisConfig;
  positions: Record<number, AxisPoint>;
  counts: Map<string, number>;
  axis3?: Axis3;
  threeAxis: boolean;
  onSelectTopic: (t: InteropPriorityTopic) => void;
  onSelectCenter: () => void;
}) {
  const nodes = useMemo(() => {
    const out: {
      topic: InteropPriorityTopic;
      posts: number;
      position: [number, number, number];
    }[] = [];
    for (const [noStr, p] of Object.entries(positions)) {
      const no = Number(noStr);
      const topic = TOPIC_BY_NO.get(no);
      if (!topic) continue;
      const posts = counts.get(topic.roomId) ?? 0;
      const y = threeAxis ? (axis3?.values[no] ?? 0.5) * 14 : 0;
      out.push({ topic, posts, position: [p.x * S, y, -p.y * S] });
    }
    return out;
  }, [positions, counts, threeAxis, axis3]);

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={0.5}
        color="#cdd9ff"
      />
      <AxisFrame
        config={config}
        axis3Label={threeAxis ? (axis3?.label ?? "第3軸") : undefined}
      />
      <CenterHub label={centerLabel} onSelect={onSelectCenter} />
      {nodes.map(({ topic, posts, position }) => (
        <TopicNode
          key={topic.no}
          topic={topic}
          posts={posts}
          position={position}
          onSelect={() => onSelectTopic(topic)}
        />
      ))}
      <Controls />
    </>
  );
}

/* ── WebGL 検出 ── */

function useWebGLAvailable(): boolean | null {
  const [avail, setAvail] = useState<boolean | null>(null);
  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAvail(
        !!(c.getContext("webgl") || c.getContext("experimental-webgl"))
      );
    } catch {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAvail(false);
    }
  }, []);
  return avail;
}

/* ── 2D フォールバック（WebGL 非対応時） ── */

const MAJOR_EMOJI: Record<string, string> = {
  A: "🤖",
  B: "📊",
  C: "🛡️",
  D: "🌈",
  E: "🏫",
  F: "📚",
};

function ForumGalaxy2DFallback({
  centerLabel,
  counts,
  onSelectCenter,
  onSelectTopic,
}: {
  centerLabel: string;
  counts: Map<string, number>;
  onSelectCenter: () => void;
  onSelectTopic: (t: InteropPriorityTopic) => void;
}) {
  const groups = useMemo(() => {
    const byMajor = new Map<string, InteropPriorityTopic[]>();
    for (const t of INTEROP_PRIORITY_TOPICS) {
      const arr = byMajor.get(t.major) ?? [];
      arr.push(t);
      byMajor.set(t.major, arr);
    }
    return [...byMajor.entries()];
  }, []);
  return (
    <div
      className="absolute inset-0 overflow-y-auto"
      style={{ background: BG_PALETTES.day.sky }}
    >
      <div className="mx-auto max-w-3xl px-4 py-6">
        <button
          type="button"
          onClick={onSelectCenter}
          className="mb-6 flex w-full items-center gap-3 rounded-2xl border border-amber-200/40 bg-white/70 px-5 py-4 text-left text-[#1a3a5a] backdrop-blur transition hover:bg-white/80"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-200/50 text-lg">
            🎫
          </span>
          <span>
            <span className="block text-base font-bold">{centerLabel}</span>
            <span className="block text-xs text-[#1a3a5a]/60">
              中央ハブ（電子チケット・案内）
            </span>
          </span>
        </button>
        {groups.map(([major, topics]) => {
          const meta = MAJOR_META[major];
          const color = meta?.color ?? "#C9D4F6";
          return (
            <div key={major} className="mb-6">
              <h3 className="mb-2.5 flex items-center gap-2 text-sm font-bold text-[#1a3a5a]/90">
                <span
                  className="grid h-7 w-7 place-items-center rounded-full text-sm"
                  style={{ background: `${color}33` }}
                >
                  {MAJOR_EMOJI[major] ?? "✨"}
                </span>
                <span>{meta?.label ?? major}</span>
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {topics.map((t) => {
                  const posts = counts.get(t.roomId) ?? 0;
                  return (
                    <button
                      key={t.no}
                      type="button"
                      onClick={() => onSelectTopic(t)}
                      className="flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-left text-sm text-[#1a3a5a] transition hover:scale-[1.02]"
                      style={{
                        borderColor: `${color}55`,
                        background: `${color}14`,
                      }}
                    >
                      <span className="min-w-0 truncate">{t.category}</span>
                      {posts > 0 && (
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-[#0a1024]"
                          style={{ background: color }}
                        >
                          {posts}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <p className="pointer-events-none absolute bottom-3 left-4 text-[11px] text-[#1a3a5a]/50">
        軽量表示モード（3D非対応環境）。タップで各テーマの教育のひろばへ。
      </p>
    </div>
  );
}

/* ── エントリ ── */

export default function ForumGalaxy3D({
  centerLabel,
  onSelectCenter,
  onSelectTopic,
}: {
  centerLabel?: string;
  onSelectCenter: () => void;
  onSelectTopic: (t: InteropPriorityTopic) => void;
}) {
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [config, setConfig] = useState<AxisConfig>(DEFAULT_AXIS_CONFIG);
  const [positions, setPositions] = useState<Record<number, AxisPoint>>(
    DEFAULT_TOPIC_AXIS
  );
  const [axis3, setAxis3] = useState<Axis3 | undefined>();
  const [threeAxis, setThreeAxis] = useState(false);
  const webgl = useWebGLAvailable();
  const period = useTimePeriod();
  const pal = BG_PALETTES[period];
  const els = useBgElements();
  const showStars = pal.starOpacity > 0;
  const showClouds = pal.cloudOpacity > 0.1;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/interop/axis")
      .then((r) => r.json())
      .then(
        (d: {
          config?: AxisConfig;
          positions?: Record<number, AxisPoint>;
          axis3?: Axis3;
        }) => {
          if (cancelled) return;
          if (d.config) setConfig(d.config);
          if (d.positions && Object.keys(d.positions).length)
            setPositions(d.positions);
          if (d.axis3) setAxis3(d.axis3);
        }
      )
      .catch(() => {});
    fetch("/api/forum/rooms?communityThemes=true")
      .then((r) => r.json())
      .then(
        (d: { rooms?: Array<{ id: string; postCount?: number }> }) => {
          if (cancelled) return;
          const m = new Map<string, number>();
          for (const room of d.rooms ?? [])
            m.set(room.id, room.postCount ?? 0);
          setCounts(m);
        }
      )
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const label = centerLabel?.trim() || "議員会館";

  if (webgl === null) {
    return (
      <div
        className="absolute inset-0 transition-[background] duration-1000"
        style={{ background: pal.sky }}
      />
    );
  }
  if (!webgl) {
    return (
      <ForumGalaxy2DFallback
        centerLabel={label}
        counts={counts}
        onSelectCenter={onSelectCenter}
        onSelectTopic={onSelectTopic}
      />
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden">
      <style>{BG_FX}</style>

      {/* 空グラデーション */}
      <div
        className="absolute inset-0 transition-[background] duration-1000"
        style={{ background: pal.sky }}
      />

      {/* 雲 */}
      {showClouds &&
        els.clouds.map((c, i) => (
          <div
            key={`cloud-${i}`}
            className="pointer-events-none absolute"
            style={{
              top: `${c.top}%`,
              left: `${c.offset}%`,
              width: c.w * 2,
              animation: `g3dCloud ${c.speed}s linear infinite`,
              zIndex: 0,
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
              className="-mt-3 ml-6 rounded-full"
              style={{
                width: c.w * 0.7,
                height: c.h * 0.8,
                background: `radial-gradient(ellipse at 50% 60%, rgba(255,255,255,${pal.cloudOpacity * 0.7}) 0%, transparent 75%)`,
                filter: "blur(5px)",
              }}
            />
          </div>
        ))}

      {/* 星 */}
      {showStars &&
        els.stars.map((s, i) => (
          <span
            key={`star-${i}`}
            className="pointer-events-none absolute rounded-full bg-white"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.d,
              height: s.d,
              opacity: pal.starOpacity,
              animation: `g3dTwinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
              zIndex: 0,
            }}
          />
        ))}

      {/* 蛍（夜のみ） */}
      {period === "night" &&
        els.fireflies.map((f, i) => (
          <span
            key={`fly-${i}`}
            className="pointer-events-none absolute rounded-full"
            style={{
              left: `${f.left}%`,
              bottom: `${f.bottom}%`,
              width: 4,
              height: 4,
              background:
                "radial-gradient(circle, rgba(180,255,160,0.9) 0%, rgba(120,255,100,0.3) 50%, transparent 70%)",
              animation: `g3dFirefly ${f.dur}s ease-in-out ${f.delay}s infinite`,
              zIndex: 0,
            }}
          />
        ))}

      {/* 丘陵シルエット */}
      <svg
        className="pointer-events-none absolute inset-x-0 bottom-0 w-full"
        viewBox="0 0 100 30"
        preserveAspectRatio="none"
        style={{ height: "min(22vh, 200px)", zIndex: 0 }}
        aria-hidden
      >
        <path
          d="M0,28 C8,22 15,18 25,20 C35,22 40,15 50,16 C60,17 65,12 75,14 C85,16 92,20 100,18 L100,30 L0,30 Z"
          fill={pal.hill}
          className="transition-[fill] duration-1000"
        />
        <path
          d="M0,28 C8,22 15,18 25,20 C35,22 40,15 50,16 C60,17 65,12 75,14 C85,16 92,20 100,18"
          fill="none"
          stroke={pal.hillEdge}
          strokeWidth="0.3"
          className="transition-[stroke] duration-1000"
        />
        <path
          d="M0,30 C10,25 20,23 30,26 C40,29 50,22 60,24 C70,26 80,23 90,25 C95,26 100,28 100,30 Z"
          fill={pal.grass}
          className="transition-[fill] duration-1000"
        />
      </svg>

      {/* 3D Canvas（透過、背景が見える） */}
      <Canvas
        camera={{
          position: [0, 20, 34] as [number, number, number],
          fov: 50,
        }}
        dpr={[1, 1.6]}
        gl={{ antialias: true, alpha: true }}
        style={{
          background: "transparent",
          position: "relative",
          zIndex: 1,
        }}
      >
        <Scene
          centerLabel={label}
          config={config}
          positions={positions}
          counts={counts}
          axis3={axis3}
          threeAxis={threeAxis}
          onSelectTopic={onSelectTopic}
          onSelectCenter={onSelectCenter}
        />
      </Canvas>

      {/* 地平線グロー */}
      <div
        className="pointer-events-none absolute inset-0 transition-[background] duration-1000"
        aria-hidden
        style={{ background: pal.horizon, zIndex: 2 }}
      />
      {pal.haze && (
        <div
          className="pointer-events-none absolute inset-0 transition-[background] duration-1000"
          aria-hidden
          style={{ background: pal.haze, zIndex: 2 }}
        />
      )}
      <div
        className="pointer-events-none absolute inset-0 transition-[background] duration-1000"
        aria-hidden
        style={{ background: pal.vignette, zIndex: 2 }}
      />

      {/* 第3軸トグル＋操作ヒント */}
      <div className="absolute bottom-4 right-4 z-40 flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => setThreeAxis((v) => !v)}
          className={`rounded-full border px-3 py-1.5 text-xs font-bold backdrop-blur transition ${
            threeAxis
              ? "border-sky-300/50 bg-sky-400/20 text-white"
              : "border-white/15 bg-[#0a1024]/80 text-white/80 hover:text-white"
          }`}
        >
          {threeAxis
            ? `◳ ${axis3?.label ?? "第3軸"}：ON`
            : "◰ 第3軸（高さ）：OFF"}
        </button>
      </div>
      <p className="pointer-events-none absolute bottom-4 left-4 z-40 text-[11px] leading-relaxed text-white/55">
        ドラッグで回転 ·{" "}
        <span className="text-white/70">Shift+ドラッグで移動</span> ·
        ホイールで拡大／玉やタイトルをタップで掲示板へ
      </p>
    </div>
  );
}
