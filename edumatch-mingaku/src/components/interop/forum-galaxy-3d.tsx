"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { Html, OrbitControls, Line } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { INTEROP_PRIORITY_TOPICS, MAJOR_META, type InteropPriorityTopic } from "@/lib/interop-priority-topics";
import { DEFAULT_AXIS_CONFIG, type AxisConfig, type AxisPoint } from "@/lib/interop-topic-axis";
import { KaikanHubOrbit } from "./kaikan-hub-overlay";

// -1..1 の軸座標 → ワールド座標のスケール（広めに取って玉の重なりを避ける）
const S = 26;
// 第3軸（高さ）の最大値（axis3 値 0..1 → 0..MAXH）
const MAXH = 18;
// 2軸平面と中心ハブは縦の中点に置く（＝起点）。ノードは中点の上下に分布。
const CENTER_Y = MAXH / 2;
const TOPIC_BY_NO = new Map(INTEROP_PRIORITY_TOPICS.map((t) => [t.no, t]));

const MAJOR_EMOJI: Record<string, string> = {
  A: "🤖", B: "📊", C: "🛡️", D: "🌈", E: "🏫", F: "📚",
};

type Axis3 = { label: string; values: Record<number, number> };
type Edge = { a: number; b: number; weight: number };

/** "個別化 ↔ 標準化" のような両極ラベルを [低, 高] に分割。 */
function splitPoles(label: string): [string, string] {
  const parts = label.split(/↔|⇔|<->|〜|~|→|↑/).map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) return [parts[0], parts[1]];
  return ["", label.trim()];
}

const axisLabelStyle: React.CSSProperties = {
  whiteSpace: "nowrap",
  fontSize: 12,
  fontWeight: 800,
  color: "rgba(220,232,255,0.92)",
  background: "rgba(6,9,26,0.62)",
  border: "1px solid rgba(150,175,255,0.26)",
  borderRadius: 6,
  padding: "2px 8px",
};

// 活発さ（投稿数）＝玉の大きさ。
function nodeSize(posts: number): number {
  return 0.66 + Math.min(1.0, posts * 0.06);
}

/** カテゴリ名ラベル＋（あれば）件数バッジ。2Dマップに表記を揃える。 */
function NodeChip({ color, emoji, title, posts, hover }: { color: string; emoji: string; title: string; posts: number; hover: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <div
        style={{
          display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
          padding: "3px 10px 3px 4px", borderRadius: 10,
          fontSize: hover ? 12.5 : 11, fontWeight: 700, color: "#fff",
          background: "rgba(8,11,30,0.78)", border: `1px solid ${color}88`,
          boxShadow: "0 3px 12px rgba(0,0,0,0.4)", textShadow: "0 1px 2px rgba(0,0,0,0.6)",
        }}
      >
        <span style={{ display: "grid", placeItems: "center", width: hover ? 20 : 18, height: hover ? 20 : 18, borderRadius: 6, fontSize: hover ? 12 : 10.5, background: `${color}33` }}>{emoji}</span>
        <span>{title}</span>
      </div>
      {posts > 0 && (
        <span style={{
          fontSize: 9.5, fontWeight: 800, color: "#fff", lineHeight: 1.2,
          padding: "1px 7px", borderRadius: 999,
          background: color, border: "1px solid rgba(255,255,255,0.55)",
          boxShadow: "0 2px 6px rgba(0,0,0,0.45)",
        }}>{posts}件</span>
      )}
    </div>
  );
}

/** 1トピックの点（ソフトなマット球＋クリック可能なラベル）。 */
function TopicNode({ topic, posts, position, onSelect }: { topic: InteropPriorityTopic; posts: number; position: [number, number, number]; onSelect: () => void }) {
  const [hover, setHover] = useState(false);
  const color = MAJOR_META[topic.major]?.color ?? "#C9D4F6";
  const emoji = MAJOR_EMOJI[topic.major] ?? "✨";
  const r = nodeSize(posts);
  // 中心平面（CENTER_Y）への垂線の長さ（ローカル座標）
  const dropToPlane = CENTER_Y - position[1];
  const enter = () => { setHover(true); document.body.style.cursor = "pointer"; };
  const leave = () => { setHover(false); document.body.style.cursor = "auto"; };
  return (
    <group position={position}>
      {/* 透明な当たり判定 */}
      <mesh onPointerOver={(e) => { e.stopPropagation(); enter(); }} onPointerOut={leave} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        <sphereGeometry args={[r * 1.25, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* 本体：ソフトなマット球（光沢・膜なし） */}
      <mesh raycast={() => null} scale={hover ? 1.1 : 1}>
        <sphereGeometry args={[r, 48, 48]} />
        <meshStandardMaterial color={color} roughness={0.92} metalness={0} />
      </mesh>
      {/* 左上のごく淡いハイライト */}
      <mesh raycast={() => null} position={[-r * 0.32, r * 0.36, r * 0.55]}>
        <sphereGeometry args={[r * 0.34, 24, 24]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={hover ? 0.18 : 0.12} depthWrite={false} />
      </mesh>
      {/* 中心平面への細い垂線（上下どちらでも面に接続） */}
      <Line points={[[0, 0, 0], [0, dropToPlane, 0]]} color={color} lineWidth={1} transparent opacity={0.14} dashed dashScale={3} />
      {/* タイトル＋件数 */}
      <Html center distanceFactor={hover ? 17 : 24} position={[0, r + 0.9, 0]} zIndexRange={[16, 2]} style={{ pointerEvents: "auto" }}>
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
      {segments.map((s) => (<Line key={s.key} points={[s.a, s.b]} color="#9fb6ff" lineWidth={1} transparent opacity={0.12} />))}
    </group>
  );
}

/** 2軸（X/Z 十字線）を中央(CENTER_Y)に。第3軸は縦・上下に伸ばし両端ラベル。地面グリッドは無し。 */
function AxisFrame({ config, axis3Low, axis3High }: { config: AxisConfig; axis3Low: string; axis3High: string }) {
  const axis = "#6d83c8";
  const v3 = "#7fd6ff";
  const cy = CENTER_Y;
  return (
    <group>
      {/* X軸（中央平面上） */}
      <Line points={[[-S, cy, 0], [S, cy, 0]]} color={axis} lineWidth={1.25} transparent opacity={0.6} />
      {/* Z軸（中央平面上） */}
      <Line points={[[0, cy, S], [0, cy, -S]]} color={axis} lineWidth={1.25} transparent opacity={0.6} />
      {/* 起点リング（中心平面） */}
      <mesh raycast={() => null} position={[0, cy, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.0, 3.18, 64]} />
        <meshBasicMaterial color="#9db8ff" transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <Html center position={[S + 3, cy, 0]} style={{ pointerEvents: "none" }}><div style={axisLabelStyle}>{config.xRight} →</div></Html>
      <Html center position={[-S - 3, cy, 0]} style={{ pointerEvents: "none" }}><div style={axisLabelStyle}>← {config.xLeft}</div></Html>
      <Html center position={[0, cy, -S - 3]} style={{ pointerEvents: "none" }}><div style={axisLabelStyle}>{config.yTop} ↑</div></Html>
      <Html center position={[0, cy, S + 3]} style={{ pointerEvents: "none" }}><div style={axisLabelStyle}>{config.yBottom} ↓</div></Html>
      {/* 第3軸（縦）：上下に対の項目 */}
      <Line points={[[0, 0, 0], [0, MAXH, 0]]} color={v3} lineWidth={1.5} transparent opacity={0.55} />
      <Html center position={[0, MAXH + 1.6, 0]} style={{ pointerEvents: "none" }}>
        <div style={{ ...axisLabelStyle, color: "#d6f3ff", borderColor: "rgba(127,214,255,0.5)", background: "rgba(6,16,30,0.66)" }}>{axis3High || "（巡回待ち）"} ↑</div>
      </Html>
      {axis3Low && (
        <Html center position={[0, -1.6, 0]} style={{ pointerEvents: "none" }}>
          <div style={{ ...axisLabelStyle, color: "#d6f3ff", borderColor: "rgba(127,214,255,0.4)", background: "rgba(6,16,30,0.6)" }}>↓ {axis3Low}</div>
        </Html>
      )}
    </group>
  );
}

/** 中心ハブ（議員会館）＝3軸の交点（起点）。クリックでサブオービット表示。 */
function CenterHub({ label, onSelect }: { label: string; onSelect: () => void }) {
  const [hover, setHover] = useState(false);
  const enter = () => { setHover(true); document.body.style.cursor = "pointer"; };
  const leave = () => { setHover(false); document.body.style.cursor = "auto"; };
  const select = (e?: { stopPropagation?: () => void }) => { e?.stopPropagation?.(); onSelect(); };
  return (
    <group position={[0, CENTER_Y, 0]}>
      <mesh onPointerOver={(e) => { e.stopPropagation(); enter(); }} onPointerOut={leave} onClick={(e) => select(e)}>
        <sphereGeometry args={[2.6, 20, 20]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* 本体：起点を示すやや大きめの淡発光マット球 */}
      <mesh raycast={() => null} scale={hover ? 1.08 : 1}>
        <sphereGeometry args={[1.9, 48, 48]} />
        <meshStandardMaterial color="#eaf0ff" roughness={0.7} metalness={0} emissive="#9db8ff" emissiveIntensity={hover ? 0.5 : 0.32} />
      </mesh>
      <mesh raycast={() => null} position={[-0.6, 0.66, 0.9]}>
        <sphereGeometry args={[0.5, 24, 24]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.16} depthWrite={false} />
      </mesh>
      <Html center distanceFactor={hover ? 21 : 28} position={[0, 3, 0]} zIndexRange={[60, 40]} style={{ pointerEvents: "auto" }}>
        <button type="button" onMouseEnter={enter} onMouseLeave={leave} onClick={(e) => select(e)}
          style={{ cursor: "pointer", appearance: "none", whiteSpace: "nowrap", fontSize: 13, fontWeight: 800, color: "#fff", background: "rgba(8,11,30,0.82)", border: "1px solid #9db8ffcc", borderRadius: 999, padding: "4px 12px", boxShadow: "0 4px 14px rgba(0,0,0,0.5)" }}>
          🎫 {label}
        </button>
      </Html>
    </group>
  );
}

/** equirectangular 星雲（Blender製）をシーン背景に。 */
function NebulaBackground() {
  const { scene } = useThree();
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load("/3d/nebula.jpg", (tex) => {
      tex.mapping = THREE.EquirectangularReflectionMapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      scene.background = tex;
      // 玉が埋もれないよう背景を控えめに
      (scene as THREE.Scene & { backgroundIntensity?: number }).backgroundIntensity = 0.5;
    });
    return () => { scene.background = null; };
  }, [scene]);
  return null;
}

/** OrbitControls：ドラッグ=回転、Shift+ドラッグ=平行移動、ホイール=ズーム。 */
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
  return (
    <OrbitControls ref={ref} makeDefault enablePan screenSpacePanning minDistance={14} maxDistance={130} maxPolarAngle={Math.PI * 0.86} target={[0, CENTER_Y, 0]} enableDamping dampingFactor={0.08} />
  );
}

function Scene({ centerLabel, config, positions, axis3, edges, counts, onSelectTopic, onSelectCenter }: {
  centerLabel: string; config: AxisConfig; positions: Record<number, AxisPoint>; axis3: Axis3; edges: Edge[]; counts: Map<string, number>;
  onSelectTopic: (t: InteropPriorityTopic) => void; onSelectCenter: () => void;
}) {
  const [axis3Low, axis3High] = useMemo(() => splitPoles(axis3.label), [axis3.label]);

  const nodes = useMemo(() => {
    const out: { topic: InteropPriorityTopic; posts: number; position: [number, number, number] }[] = [];
    for (const [noStr, p] of Object.entries(positions)) {
      const no = Number(noStr);
      const topic = TOPIC_BY_NO.get(no);
      if (!topic) continue;
      const posts = counts.get(topic.roomId) ?? 0;
      // 高さ：第3軸の値(0..1)。0.5＝中心平面、0＝下端、1＝上端（中心対称）。
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
      <NebulaBackground />
      <ambientLight intensity={0.7} />
      <hemisphereLight args={["#cfe0ff", "#0a1228", 0.9]} />
      <directionalLight position={[14, 26, 12]} intensity={0.85} color="#ffffff" />
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

export default function ForumGalaxy3D({ centerLabel }: { centerLabel?: string }) {
  const router = useRouter();
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [config, setConfig] = useState<AxisConfig>(DEFAULT_AXIS_CONFIG);
  const [positions, setPositions] = useState<Record<number, AxisPoint>>({});
  const [axis3, setAxis3] = useState<Axis3>({ label: "巡回待ち", values: {} });
  const [edges, setEdges] = useState<Edge[]>([]);
  const [hubOpen, setHubOpen] = useState(false);

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
        <Scene
          centerLabel={label} config={config} positions={positions} axis3={axis3} edges={edges} counts={counts}
          onSelectTopic={(t) => { if (t.roomId) router.push(`/forum/${t.roomId}?from=interop`); }}
          onSelectCenter={() => setHubOpen(true)}
        />
      </Canvas>

      {/* 中心ハブ＝議員会館。クリックで 2D 同等のサブオービット（カテゴリ→コンテンツ→申込） */}
      <KaikanHubOrbit open={hubOpen} label={label} onClose={() => setHubOpen(false)} />

      <p className="pointer-events-none absolute bottom-4 left-4 z-40 text-[11px] leading-relaxed text-white/45">
        ドラッグで回転・<span className="text-white/70">Shift+ドラッグで移動</span>・ホイールで拡大／玉の大きさ＝活発さ・高さ＝週次AI巡回の分析軸
      </p>
    </div>
  );
}
