"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, Line, Sparkles } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { INTEROP_PRIORITY_TOPICS, MAJOR_META, type InteropPriorityTopic } from "@/lib/interop-priority-topics";

/**
 * 教育のひろば 3D「ギャラクシービュー」— 完全リライト版
 *
 * メタファー: 教育のひろば＝ひとつの太陽系。
 * - 恒星（中央）= ハブ（電子チケット・案内）
 * - 惑星 = 6つの大分類（A〜F）。活発なほど大きく輝く
 * - 衛星 = 各◎トピック（クリックでそのテーマのひろばへ）
 * - 惑星をクリックするとカメラがその惑星系へ滑らかにズームし、衛星ラベルが展開する
 */

type Tier = "high" | "low";
type Caps = { webgl: boolean; tier: Tier; reduceMotion: boolean };

const MAJOR_EMOJI: Record<string, string> = { A: "🤖", B: "📊", C: "🛡️", D: "🌈", E: "🏫", F: "📚" };
const MAJORS = Object.keys(MAJOR_META);

const SPACE_BG =
  "linear-gradient(180deg, #3a8fd4 0%, #5aabee 35%, #7ec8f8 65%, #b8e0f8 85%, #e3f2fd 100%)";

const CAM_START = new THREE.Vector3(0, 90, 210);
const CAM_HOME = new THREE.Vector3(30, 24, 46);

/** 大分類ごとの軌道パラメータ（半径・傾き・初期位相・公転速度） */
type OrbitSpec = {
  major: string;
  rx: number;
  rz: number;
  tiltX: number;
  tiltZ: number;
  phase: number;
  speed: number;
  hasRing: boolean;
};
const ORBITS: OrbitSpec[] = MAJORS.map((major, i) => ({
  major,
  rx: 10.5 + i * 4.7,
  rz: (10.5 + i * 4.7) * 0.94,
  tiltX: [0.05, -0.08, 0.11, -0.05, 0.08, -0.11][i],
  tiltZ: [0.03, -0.04, 0.02, 0.06, -0.03, 0.05][i],
  phase: i * 2.39996, // 黄金角でばらす
  speed: 0.055 / Math.sqrt(1 + i * 0.45),
  hasRing: i === 2 || i === 4, // 土星風のリングを2つだけ（華やかさの差し色）
}));

/* ---------- ユーティリティ ---------- */

function ellipsePoints(rx: number, rz: number, n = 128): [number, number, number][] {
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([Math.cos(a) * rx, 0, Math.sin(a) * rz]);
  }
  return pts;
}

/** 縁が発光するフレネル殻（恒星・惑星の大気） */
const ATMO_VERT = `varying vec3 vN; varying vec3 vP;
void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vP = mv.xyz; gl_Position = projectionMatrix * mv; }`;
const ATMO_FRAG = `uniform vec3 uColor; uniform float uPower; uniform float uIntensity;
varying vec3 vN; varying vec3 vP;
void main(){ vec3 v = normalize(-vP); float f = pow(1.0 - abs(dot(vN, v)), uPower); gl_FragColor = vec4(uColor * uIntensity, f); }`;

function Atmosphere({ color, radius, power, intensity }: { color: string; radius: number; power: number; intensity: number }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: ATMO_VERT,
        fragmentShader: ATMO_FRAG,
        uniforms: {
          uColor: { value: new THREE.Color(color) },
          uPower: { value: power },
          uIntensity: { value: intensity },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    [color, power, intensity]
  );
  return (
    <mesh raycast={() => null} material={mat}>
      <sphereGeometry args={[radius, 32, 32]} />
    </mesh>
  );
}


/* ---------- ラベル ---------- */

const pillBase: React.CSSProperties = {
  whiteSpace: "nowrap",
  fontWeight: 700,
  color: "#1a3a5a",
  borderRadius: 999,
  textShadow: "0 1px 2px rgba(255,255,255,0.5)",
  boxShadow: "0 3px 14px rgba(0,0,0,0.15)",
  pointerEvents: "none",
};

function PlanetLabel({ color, emoji, label, total, hover }: { color: string; emoji: string; label: string; total: number; hover: boolean }) {
  return (
    <div
      style={{
        ...pillBase,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: hover ? 11 : 10,
        padding: "2px 8px 2px 4px",
        background: hover ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.85)",
        border: `1px solid ${color}${hover ? "ee" : "88"}`,
        transition: "all .18s ease",
        maxWidth: 140,
      }}
    >
      <span style={{ display: "grid", placeItems: "center", width: 16, height: 16, borderRadius: 999, fontSize: 10, background: `${color}44`, flexShrink: 0 }}>{emoji}</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      {total > 0 && (
        <span style={{ fontSize: 8, fontWeight: 800, color: "#0a1024", padding: "1px 5px", borderRadius: 999, background: color, flexShrink: 0 }}>{total}</span>
      )}
    </div>
  );
}

/* ---------- 天体 ---------- */

type GalaxyClock = { orbit: number; moon: number };

function Sun({ label, seg, reduceMotion, labelScale = 1, compact = false, onSelect }: { label: string; seg: number; reduceMotion: boolean; labelScale?: number; compact?: boolean; onSelect: () => void }) {
  const core = useRef<THREE.Mesh>(null);
  const [hover, setHover] = useState(false);
  useFrame(({ clock }) => {
    if (!core.current) return;
    const t = clock.getElapsedTime();
    const pulse = reduceMotion ? 1 : 1 + Math.sin(t * 1.3) * 0.035;
    core.current.scale.setScalar(pulse * (hover ? 1.06 : 1));
    if (!reduceMotion) core.current.rotation.y = t * 0.06;
  });
  const enter = () => { setHover(true); document.body.style.cursor = "pointer"; };
  const leave = () => { setHover(false); document.body.style.cursor = "auto"; };
  return (
    <group>
      <mesh ref={core} onPointerOver={(e) => { e.stopPropagation(); enter(); }} onPointerOut={leave} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        <sphereGeometry args={[2.7, seg, seg]} />
        <meshBasicMaterial color={hover ? "#fff6de" : "#ffedc2"} toneMapped={false} />
      </mesh>
      <Atmosphere color="#ffd9a0" radius={3.6} power={2.1} intensity={1.3} />
      <Atmosphere color="#ff9d5c" radius={4.9} power={3.4} intensity={0.9} />
      <Html center distanceFactor={compact ? 200 : 60} position={[0, 5.3, 0]} zIndexRange={[70, 50]} style={{ pointerEvents: "auto" }}>
        <button
          type="button"
          onMouseEnter={enter}
          onMouseLeave={leave}
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          style={{
            cursor: "pointer",
            appearance: "none",
            whiteSpace: "nowrap",
            fontSize: compact ? Math.round(9 * labelScale) : Math.round(11 * labelScale),
            fontWeight: 800,
            color: "#1a3a5a",
            background: "rgba(255,255,255,0.92)",
            border: "1px solid #ffd9a0cc",
            borderRadius: 999,
            padding: `${Math.round(3 * labelScale)}px ${Math.round(10 * labelScale)}px`,
            boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
            transform: `scale(${labelScale})`,
            transformOrigin: "center center",
          }}
        >
          🎫 {label}
        </button>
      </Html>
    </group>
  );
}

function Moon({ topic, posts, planetR, index, count, clockRef, seg, showLabel, compact = false, onSelect }: {
  topic: InteropPriorityTopic;
  posts: number;
  planetR: number;
  index: number;
  count: number;
  clockRef: React.MutableRefObject<GalaxyClock>;
  seg: number;
  showLabel: boolean;
  compact?: boolean;
  onSelect: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const [hover, setHover] = useState(false);
  const color = MAJOR_META[topic.major]?.color ?? "#C9D4F6";
  const r = 0.42 + Math.min(0.7, posts * 0.08);
  const orbitR = planetR + 2.1 + (index % 2) * 0.75;
  const speed = 0.38 + (index % 3) * 0.09;
  const phase = (index / count) * Math.PI * 2;

  useFrame(() => {
    if (!group.current) return;
    const t = clockRef.current.moon * speed + phase;
    group.current.position.set(Math.cos(t) * orbitR, Math.sin(t * 1.7 + phase * 3) * 0.55, Math.sin(t) * orbitR);
  });

  const enter = () => { setHover(true); document.body.style.cursor = "pointer"; };
  const leave = () => { setHover(false); document.body.style.cursor = "auto"; };
  const visible = hover || showLabel;

  return (
    <group ref={group}>
      <mesh
        scale={hover ? 1.3 : 1}
        onPointerOver={(e) => { e.stopPropagation(); enter(); }}
        onPointerOut={leave}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
      >
        <sphereGeometry args={[r, seg, seg]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <Atmosphere color={color} radius={r * 1.45} power={2.6} intensity={hover ? 1.3 : 0.6} />
      {hover && (
        <Html center distanceFactor={compact ? 200 : 40} position={[0, r + 0.9, 0]} zIndexRange={[45, 10]} style={{ pointerEvents: "none" }}>
          <div style={{ ...pillBase, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, padding: "2px 8px", background: "rgba(255,255,255,0.88)", border: `1px solid ${color}bb` }}>
            <span>{topic.category}</span>
            {posts > 0 && <span style={{ fontSize: 9, fontWeight: 800, color: "#0a1024", padding: "0 5px", borderRadius: 999, background: color }}>{posts}</span>}
          </div>
        </Html>
      )}
    </group>
  );
}

function Planet({ spec, topics, counts, clockRef, seg, focused, anyFocused, positionsRef, reduceMotion, labelScale = 1, compact = false, onFocus, onSelectTopic }: {
  spec: OrbitSpec;
  topics: InteropPriorityTopic[];
  counts: Map<string, number>;
  clockRef: React.MutableRefObject<GalaxyClock>;
  seg: number;
  focused: boolean;
  anyFocused: boolean;
  positionsRef: React.MutableRefObject<Record<string, THREE.Vector3>>;
  reduceMotion: boolean;
  labelScale?: number;
  compact?: boolean;
  onFocus: () => void;
  onSelectTopic: (t: InteropPriorityTopic) => void;
}) {
  const holder = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);
  const [hover, setHover] = useState(false);
  const meta = MAJOR_META[spec.major];
  const color = meta?.color ?? "#C9D4F6";
  const emoji = MAJOR_EMOJI[spec.major] ?? "✨";
  const total = topics.reduce((acc, t) => acc + (counts.get(t.roomId) ?? 0), 0);
  const planetR = 1.35 + Math.min(1.3, total * 0.035);

  useFrame(() => {
    if (!holder.current) return;
    const t = clockRef.current.orbit * spec.speed + spec.phase;
    holder.current.position.set(Math.cos(t) * spec.rx, 0, Math.sin(t) * spec.rz);
    holder.current.getWorldPosition(positionsRef.current[spec.major] ?? (positionsRef.current[spec.major] = new THREE.Vector3()));
    if (body.current && !reduceMotion) body.current.rotation.y += 0.0012;
  });

  const enter = () => { setHover(true); document.body.style.cursor = "pointer"; };
  const leave = () => { setHover(false); document.body.style.cursor = "auto"; };
  const dim = anyFocused && !focused;

  return (
    <group rotation={[spec.tiltX, 0, spec.tiltZ]}>
      {/* 軌道 */}
      <Line
        points={ellipsePoints(spec.rx, spec.rz)}
        color={color}
        lineWidth={focused || hover ? 1.6 : 1}
        transparent
        opacity={dim ? 0.05 : focused || hover ? 0.4 : 0.16}
      />
      <group ref={holder}>
        {/* 惑星本体 */}
        <mesh
          ref={body}
          scale={hover ? 1.12 : 1}
          onPointerOver={(e) => { e.stopPropagation(); enter(); }}
          onPointerOut={leave}
          onClick={(e) => { e.stopPropagation(); onFocus(); }}
        >
          <sphereGeometry args={[planetR, seg, seg]} />
          <meshBasicMaterial color={color} transparent opacity={dim ? 0.35 : 1} toneMapped={false} />
        </mesh>
        <Atmosphere color={color} radius={planetR * 1.32} power={2.4} intensity={dim ? 0.3 : hover || focused ? 1.35 : 0.8} />
        {/* リング（差し色） */}
        {spec.hasRing && (
          <mesh raycast={() => null} rotation={[Math.PI / 2.25, 0, 0]}>
            <ringGeometry args={[planetR * 1.55, planetR * 2.15, 64]} />
            <meshBasicMaterial color={color} transparent opacity={dim ? 0.08 : 0.3} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        )}
        {/* ラベル */}
        {!dim && (!compact || hover || focused) && (
          <Html center distanceFactor={compact ? 250 : (focused ? 50 : 80)} position={[0, planetR + 1.8, 0]} zIndexRange={[hover || focused ? 55 : 20, 5]} style={{ pointerEvents: "auto" }}>
            <button
              type="button"
              onMouseEnter={enter}
              onMouseLeave={leave}
              onClick={(e) => { e.stopPropagation(); onFocus(); }}
              style={{ appearance: "none", background: "none", border: "none", padding: 0, cursor: "pointer", transform: `scale(${labelScale})`, transformOrigin: "center center" }}
            >
              <PlanetLabel color={color} emoji={emoji} label={meta?.label ?? spec.major} total={total} hover={hover || focused} />
            </button>
          </Html>
        )}
        {/* 衛星（トピック） */}
        {topics.map((t, i) => (
          <Moon
            key={t.no}
            topic={t}
            posts={counts.get(t.roomId) ?? 0}
            planetR={planetR}
            index={i}
            count={topics.length}
            clockRef={clockRef}
            seg={Math.max(16, seg - 16)}
            showLabel={focused}
            compact={compact}
            onSelect={() => onSelectTopic(t)}
          />
        ))}
      </group>
    </group>
  );
}


/* ---------- カメラ演出 ---------- */

function CameraRig({ focusedMajor, positionsRef, reduceMotion }: {
  focusedMajor: string | null;
  positionsRef: React.MutableRefObject<Record<string, THREE.Vector3>>;
  reduceMotion: boolean;
}) {
  const { camera, controls } = useThree() as unknown as { camera: THREE.PerspectiveCamera; controls: OrbitControlsImpl | null };
  const intro = useRef(reduceMotion ? 1 : 0);
  const tmpTarget = useRef(new THREE.Vector3());
  const tmpCam = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    // 1) イントロ：宇宙の彼方からのフライイン
    if (intro.current < 1) {
      intro.current = Math.min(1, intro.current + delta / 2.4);
      const e = 1 - Math.pow(1 - intro.current, 3); // easeOutCubic
      camera.position.lerpVectors(CAM_START, CAM_HOME, e);
      if (controls) {
        controls.target.set(0, 0, 0);
        controls.update();
      }
      return;
    }
    if (!controls) return;

    // 2) フォーカス：選択した惑星系へ滑らかに寄る／解除で全景へ戻す
    const k = 1 - Math.exp(-3.2 * delta);
    if (focusedMajor) {
      const p = positionsRef.current[focusedMajor];
      if (p) {
        tmpTarget.current.copy(p);
        const dir = p.clone().normalize();
        tmpCam.current.copy(p).addScaledVector(dir, 14.5).add(new THREE.Vector3(0, 6.2, 0));
        controls.target.lerp(tmpTarget.current, k);
        camera.position.lerp(tmpCam.current, k);
        controls.update();
      }
    } else {
      controls.target.lerp(tmpTarget.current.set(0, 0, 0), k * 0.8);
      controls.update();
    }
  });
  return null;
}

/* ---------- シーン ---------- */

function useLabelScale(): { scale: number; compact: boolean } {
  const { size } = useThree();
  const shorter = Math.min(size.width, size.height);
  const compact = shorter < 400;
  const scale = Math.max(0.3, Math.min(1, shorter / 600));
  return { scale, compact };
}

function Scene({ centerLabel, counts, caps, focusedMajor, onFocusMajor, onSelectCenter, onSelectTopic }: {
  centerLabel: string;
  counts: Map<string, number>;
  caps: Caps;
  focusedMajor: string | null;
  onFocusMajor: (m: string | null) => void;
  onSelectCenter: () => void;
  onSelectTopic: (t: InteropPriorityTopic) => void;
}) {
  const { tier, reduceMotion } = caps;
  const { scale: labelScale, compact } = useLabelScale();
  const seg = tier === "high" ? 48 : 24;
  const clockRef = useRef<GalaxyClock>({ orbit: 0, moon: 0 });
  const positionsRef = useRef<Record<string, THREE.Vector3>>({});
  const focusedRef = useRef<string | null>(focusedMajor);
  useEffect(() => {
    focusedRef.current = focusedMajor;
  }, [focusedMajor]);

  // 公転はフォーカス中に静止、衛星は常に周回（reduce-motion時は全て静止）
  useFrame((_, delta) => {
    if (reduceMotion) return;
    if (!focusedRef.current) clockRef.current.orbit += delta;
    clockRef.current.moon += delta;
  });

  const topicsByMajor = useMemo(() => {
    const m = new Map<string, InteropPriorityTopic[]>();
    for (const t of INTEROP_PRIORITY_TOPICS) {
      const arr = m.get(t.major) ?? [];
      arr.push(t);
      m.set(t.major, arr);
    }
    return m;
  }, []);

  return (
    <>
      <color attach="background" args={["#87CEEB"]} />
      {/* 微細な花粉・妖精の塵 */}
      {tier === "high" && <Sparkles count={320} scale={[85, 26, 85]} size={1.8} speed={reduceMotion ? 0 : 0.28} opacity={0.3} color="#ffd700" />}

      <Sun label={centerLabel} seg={seg} reduceMotion={reduceMotion} labelScale={labelScale} compact={compact} onSelect={onSelectCenter} />
      {ORBITS.map((spec) => (
        <Planet
          key={spec.major}
          spec={spec}
          topics={topicsByMajor.get(spec.major) ?? []}
          counts={counts}
          clockRef={clockRef}
          seg={seg}
          focused={focusedMajor === spec.major}
          anyFocused={focusedMajor !== null}
          positionsRef={positionsRef}
          reduceMotion={reduceMotion}
          labelScale={labelScale}
          compact={compact}
          onFocus={() => onFocusMajor(focusedMajor === spec.major ? null : spec.major)}
          onSelectTopic={onSelectTopic}
        />
      ))}

      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={8}
        maxDistance={140}
        maxPolarAngle={Math.PI * 0.88}
        enableDamping
        dampingFactor={0.07}
        autoRotate={!reduceMotion && !focusedMajor}
        autoRotateSpeed={0.35}
      />
      <CameraRig focusedMajor={focusedMajor} positionsRef={positionsRef} reduceMotion={reduceMotion} />

      {/* 注: EffectComposer(Bloom/Vignette)は three r180 との組合せで画面が黒落ちするため不使用。
          発光はフレネル大気シェーダー、ビネットはDOMオーバーレイで表現する。 */}
    </>
  );
}

/* ---------- 能力判定・フォールバック ---------- */

function useClientCapabilities(): Caps | null {
  const [caps, setCaps] = useState<Caps | null>(null);
  useEffect(() => {
    let webgl = false;
    try {
      const c = document.createElement("canvas");
      webgl = !!(c.getContext("webgl") || c.getContext("experimental-webgl"));
    } catch {
      webgl = false;
    }
    const isMobile =
      window.matchMedia("(max-width: 768px)").matches || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    const lowCores = (navigator.hardwareConcurrency ?? 8) <= 4;
    const lowMem = ((navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 8) <= 4;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tier: Tier = isMobile || lowCores || lowMem ? "low" : "high";
    // マウント後の一度きりのクライアント能力検出（外部環境→Reactへの同期）。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCaps({ webgl, tier, reduceMotion });
  }, []);
  return caps;
}

/** WebGL 非対応・描画不可時の 2D フォールバック（誰も広場から締め出さない）。 */
function ForumGalaxy2DFallback({ centerLabel, counts, onSelectCenter, onSelectTopic }: {
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
    <div className="absolute inset-0 overflow-y-auto" style={{ background: SPACE_BG }}>
      <div className="mx-auto max-w-3xl px-4 py-6">
        <button
          type="button"
          onClick={onSelectCenter}
          className="mb-6 flex w-full items-center gap-3 rounded-2xl border border-amber-200/40 bg-white/70 px-5 py-4 text-left text-[#1a3a5a] backdrop-blur transition hover:bg-white/80"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-200/50 text-lg">🎫</span>
          <span>
            <span className="block text-base font-bold">{centerLabel}</span>
            <span className="block text-xs text-[#1a3a5a]/60">中央ハブ（電子チケット・案内）</span>
          </span>
        </button>
        {groups.map(([major, topics]) => {
          const meta = MAJOR_META[major];
          const color = meta?.color ?? "#C9D4F6";
          return (
            <div key={major} className="mb-6">
              <h3 className="mb-2.5 flex items-center gap-2 text-sm font-bold text-[#1a3a5a]/90">
                <span className="grid h-7 w-7 place-items-center rounded-full text-sm" style={{ background: `${color}33` }}>
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
                      style={{ borderColor: `${color}55`, background: `${color}14` }}
                    >
                      <span className="min-w-0 truncate">{t.category}</span>
                      {posts > 0 && (
                        <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-[#0a1024]" style={{ background: color }}>
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

/* ---------- エントリ ---------- */

export default function ForumGalaxy3D({ centerLabel, onSelectCenter, onSelectTopic }: {
  centerLabel?: string;
  onSelectCenter: () => void;
  onSelectTopic: (t: InteropPriorityTopic) => void;
}) {
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [focusedMajor, setFocusedMajor] = useState<string | null>(null);
  const caps = useClientCapabilities();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/forum/rooms?communityThemes=true")
      .then((r) => r.json())
      .then((d: { rooms?: Array<{ id: string; postCount?: number }> }) => {
        if (cancelled) return;
        const m = new Map<string, number>();
        for (const room of d.rooms ?? []) m.set(room.id, room.postCount ?? 0);
        setCounts(m);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const label = centerLabel?.trim() || "議員会館";

  if (!caps) {
    return <div className="absolute inset-0" style={{ background: SPACE_BG }} />;
  }
  if (!caps.webgl) {
    return <ForumGalaxy2DFallback centerLabel={label} counts={counts} onSelectCenter={onSelectCenter} onSelectTopic={onSelectTopic} />;
  }

  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0" style={{ background: SPACE_BG }} />
      {/* 山・自然の背景（2Dビューと統一・3Dコンテンツの背後に配置） */}
      <svg
        className="pointer-events-none absolute inset-x-0 bottom-0 w-full"
        viewBox="0 0 100 30"
        preserveAspectRatio="none"
        style={{ height: "min(22vh, 200px)", zIndex: 0 }}
        aria-hidden
      >
        <path d="M0,28 C8,22 15,18 25,20 C35,22 40,15 50,16 C60,17 65,12 75,14 C85,16 92,20 100,18 L100,30 L0,30 Z" fill="rgba(70,140,60,0.70)" />
        <path d="M0,28 C8,22 15,18 25,20 C35,22 40,15 50,16 C60,17 65,12 75,14 C85,16 92,20 100,18" fill="none" stroke="rgba(120,190,80,0.40)" strokeWidth="0.3" />
        <path d="M0,30 C10,25 20,23 30,26 C40,29 50,22 60,24 C70,26 80,23 90,25 C95,26 100,28 100,30 Z" fill="rgba(90,160,70,0.50)" />
      </svg>
      <Canvas
        camera={{ position: CAM_START.toArray() as [number, number, number], fov: 46 }}
        dpr={caps.tier === "high" ? [1, 2] : [1, 1.5]}
        gl={{ antialias: caps.tier === "high", alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent", position: "relative", zIndex: 1 }}
      >
        <Scene
          centerLabel={label}
          counts={counts}
          caps={caps}
          focusedMajor={focusedMajor}
          onFocusMajor={setFocusedMajor}
          onSelectCenter={onSelectCenter}
          onSelectTopic={onSelectTopic}
        />
      </Canvas>

      {/* シネマティックなビネット（CSS・ポストプロセス代替） */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(100,180,250,0.2) 100%)" }}
      />

      {/* フォーカス解除ボタン */}
      {focusedMajor && (
        <div className="pointer-events-auto absolute bottom-4 left-1/2 z-40 -translate-x-1/2">
          <button
            type="button"
            onClick={() => setFocusedMajor(null)}
            className="rounded-full border border-[#1a3a5a]/20 bg-white/70 px-3.5 py-1.5 text-xs font-bold text-[#1a3a5a] backdrop-blur transition hover:bg-white/85"
          >
            ← 全体へ
          </button>
        </div>
      )}

      <p className="pointer-events-none absolute bottom-3 left-4 z-40 max-w-[240px] text-[11px] leading-relaxed text-[#1a3a5a]/55 sm:max-w-none">
        惑星＝カテゴリをタップで接近 · 衛星＝トピックをタップでひろばへ · ドラッグで回転
        {caps.tier === "low" && <span className="text-[#1a3a5a]/40">・軽量モード</span>}
      </p>
    </div>
  );
}
