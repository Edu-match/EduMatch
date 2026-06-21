"use client";

import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls, Line } from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { INTEROP_PRIORITY_TOPICS, MAJOR_META, type InteropPriorityTopic } from "@/lib/interop-priority-topics";
import { DEFAULT_AXIS_CONFIG, type AxisConfig, type AxisPoint } from "@/lib/interop-topic-axis";

const S = 36;
const MAXH = 26;
const CENTER_Y = MAXH / 2;
const TOPIC_BY_NO = new Map(INTEROP_PRIORITY_TOPICS.map((t) => [t.no, t]));

const MAJOR_EMOJI: Record<string, string> = { A: "🤖", B: "📊", C: "🛡️", D: "🌈", E: "🏫", F: "📚" };

type Axis3 = { label: string; values: Record<number, number> };
type Edge = { a: number; b: number; weight: number };

// 2Dマップ(InteropBackdrop)と同じ時間帯の空グラデーションを背景に使う（宇宙感は出さない）。
type Period = "dawn" | "day" | "dusk" | "night";
function periodFromHour(h: number): Period {
  if (h >= 4 && h < 5) return "dusk";
  if (h >= 5 && h < 10) return "dawn";
  if (h >= 10 && h < 15) return "day";
  if (h >= 15 && h < 17) return "dusk";
  return "night";
}
const SKY: Record<Period, string> = {
  dawn: "linear-gradient(180deg, #1b2350 0%, #3a2f63 38%, #7d4a72 62%, #c9737a 80%, #f0a878 92%, #f7c98b 100%)",
  day: "linear-gradient(180deg, #1f4ea0 0%, #2f6bc0 40%, #4f93d8 72%, #8fc1ea 100%)",
  dusk: "linear-gradient(180deg, #1a1f4a 0%, #45285f 32%, #8a3a63 54%, #d65a4e 74%, #f0894a 88%, #f6b35f 100%)",
  night: "linear-gradient(180deg, #05060f 0%, #070b1e 45%, #0b1030 75%, #121641 100%)",
};

function splitPoles(label: string): [string, string] {
  const parts = label.split(/↔|⇔|<->|〜|~|→|↑/).map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) return [parts[0], parts[1]];
  return ["", label.trim()];
}
// 「巡回待ち」など未確定ラベルは第3軸ラベルを出さない
function isRealAxis3(label: string): boolean {
  const t = label.trim();
  return t.length > 0 && t !== "巡回待ち" && t.includes("↔");
}

const axisLabelStyle: React.CSSProperties = {
  whiteSpace: "nowrap", fontSize: 12, fontWeight: 800, color: "#fff",
  background: "rgba(6,12,28,0.78)", border: "1px solid rgba(150,180,255,0.4)", borderRadius: 6, padding: "2px 8px",
  textShadow: "0 1px 2px rgba(0,0,0,0.6)", boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
};

function nodeSize(posts: number): number {
  return 0.72 + Math.min(0.95, posts * 0.055);
}

function jitter(no: number): [number, number, number] {
  const fr = (x: number) => { const v = Math.sin(x) * 43758.5453; return v - Math.floor(v); };
  return [(fr(no * 12.99) - 0.5) * 6, (fr(no * 78.23) - 0.5) * 7, (fr(no * 39.42) - 0.5) * 6];
}

// 縁が光る fresnel（控えめ）
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

function NodeLabel({ color, emoji, title, posts, hover }: { color: string; emoji: string; title: string; posts: number; hover: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, pointerEvents: "none" }}>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
        padding: "3px 10px 3px 4px", borderRadius: 10, fontSize: hover ? 12.5 : 11, fontWeight: 700, color: "#fff",
        background: hover ? "rgba(8,14,32,0.95)" : "rgba(8,14,32,0.8)", border: `1px solid ${color}${hover ? "cc" : "99"}`,
        boxShadow: "0 3px 12px rgba(0,0,0,0.5)", textShadow: "0 1px 2px rgba(0,0,0,0.65)",
      }}>
        <span style={{ display: "grid", placeItems: "center", width: hover ? 20 : 18, height: hover ? 20 : 18, borderRadius: 6, fontSize: hover ? 12 : 10.5, background: `${color}40` }}>{emoji}</span>
        <span>{title}</span>
      </div>
      {posts > 0 && (
        <span style={{ fontSize: 9.5, fontWeight: 800, color: "#06101f", lineHeight: 1.2, padding: "1px 7px", borderRadius: 999, background: color }}>{posts}件</span>
      )}
    </div>
  );
}

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
      <mesh scale={hover ? 1.12 : 1} onPointerOver={(e) => { e.stopPropagation(); enter(); }} onPointerOut={leave} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        <sphereGeometry args={[r, 48, 48]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={hover ? 0.55 : 0.35} roughness={0.45} metalness={0.1} />
      </mesh>
      <Atmosphere color={color} radius={r * 1.28} power={3.0} intensity={hover ? 1.0 : 0.6} />
      <Line points={[[0, 0, 0], [0, dropToPlane, 0]]} color={color} lineWidth={1} transparent opacity={0.1} dashed dashScale={3} />
      {/* ラベルは occlude：他の玉の裏に回ったら隠れて重なりを減らす */}
      <Html center occlude distanceFactor={hover ? 20 : 28} position={[0, r + 1.4, 0]} zIndexRange={[hover ? 40 : 16, 2]} style={{ pointerEvents: "none" }}>
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
      {segments.map((s) => (<Line key={s.key} points={[s.a, s.b]} color="#9fb6ff" lineWidth={1} transparent opacity={0.18} />))}
    </group>
  );
}

function AxisFrame({ config, axis3Low, axis3High, showAxis3 }: { config: AxisConfig; axis3Low: string; axis3High: string; showAxis3: boolean }) {
  const axis = "#8fb0ec";
  const v3 = "#9fd0ff";
  const cy = CENTER_Y;
  return (
    <group>
      <Line points={[[-S, cy, 0], [S, cy, 0]]} color={axis} lineWidth={1.5} transparent opacity={0.55} />
      <Line points={[[0, cy, S], [0, cy, -S]]} color={axis} lineWidth={1.5} transparent opacity={0.55} />
      <mesh raycast={() => null} position={[0, cy, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.4, 3.6, 64]} />
        <meshBasicMaterial color="#9fd0ff" transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <Html center occlude position={[S + 4, cy, 0]} style={{ pointerEvents: "none" }}><div style={axisLabelStyle}>{config.xRight} →</div></Html>
      <Html center occlude position={[-S - 4, cy, 0]} style={{ pointerEvents: "none" }}><div style={axisLabelStyle}>← {config.xLeft}</div></Html>
      <Html center occlude position={[0, cy, -S - 4]} style={{ pointerEvents: "none" }}><div style={axisLabelStyle}>{config.yTop} ↑</div></Html>
      <Html center occlude position={[0, cy, S + 4]} style={{ pointerEvents: "none" }}><div style={axisLabelStyle}>{config.yBottom} ↓</div></Html>
      {showAxis3 && <Line points={[[0, 0, 0], [0, MAXH, 0]]} color={v3} lineWidth={1.5} transparent opacity={0.45} />}
      {showAxis3 && axis3High && (
        <Html center occlude position={[0, MAXH + 1.6, 0]} style={{ pointerEvents: "none" }}><div style={{ ...axisLabelStyle, color: "#eaf6ff", borderColor: "rgba(150,200,255,0.6)" }}>{axis3High} ↑</div></Html>
      )}
      {showAxis3 && axis3Low && (
        <Html center occlude position={[0, -1.6, 0]} style={{ pointerEvents: "none" }}><div style={{ ...axisLabelStyle, color: "#eaf6ff", borderColor: "rgba(150,200,255,0.5)" }}>↓ {axis3Low}</div></Html>
      )}
    </group>
  );
}

function CenterHub({ label, onSelect }: { label: string; onSelect: () => void }) {
  const [hover, setHover] = useState(false);
  const enter = () => { setHover(true); document.body.style.cursor = "pointer"; };
  const leave = () => { setHover(false); document.body.style.cursor = "auto"; };
  const select = (e?: { stopPropagation?: () => void }) => { e?.stopPropagation?.(); onSelect(); };
  return (
    <group position={[0, CENTER_Y, 0]}>
      <mesh scale={hover ? 1.06 : 1} onPointerOver={(e) => { e.stopPropagation(); enter(); }} onPointerOut={leave} onClick={(e) => select(e)}>
        <sphereGeometry args={[2.2, 48, 48]} />
        <meshStandardMaterial color="#f3f7ff" emissive="#b9d2ff" emissiveIntensity={hover ? 0.7 : 0.5} roughness={0.4} metalness={0.2} />
      </mesh>
      <Atmosphere color="#bcd6ff" radius={3.0} power={2.4} intensity={hover ? 1.2 : 0.8} />
      <mesh raycast={() => null} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.8, 2.95, 64]} />
        <meshBasicMaterial color="#bcd6ff" transparent opacity={0.4} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <Html center distanceFactor={hover ? 24 : 32} position={[0, 3.6, 0]} zIndexRange={[60, 40]} style={{ pointerEvents: "auto" }}>
        <button type="button" onMouseEnter={enter} onMouseLeave={leave} onClick={(e) => select(e)}
          style={{ cursor: "pointer", appearance: "none", whiteSpace: "nowrap", fontSize: 13, fontWeight: 800, color: "#fff", background: "rgba(8,14,32,0.86)", border: "1px solid #bcd6ffcc", borderRadius: 999, padding: "4px 12px", boxShadow: "0 2px 12px rgba(0,0,0,0.45)" }}>
          🎫 {label}
        </button>
      </Html>
    </group>
  );
}

function Controls() {
  return (
    <OrbitControls makeDefault enablePan screenSpacePanning minDistance={16} maxDistance={180} maxPolarAngle={Math.PI * 0.9} target={[0, CENTER_Y, 0]} enableDamping dampingFactor={0.08} />
  );
}

function Scene({ centerLabel, config, positions, axis3, edges, counts, onSelectCenter, onSelectTopic }: {
  centerLabel: string; config: AxisConfig; positions: Record<number, AxisPoint>; axis3: Axis3; edges: Edge[]; counts: Map<string, number>;
  onSelectCenter: () => void; onSelectTopic: (t: InteropPriorityTopic) => void;
}) {
  const [axis3Low, axis3High] = useMemo(() => splitPoles(axis3.label), [axis3.label]);
  const showAxis3 = isRealAxis3(axis3.label);

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
      <ambientLight intensity={0.9} />
      <hemisphereLight args={["#dbe7ff", "#24304f", 0.6]} />
      <directionalLight position={[24, 40, 24]} intensity={0.9} color="#ffffff" />
      <directionalLight position={[-22, -10, -18]} intensity={0.3} color="#bcd0ff" />
      <AxisFrame config={config} axis3Low={axis3Low} axis3High={axis3High} showAxis3={showAxis3} />
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
  const period = useMemo(() => periodFromHour(new Date().getHours()), []);

  return (
    <div className="absolute inset-0">
      {/* 2Dと同じ時間帯の空（宇宙感なし）。Canvasは透過して前面に重ねる。 */}
      <div className="absolute inset-0" style={{ background: SKY[period] }} />
      <Canvas camera={{ position: [46, 40, 58], fov: 46 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }} style={{ background: "transparent" }}>
        <Scene centerLabel={label} config={config} positions={positions} axis3={axis3} edges={edges} counts={counts} onSelectCenter={onSelectCenter} onSelectTopic={onSelectTopic} />
      </Canvas>
      <p className="pointer-events-none absolute bottom-4 left-4 z-40 text-[11px] leading-relaxed text-white/55">
        ドラッグで回転・<span className="text-white/80">Shift+ドラッグで移動</span>・ホイールで拡大／玉の大きさ＝活発さ・高さ＝週次AI巡回の分析軸
      </p>
    </div>
  );
}
