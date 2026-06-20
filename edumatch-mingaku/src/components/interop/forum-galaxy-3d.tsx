"use client";

import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, Line, Stars } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { INTEROP_PRIORITY_TOPICS, MAJOR_META, type InteropPriorityTopic } from "@/lib/interop-priority-topics";
import { DEFAULT_AXIS_CONFIG, type AxisConfig, type AxisPoint } from "@/lib/interop-topic-axis";

const S = 26;
const MAXH = 18;
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

const axisLabelStyle: React.CSSProperties = {
  whiteSpace: "nowrap", fontSize: 12, fontWeight: 800, color: "rgba(190,225,255,0.85)",
  background: "rgba(4,10,24,0.5)", border: "1px solid rgba(120,200,255,0.3)", borderRadius: 6, padding: "2px 8px",
};

function nodeSize(posts: number): number {
  return 0.7 + Math.min(1.05, posts * 0.06);
}

// ── 大気グロー（fresnel）：惑星の縁が光るスターウォーズ風 ──
const ATMO_VERT = `
varying vec3 vN; varying vec3 vP;
void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vP = mv.xyz; gl_Position = projectionMatrix * mv; }
`;
const ATMO_FRAG = `
uniform vec3 uColor; uniform float uPower; uniform float uIntensity;
varying vec3 vN; varying vec3 vP;
void main(){ vec3 v = normalize(-vP); float f = pow(1.0 - abs(dot(vN, v)), uPower); gl_FragColor = vec4(uColor * uIntensity, f); }
`;
function Atmosphere({ color, radius, power = 2.4, intensity = 1.1 }: { color: string; radius: number; power?: number; intensity?: number }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: ATMO_VERT, fragmentShader: ATMO_FRAG,
    uniforms: { uColor: { value: new THREE.Color(color) }, uPower: { value: power }, uIntensity: { value: intensity } },
    transparent: true, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false,
  }), [color, power, intensity]);
  return (
    <mesh raycast={() => null} material={mat}>
      <sphereGeometry args={[radius, 32, 32]} />
    </mesh>
  );
}

function NodeChip({ color, emoji, title, posts, hover }: { color: string; emoji: string; title: string; posts: number; hover: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
        padding: "3px 10px 3px 4px", borderRadius: 10, fontSize: hover ? 12.5 : 11, fontWeight: 700, color: "#eaf4ff",
        background: "rgba(6,12,28,0.7)", border: `1px solid ${color}99`,
        boxShadow: `0 0 12px ${color}40, 0 3px 12px rgba(0,0,0,0.4)`, textShadow: "0 1px 2px rgba(0,0,0,0.6)",
      }}>
        <span style={{ display: "grid", placeItems: "center", width: hover ? 20 : 18, height: hover ? 20 : 18, borderRadius: 6, fontSize: hover ? 12 : 10.5, background: `${color}30` }}>{emoji}</span>
        <span>{title}</span>
      </div>
      {posts > 0 && (
        <span style={{ fontSize: 9.5, fontWeight: 800, color: "#04101f", lineHeight: 1.2, padding: "1px 7px", borderRadius: 999, background: color, boxShadow: `0 0 10px ${color}aa` }}>{posts}件</span>
      )}
    </div>
  );
}

/** 1トピック＝発光する惑星オーブ（本体＋大気グロー）。 */
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
      <mesh onPointerOver={(e) => { e.stopPropagation(); enter(); }} onPointerOut={leave} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        <sphereGeometry args={[r * 1.4, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* 惑星本体 */}
      <mesh raycast={() => null} scale={hover ? 1.08 : 1}>
        <sphereGeometry args={[r, 48, 48]} />
        <meshStandardMaterial color={color} roughness={0.55} metalness={0.15} emissive={color} emissiveIntensity={hover ? 0.5 : 0.32} />
      </mesh>
      {/* 大気グロー（fresnelの縁光） */}
      <Atmosphere color={color} radius={r * 1.32} power={2.6} intensity={hover ? 1.5 : 1.05} />
      {/* 中心平面への細い垂線 */}
      <Line points={[[0, 0, 0], [0, dropToPlane, 0]]} color={color} lineWidth={1} transparent opacity={0.12} dashed dashScale={3} />
      <Html center distanceFactor={hover ? 17 : 24} position={[0, r + 1.0, 0]} zIndexRange={[16, 2]} style={{ pointerEvents: "auto" }}>
        <button type="button" onMouseEnter={enter} onMouseLeave={leave} onClick={(e) => { e.stopPropagation(); onSelect(); }} style={{ cursor: "pointer", appearance: "none", background: "none", border: "none", padding: 0 }}>
          <NodeChip color={color} emoji={emoji} title={topic.category} posts={posts} hover={hover} />
        </button>
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
      {segments.map((s) => (<Line key={s.key} points={[s.a, s.b]} color="#5fd0ff" lineWidth={1} transparent opacity={0.22} />))}
    </group>
  );
}

/** 2軸（X/Z）をホログラム調で中央(CENTER_Y)に。第3軸は縦・両端ラベル。 */
function AxisFrame({ config, axis3Low, axis3High }: { config: AxisConfig; axis3Low: string; axis3High: string }) {
  const axis = "#3f7fd0";
  const v3 = "#5fd0ff";
  const cy = CENTER_Y;
  return (
    <group>
      <Line points={[[-S, cy, 0], [S, cy, 0]]} color={axis} lineWidth={1.25} transparent opacity={0.5} />
      <Line points={[[0, cy, S], [0, cy, -S]]} color={axis} lineWidth={1.25} transparent opacity={0.5} />
      <mesh raycast={() => null} position={[0, cy, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.0, 3.16, 64]} />
        <meshBasicMaterial color="#5fd0ff" transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <Html center position={[S + 3, cy, 0]} style={{ pointerEvents: "none" }}><div style={axisLabelStyle}>{config.xRight} →</div></Html>
      <Html center position={[-S - 3, cy, 0]} style={{ pointerEvents: "none" }}><div style={axisLabelStyle}>← {config.xLeft}</div></Html>
      <Html center position={[0, cy, -S - 3]} style={{ pointerEvents: "none" }}><div style={axisLabelStyle}>{config.yTop} ↑</div></Html>
      <Html center position={[0, cy, S + 3]} style={{ pointerEvents: "none" }}><div style={axisLabelStyle}>{config.yBottom} ↓</div></Html>
      <Line points={[[0, 0, 0], [0, MAXH, 0]]} color={v3} lineWidth={1.5} transparent opacity={0.5} />
      <Html center position={[0, MAXH + 1.6, 0]} style={{ pointerEvents: "none" }}><div style={{ ...axisLabelStyle, color: "#d6f3ff", borderColor: "rgba(127,214,255,0.5)" }}>{axis3High || "（巡回待ち）"} ↑</div></Html>
      {axis3Low && (
        <Html center position={[0, -1.6, 0]} style={{ pointerEvents: "none" }}><div style={{ ...axisLabelStyle, color: "#d6f3ff", borderColor: "rgba(127,214,255,0.4)" }}>↓ {axis3Low}</div></Html>
      )}
    </group>
  );
}

/** 中心ハブ＝起点の輝く核（スター）。クリックで2Dと同じハブへ。 */
function CenterHub({ label, onSelect }: { label: string; onSelect: () => void }) {
  const [hover, setHover] = useState(false);
  const coreRef = useRef<THREE.Mesh>(null);
  const enter = () => { setHover(true); document.body.style.cursor = "pointer"; };
  const leave = () => { setHover(false); document.body.style.cursor = "auto"; };
  const select = (e?: { stopPropagation?: () => void }) => { e?.stopPropagation?.(); onSelect(); };
  useFrame(({ clock }) => {
    if (coreRef.current) {
      const s = 1 + Math.sin(clock.elapsedTime * 1.6) * 0.04;
      coreRef.current.scale.setScalar((hover ? 1.08 : 1) * s);
    }
  });
  return (
    <group position={[0, CENTER_Y, 0]}>
      <mesh onPointerOver={(e) => { e.stopPropagation(); enter(); }} onPointerOut={leave} onClick={(e) => select(e)}>
        <sphereGeometry args={[2.8, 20, 20]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh ref={coreRef} raycast={() => null}>
        <sphereGeometry args={[1.9, 48, 48]} />
        <meshStandardMaterial color="#eaf4ff" emissive="#a9d2ff" emissiveIntensity={hover ? 1.6 : 1.1} roughness={0.4} metalness={0.2} />
      </mesh>
      <Atmosphere color="#9fd0ff" radius={2.7} power={2.0} intensity={hover ? 1.8 : 1.3} />
      <pointLight position={[0, 0, 0]} intensity={hover ? 40 : 28} distance={40} color="#bfe3ff" />
      <Html center distanceFactor={hover ? 21 : 28} position={[0, 3.2, 0]} zIndexRange={[60, 40]} style={{ pointerEvents: "auto" }}>
        <button type="button" onMouseEnter={enter} onMouseLeave={leave} onClick={(e) => select(e)}
          style={{ cursor: "pointer", appearance: "none", whiteSpace: "nowrap", fontSize: 13, fontWeight: 800, color: "#eaf4ff", background: "rgba(6,12,28,0.78)", border: "1px solid #7fc4ffcc", borderRadius: 999, padding: "4px 12px", boxShadow: "0 0 16px rgba(127,196,255,0.5)" }}>
          🎫 {label}
        </button>
      </Html>
    </group>
  );
}

function Controls() {
  const ref = useRef<any>(null);
  const { gl } = useThree();
  useEffect(() => {
    const c = ref.current;
    if (c) c.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    const el = gl.domElement;
    const onDown = (e: PointerEvent) => { if (ref.current) ref.current.mouseButtons.LEFT = e.shiftKey ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE; };
    el.addEventListener("pointerdown", onDown, { capture: true });
    return () => el.removeEventListener("pointerdown", onDown, { capture: true } as EventListenerOptions);
  }, [gl]);
  return <OrbitControls ref={ref} makeDefault enablePan screenSpacePanning minDistance={14} maxDistance={130} maxPolarAngle={Math.PI * 0.86} target={[0, CENTER_Y, 0]} enableDamping dampingFactor={0.08} />;
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
      const y = (axis3.values[no] ?? 0.5) * MAXH;
      out.push({ topic, posts, position: [p.x * S, y, -p.y * S] });
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
      <color attach="background" args={["#03060f"]} />
      <ambientLight intensity={0.35} />
      <hemisphereLight args={["#9fc4ff", "#06101f", 0.5]} />
      <directionalLight position={[18, 30, 16]} intensity={0.7} color="#dce9ff" />
      {/* 宇宙の星々 */}
      <Stars radius={150} depth={70} count={2200} factor={4} saturation={0} fade speed={0.3} />
      <AxisFrame config={config} axis3Low={axis3Low} axis3High={axis3High} />
      <TopicEdges edges={effectiveEdges} posById={posById} />
      <CenterHub label={centerLabel} onSelect={onSelectCenter} />
      {nodes.map(({ topic, posts, position }) => (
        <TopicNode key={topic.no} topic={topic} posts={posts} position={position} onSelect={() => onSelectTopic(topic)} />
      ))}
      <Controls />
      <EffectComposer multisampling={2}>
        <Bloom intensity={0.9} luminanceThreshold={0.45} luminanceSmoothing={0.85} mipmapBlur radius={0.6} />
      </EffectComposer>
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
      <Canvas camera={{ position: [0, 15, 50], fov: 48 }} dpr={[1, 2]} gl={{ antialias: true }}>
        <Scene centerLabel={label} config={config} positions={positions} axis3={axis3} edges={edges} counts={counts} onSelectCenter={onSelectCenter} onSelectTopic={onSelectTopic} />
      </Canvas>
      <p className="pointer-events-none absolute bottom-4 left-4 z-40 text-[11px] leading-relaxed text-white/45">
        ドラッグで回転・<span className="text-white/70">Shift+ドラッグで移動</span>・ホイールで拡大／玉の大きさ＝活発さ・高さ＝週次AI巡回の分析軸
      </p>
    </div>
  );
}
