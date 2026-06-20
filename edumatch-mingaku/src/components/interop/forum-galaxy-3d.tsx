"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { Html, OrbitControls, Line, Stars } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { INTEROP_PRIORITY_TOPICS, MAJOR_META, type InteropPriorityTopic } from "@/lib/interop-priority-topics";
import { DEFAULT_AXIS_CONFIG, type AxisConfig, type AxisPoint } from "@/lib/interop-topic-axis";

// 広めに展開して、どの視点でも玉/ラベルが重なりにくいようにする
const S = 44;
const MAXH = 30;
const CENTER_Y = MAXH / 2;
const TOPIC_BY_NO = new Map(INTEROP_PRIORITY_TOPICS.map((t) => [t.no, t]));

const MAJOR_EMOJI: Record<string, string> = { A: "🤖", B: "📊", C: "🛡️", D: "🌈", E: "🏫", F: "📚" };

type Axis3 = { label: string; values: Record<number, number> };
type Edge = { a: number; b: number; weight: number };

function splitPoles(label: string): [string, string] {
  const parts = label.split(/↔|⇔|<->|〜|~|→|↑/).map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) return [parts[0], parts[1]];
  return ["", label.trim()];
}

// 重なり回避のための決定的ジッター（no ごとに一定）。
function jitter(no: number): [number, number, number] {
  const fr = (x: number) => { const v = Math.sin(x) * 43758.5453; return v - Math.floor(v); };
  return [(fr(no * 12.99) - 0.5) * 6, (fr(no * 78.23) - 0.5) * 7, (fr(no * 39.42) - 0.5) * 6];
}

const axisLabelStyle: React.CSSProperties = {
  whiteSpace: "nowrap", fontSize: 12, fontWeight: 800, color: "rgba(205,224,255,0.88)",
  background: "rgba(6,12,28,0.55)", border: "1px solid rgba(120,170,245,0.32)", borderRadius: 6, padding: "2px 8px",
};

function nodeSize(posts: number): number {
  return 0.72 + Math.min(0.95, posts * 0.055);
}

// ── 縁が光る fresnel（大気/オーラ）。Bloom無しでも上品に発光して見える ──
const ATMO_VERT = `varying vec3 vN; varying vec3 vP;
void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vP = mv.xyz; gl_Position = projectionMatrix * mv; }`;
const ATMO_FRAG = `uniform vec3 uColor; uniform float uPower; uniform float uIntensity;
varying vec3 vN; varying vec3 vP;
void main(){ vec3 v = normalize(-vP); float f = pow(1.0 - abs(dot(vN, v)), uPower); gl_FragColor = vec4(uColor * uIntensity, f); }`;
function Atmosphere({ color, radius, power, intensity }: { color: string; radius: number; power: number; intensity: number }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: ATMO_VERT, fragmentShader: ATMO_FRAG,
    uniforms: { uColor: { value: new THREE.Color(color) }, uPower: { value: power }, uIntensity: { value: intensity } },
    transparent: true, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false,
  }), [color, power, intensity]);
  return <mesh raycast={() => null} material={mat}><sphereGeometry args={[radius, 32, 32]} /></mesh>;
}

/** 常時表示のタイトル＋件数ラベル。 */
function NodeLabel({ color, emoji, title, posts, hover }: { color: string; emoji: string; title: string; posts: number; hover: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, pointerEvents: "none" }}>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
        padding: "3px 10px 3px 4px", borderRadius: 10, fontSize: hover ? 12.5 : 11, fontWeight: 700, color: "#eef4ff",
        background: hover ? "rgba(10,18,40,0.92)" : "rgba(6,12,28,0.72)", border: `1px solid ${color}${hover ? "cc" : "88"}`,
        boxShadow: hover ? `0 0 14px ${color}66, 0 4px 14px rgba(0,0,0,0.5)` : "0 3px 10px rgba(0,0,0,0.4)",
        textShadow: "0 1px 2px rgba(0,0,0,0.65)",
      }}>
        <span style={{ display: "grid", placeItems: "center", width: hover ? 20 : 18, height: hover ? 20 : 18, borderRadius: 6, fontSize: hover ? 12 : 10.5, background: `${color}33` }}>{emoji}</span>
        <span>{title}</span>
      </div>
      {posts > 0 && (
        <span style={{ fontSize: 9.5, fontWeight: 800, color: "#06101f", lineHeight: 1.2, padding: "1px 7px", borderRadius: 999, background: color, boxShadow: `0 0 8px ${color}88` }}>{posts}件</span>
      )}
    </div>
  );
}

/** 1トピック＝上品に発光する惑星オーブ（emissive本体＋縁光）。 */
function TopicNode({ topic, posts, position, onSelect }: { topic: InteropPriorityTopic; posts: number; position: [number, number, number]; onSelect: () => void }) {
  const [hover, setHover] = useState(false);
  const color = MAJOR_META[topic.major]?.color ?? "#C9D4F6";
  const emoji = MAJOR_EMOJI[topic.major] ?? "✨";
  const r = nodeSize(posts);
  const dropToPlane = CENTER_Y - position[1];
  const enter = () => { setHover(true); document.body.style.cursor = "pointer"; };
  const leave = () => { setHover(false); document.body.style.cursor = "auto"; };
  return (
    <group position={position}>
      {/* 本体（emissiveで上品に発光・はっきり見える） */}
      <mesh scale={hover ? 1.12 : 1} onPointerOver={(e) => { e.stopPropagation(); enter(); }} onPointerOut={leave} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        <sphereGeometry args={[r, 48, 48]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={hover ? 0.7 : 0.5} roughness={0.42} metalness={0.1} />
      </mesh>
      {/* 縁光（控えめ） */}
      <Atmosphere color={color} radius={r * 1.28} power={3.0} intensity={hover ? 1.1 : 0.7} />
      {/* 中心平面への細い垂線 */}
      <Line points={[[0, 0, 0], [0, dropToPlane, 0]]} color={color} lineWidth={1} transparent opacity={0.1} dashed dashScale={3} />
      {/* 常時表示ラベル */}
      <Html center distanceFactor={hover ? 20 : 28} position={[0, r + 1.4, 0]} zIndexRange={[hover ? 40 : 16, 2]} style={{ pointerEvents: "none" }}>
        <NodeLabel color={color} emoji={emoji} title={topic.category} posts={posts} hover={hover} />
      </Html>
    </group>
  );
}

function TopicEdges({ edges, posById }: { edges: Edge[]; posById: Map<number, [number, number, number]> }) {
  const segments = useMemo(() => {
    const out: { key: string; a: [number, number, number]; b: [number, number, number] }[] = [];
    for (const e of edges) {
      const a = posById.get(e.a); const b = posById.get(e.b);
      if (a && b) out.push({ key: `${e.a}-${e.b}`, a, b });
    }
    return out;
  }, [edges, posById]);
  return (
    <group>
      {segments.map((s) => (<Line key={s.key} points={[s.a, s.b]} color="#5f86c8" lineWidth={1} transparent opacity={0.16} />))}
    </group>
  );
}

/** 2軸（X/Z）を中央(CENTER_Y)に。第3軸は縦・両端ラベル。 */
function AxisFrame({ config, axis3Low, axis3High }: { config: AxisConfig; axis3Low: string; axis3High: string }) {
  const axis = "#46659c";
  const v3 = "#6aa0d8";
  const cy = CENTER_Y;
  return (
    <group>
      <Line points={[[-S, cy, 0], [S, cy, 0]]} color={axis} lineWidth={1.25} transparent opacity={0.45} />
      <Line points={[[0, cy, S], [0, cy, -S]]} color={axis} lineWidth={1.25} transparent opacity={0.45} />
      <mesh raycast={() => null} position={[0, cy, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.4, 3.6, 64]} />
        <meshBasicMaterial color="#6aa0d8" transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <Html center position={[S + 4, cy, 0]} style={{ pointerEvents: "none" }}><div style={axisLabelStyle}>{config.xRight} →</div></Html>
      <Html center position={[-S - 4, cy, 0]} style={{ pointerEvents: "none" }}><div style={axisLabelStyle}>← {config.xLeft}</div></Html>
      <Html center position={[0, cy, -S - 4]} style={{ pointerEvents: "none" }}><div style={axisLabelStyle}>{config.yTop} ↑</div></Html>
      <Html center position={[0, cy, S + 4]} style={{ pointerEvents: "none" }}><div style={axisLabelStyle}>{config.yBottom} ↓</div></Html>
      <Line points={[[0, 0, 0], [0, MAXH, 0]]} color={v3} lineWidth={1.5} transparent opacity={0.4} />
      <Html center position={[0, MAXH + 2, 0]} style={{ pointerEvents: "none" }}><div style={{ ...axisLabelStyle, color: "#cfe6ff", borderColor: "rgba(120,180,255,0.5)" }}>{axis3High || "（巡回待ち）"} ↑</div></Html>
      {axis3Low && (
        <Html center position={[0, -2, 0]} style={{ pointerEvents: "none" }}><div style={{ ...axisLabelStyle, color: "#cfe6ff", borderColor: "rgba(120,180,255,0.4)" }}>↓ {axis3Low}</div></Html>
      )}
    </group>
  );
}

/** 中心ハブ＝起点。上品に発光する明色オーブ。ラベル常時。 */
function CenterHub({ label, onSelect }: { label: string; onSelect: () => void }) {
  const [hover, setHover] = useState(false);
  const enter = () => { setHover(true); document.body.style.cursor = "pointer"; };
  const leave = () => { setHover(false); document.body.style.cursor = "auto"; };
  const select = (e?: { stopPropagation?: () => void }) => { e?.stopPropagation?.(); onSelect(); };
  return (
    <group position={[0, CENTER_Y, 0]}>
      <mesh scale={hover ? 1.06 : 1} onPointerOver={(e) => { e.stopPropagation(); enter(); }} onPointerOut={leave} onClick={(e) => select(e)}>
        <sphereGeometry args={[2.2, 48, 48]} />
        <meshStandardMaterial color="#eef3ff" emissive="#a9c8ff" emissiveIntensity={hover ? 0.85 : 0.6} roughness={0.4} metalness={0.2} />
      </mesh>
      <Atmosphere color="#a9c8ff" radius={3.0} power={2.4} intensity={hover ? 1.5 : 1.0} />
      <mesh raycast={() => null} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.8, 2.95, 64]} />
        <meshBasicMaterial color="#9db8ff" transparent opacity={0.4} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <Html center distanceFactor={hover ? 24 : 32} position={[0, 3.6, 0]} zIndexRange={[60, 40]} style={{ pointerEvents: "auto" }}>
        <button type="button" onMouseEnter={enter} onMouseLeave={leave} onClick={(e) => select(e)}
          style={{ cursor: "pointer", appearance: "none", whiteSpace: "nowrap", fontSize: 13, fontWeight: 800, color: "#eef4ff", background: "rgba(6,12,28,0.82)", border: "1px solid #9db8ffcc", borderRadius: 999, padding: "4px 12px", boxShadow: "0 0 16px rgba(140,180,255,0.4)" }}>
          🎫 {label}
        </button>
      </Html>
    </group>
  );
}

/** OrbitControls：ドラッグ=回転、Shift+ドラッグ=平行移動、ホイール=ズーム。
 *  Shift状態をReact stateで持ち mouseButtons を prop で切替（確実に反映）。 */
function Controls() {
  const ref = useRef<any>(null);
  const [shift, setShift] = useState(false);
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === "Shift") setShift(true); };
    const up = (e: KeyboardEvent) => { if (e.key === "Shift") setShift(false); };
    const blur = () => setShift(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", blur); };
  }, []);
  return (
    <OrbitControls
      ref={ref}
      makeDefault
      enablePan
      screenSpacePanning
      mouseButtons={{ LEFT: shift ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
      minDistance={18}
      maxDistance={220}
      maxPolarAngle={Math.PI * 0.9}
      target={[0, CENTER_Y, 0]}
      enableDamping
      dampingFactor={0.08}
    />
  );
}

function Scene({ centerLabel, config, positions, axis3, edges, counts, onSelectCenter, onSelectTopic }: {
  centerLabel: string; config: AxisConfig; positions: Record<number, AxisPoint>; axis3: Axis3; edges: Edge[]; counts: Map<string, number>;
  onSelectCenter: () => void; onSelectTopic: (t: InteropPriorityTopic) => void;
}) {
  const [axis3Low, axis3High] = useMemo(() => splitPoles(axis3.label), [axis3.label]);

  const nodes = useMemo(() => {
    const out: { topic: InteropPriorityTopic; posts: number; position: [number, number, number] }[] = [];
    for (const [noStr, p] of Object.entries(positions)) {
      const no = Number(noStr);
      const topic = TOPIC_BY_NO.get(no);
      if (!topic) continue;
      const posts = counts.get(topic.roomId) ?? 0;
      const [jx, jy, jz] = jitter(no);
      const y = (axis3.values[no] ?? 0.5) * MAXH + jy;
      out.push({ topic, posts, position: [p.x * S + jx, y, -p.y * S + jz] });
    }
    return out;
  }, [positions, counts, axis3]);

  const posById = useMemo(() => {
    const m = new Map<number, [number, number, number]>();
    for (const n of nodes) m.set(n.topic.no, n.position);
    return m;
  }, [nodes]);

  const effectiveEdges = useMemo<Edge[]>(() => {
    if (edges.length) return edges;
    const out: Edge[] = []; const seen = new Set<string>();
    for (const n of nodes) {
      let best: { no: number; d: number } | null = null;
      for (const m of nodes) {
        if (m.topic.no === n.topic.no || m.topic.major !== n.topic.major) continue;
        const dx = n.position[0] - m.position[0]; const dz = n.position[2] - m.position[2];
        const d = dx * dx + dz * dz;
        if (!best || d < best.d) best = { no: m.topic.no, d };
      }
      if (best) {
        const a = Math.min(n.topic.no, best.no); const b = Math.max(n.topic.no, best.no);
        const k = `${a}-${b}`;
        if (!seen.has(k)) { seen.add(k); out.push({ a, b, weight: 1 }); }
      }
    }
    return out;
  }, [edges, nodes]);

  return (
    <>
      <color attach="background" args={["#05080f"]} />
      <ambientLight intensity={0.6} />
      <hemisphereLight args={["#bcd2ff", "#0a1426", 0.55]} />
      <directionalLight position={[24, 40, 24]} intensity={0.85} color="#ffffff" />
      <directionalLight position={[-22, -10, -18]} intensity={0.3} color="#9fb6ff" />
      <Stars radius={200} depth={90} count={1800} factor={3.5} saturation={0} fade speed={0.2} />
      <AxisFrame config={config} axis3Low={axis3Low} axis3High={axis3High} />
      <TopicEdges edges={effectiveEdges} posById={posById} />
      <CenterHub label={centerLabel} onSelect={onSelectCenter} />
      {nodes.map(({ topic, posts, position }) => (
        <TopicNode key={topic.no} topic={topic} posts={posts} position={position} onSelect={() => onSelectTopic(topic)} />
      ))}
      <Controls />
    </>
  );
}

export default function ForumGalaxy3D({ centerLabel, onSelectCenter, onSelectTopic }: {
  centerLabel?: string;
  onSelectCenter: () => void;
  onSelectTopic: (t: InteropPriorityTopic) => void;
}) {
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [config, setConfig] = useState<AxisConfig>(DEFAULT_AXIS_CONFIG);
  const [positions, setPositions] = useState<Record<number, AxisPoint>>({});
  const [axis3, setAxis3] = useState<Axis3>({ label: "巡回待ち", values: {} });
  const [edges, setEdges] = useState<Edge[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/interop/axis").then((r) => r.json()).then((d: { config?: AxisConfig; positions?: Record<number, AxisPoint>; axis3?: Axis3; edges?: Edge[] }) => {
      if (cancelled) return;
      if (d.config) setConfig(d.config);
      if (d.positions && Object.keys(d.positions).length) setPositions(d.positions);
      if (d.axis3?.label) setAxis3({ label: d.axis3.label, values: d.axis3.values ?? {} });
      if (Array.isArray(d.edges)) setEdges(d.edges);
    }).catch(() => {});
    fetch("/api/forum/rooms?communityThemes=true").then((r) => r.json()).then((d: { rooms?: Array<{ id: string; postCount?: number }> }) => {
      if (cancelled) return;
      const m = new Map<string, number>();
      for (const room of d.rooms ?? []) m.set(room.id, room.postCount ?? 0);
      setCounts(m);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const label = centerLabel?.trim() || "議員会館";

  return (
    <div className="absolute inset-0">
      {/* 初期視点は斜め見下ろしの3/4ビュー（正面だと2Dに見えるため、奥行きと高さを見せる） */}
      <Canvas camera={{ position: [62, 54, 78], fov: 46 }} dpr={[1, 2]} gl={{ antialias: true }}>
        <Scene centerLabel={label} config={config} positions={positions} axis3={axis3} edges={edges} counts={counts} onSelectCenter={onSelectCenter} onSelectTopic={onSelectTopic} />
      </Canvas>
      <p className="pointer-events-none absolute bottom-4 left-4 z-40 text-[11px] leading-relaxed text-white/45">
        ドラッグで回転・<span className="text-white/70">Shift+ドラッグで移動</span>・ホイールで拡大／玉の大きさ＝活発さ・高さ＝週次AI巡回の分析軸
      </p>
    </div>
  );
}
