"use client";

import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls, Line, Stars } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { INTEROP_PRIORITY_TOPICS, MAJOR_META, type InteropPriorityTopic } from "@/lib/interop-priority-topics";
import { DEFAULT_AXIS_CONFIG, type AxisConfig, type AxisPoint } from "@/lib/interop-topic-axis";

// -1..1 の軸座標 → ワールド座標のスケール
const S = 18;
// 第3軸（高さ）の最大値（axis3 値 0..1 → 0..MAXH）
const MAXH = 15;
const TOPIC_BY_NO = new Map(INTEROP_PRIORITY_TOPICS.map((t) => [t.no, t]));

type Axis3 = { label: string; values: Record<number, number> };
type Edge = { a: number; b: number; weight: number };

const labelStyle = (color: string, size = 11): React.CSSProperties => ({
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

function nodeSize(posts: number): number {
  return 0.55 + Math.min(0.7, posts * 0.05);
}

/** 1トピックの点（小さな発光球＋クリック可能なDOMラベル）。 */
function TopicNode({ topic, posts, position, onSelect }: { topic: InteropPriorityTopic; posts: number; position: [number, number, number]; onSelect: () => void }) {
  const [hover, setHover] = useState(false);
  const color = MAJOR_META[topic.major]?.color ?? "#C9D4F6";
  const r = nodeSize(posts);
  const enter = () => { setHover(true); document.body.style.cursor = "pointer"; };
  const leave = () => { setHover(false); document.body.style.cursor = "auto"; };
  return (
    <group position={position}>
      {/* 広めの透明当たり判定 */}
      <mesh onPointerOver={(e) => { e.stopPropagation(); enter(); }} onPointerOut={leave} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        <sphereGeometry args={[Math.max(1.3, r * 2.4), 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* 本体（落ち着いた発光。強すぎないemissive＋薄いリム） */}
      <mesh raycast={() => null} scale={hover ? 1.25 : 1}>
        <sphereGeometry args={[r, 24, 24]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={hover ? 0.8 : 0.4} roughness={0.45} metalness={0.05} />
      </mesh>
      <mesh raycast={() => null} scale={hover ? 1.7 : 1.45}>
        <sphereGeometry args={[r, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={hover ? 0.18 : 0.1} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      {/* 3軸ON時：プロット面への垂線 */}
      {position[1] > 0.01 && (
        <Line points={[[0, 0, 0], [0, -position[1], 0]]} color={color} lineWidth={1} transparent opacity={0.25} dashed dashScale={3} />
      )}
      {/* タイトル＝クリックボタン（確実に押せる主手段） */}
      <Html center distanceFactor={hover ? 16 : 22} position={[0, r + 0.7, 0]} zIndexRange={[16, 2]} style={{ pointerEvents: "auto" }}>
        <button
          type="button"
          onMouseEnter={enter}
          onMouseLeave={leave}
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          style={{ ...labelStyle(color, hover ? 12 : 10.5), cursor: "pointer", appearance: "none" }}
        >
          {topic.category}{posts > 0 ? ` · ${posts}` : ""}
        </button>
      </Html>
    </group>
  );
}

/** トピック間の「内容ベース関連」を結ぶ接続線（星座のように）。 */
function TopicEdges({ edges, posById }: { edges: Edge[]; posById: Map<number, [number, number, number]> }) {
  const segments = useMemo(() => {
    const out: { key: string; a: [number, number, number]; b: [number, number, number] }[] = [];
    for (const e of edges) {
      const a = posById.get(e.a);
      const b = posById.get(e.b);
      if (a && b) out.push({ key: `${e.a}-${e.b}`, a, b });
    }
    return out;
  }, [edges, posById]);
  return (
    <group>
      {segments.map((s) => (
        <Line key={s.key} points={[s.a, s.b]} color="#9fb6ff" lineWidth={1} transparent opacity={0.16} />
      ))}
    </group>
  );
}

/** 2軸（地面の十字＋グリッド＋ラベル）と、3軸ON時の縦軸。 */
function AxisFrame({ config, threeAxis, axis3Label }: { config: AxisConfig; threeAxis: boolean; axis3Label: string }) {
  const grid = "#2a3566";
  const axis = "#6f86d6";
  return (
    <group>
      <gridHelper args={[S * 2, 16, grid, "#1c2444"]} position={[0, 0, 0]} />
      {/* X軸 */}
      <Line points={[[-S, 0, 0], [S, 0, 0]]} color={axis} lineWidth={1.5} />
      {/* Z軸（axis_y を Z にマップ。+y を奥へ） */}
      <Line points={[[0, 0, S], [0, 0, -S]]} color={axis} lineWidth={1.5} />
      <Html center position={[S + 2.5, 0, 0]} style={{ pointerEvents: "none" }}><div style={axisLabelStyle}>{config.xRight} →</div></Html>
      <Html center position={[-S - 2.5, 0, 0]} style={{ pointerEvents: "none" }}><div style={axisLabelStyle}>← {config.xLeft}</div></Html>
      <Html center position={[0, 0, -S - 2.5]} style={{ pointerEvents: "none" }}><div style={axisLabelStyle}>{config.yTop} ↑</div></Html>
      <Html center position={[0, 0, S + 2.5]} style={{ pointerEvents: "none" }}><div style={axisLabelStyle}>{config.yBottom} ↓</div></Html>
      {threeAxis && (
        <>
          <Line points={[[0, 0, 0], [0, MAXH + 1, 0]]} color="#7fd6ff" lineWidth={1.5} />
          <Html center position={[0, MAXH + 2, 0]} style={{ pointerEvents: "none" }}><div style={{ ...axisLabelStyle, color: "#bfeaff", borderColor: "rgba(127,214,255,0.5)" }}>{axis3Label} ↑</div></Html>
        </>
      )}
    </group>
  );
}

/** 中心ハブ（議員会館）。クリックでハブのコンテンツへ。 */
function CenterHub({ label, onSelect }: { label: string; onSelect: () => void }) {
  const [hover, setHover] = useState(false);
  const enter = () => { setHover(true); document.body.style.cursor = "pointer"; };
  const leave = () => { setHover(false); document.body.style.cursor = "auto"; };
  const select = (e?: { stopPropagation?: () => void }) => { e?.stopPropagation?.(); onSelect(); };
  return (
    <group position={[0, 1.6, 0]}>
      {/* 広めの透明当たり判定（確実に押せるよう大きめ） */}
      <mesh onPointerOver={(e) => { e.stopPropagation(); enter(); }} onPointerOut={leave} onClick={(e) => select(e)}>
        <sphereGeometry args={[3, 20, 20]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh raycast={() => null} scale={hover ? 1.12 : 1}>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshStandardMaterial color="#eaf2ff" emissive="#9db8ff" emissiveIntensity={hover ? 1.1 : 0.7} roughness={0.3} />
      </mesh>
      <mesh raycast={() => null} scale={1.6}>
        <sphereGeometry args={[1.5, 20, 20]} />
        <meshBasicMaterial color="#9db8ff" transparent opacity={0.14} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      <Html center distanceFactor={hover ? 20 : 26} position={[0, 2.6, 0]} zIndexRange={[60, 40]} style={{ pointerEvents: "auto" }}>
        <button type="button" onMouseEnter={enter} onMouseLeave={leave} onClick={(e) => select(e)} style={{ ...labelStyle("#9db8ff", 13), cursor: "pointer", appearance: "none", fontWeight: 800 }}>
          {label}
        </button>
      </Html>
    </group>
  );
}

/** OrbitControls：ドラッグ=回転、Shift+ドラッグ=平行移動、ホイール=ズーム。 */
function Controls() {
  const ref = useRef<any>(null);
  useEffect(() => {
    const c = ref.current;
    if (c) {
      c.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    }
    const onDown = (e: KeyboardEvent) => { if (e.key === "Shift" && ref.current) ref.current.mouseButtons.LEFT = THREE.MOUSE.PAN; };
    const onUp = (e: KeyboardEvent) => { if (e.key === "Shift" && ref.current) ref.current.mouseButtons.LEFT = THREE.MOUSE.ROTATE; };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => { window.removeEventListener("keydown", onDown); window.removeEventListener("keyup", onUp); };
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

function Scene({ centerLabel, config, positions, axis3, edges, counts, threeAxis, onSelectTopic, onSelectCenter }: {
  centerLabel: string;
  config: AxisConfig;
  positions: Record<number, AxisPoint>;
  axis3: Axis3;
  edges: Edge[];
  counts: Map<string, number>;
  threeAxis: boolean;
  onSelectTopic: (t: InteropPriorityTopic) => void;
  onSelectCenter: () => void;
}) {
  const nodes = useMemo(() => {
    const out: { topic: InteropPriorityTopic; posts: number; position: [number, number, number] }[] = [];
    for (const [noStr, p] of Object.entries(positions)) {
      const no = Number(noStr);
      const topic = TOPIC_BY_NO.get(no);
      if (!topic) continue;
      const posts = counts.get(topic.roomId) ?? 0;
      const y = threeAxis ? (axis3.values[no] ?? 0) * MAXH : 0;
      out.push({ topic, posts, position: [p.x * S, y, -p.y * S] });
    }
    return out;
  }, [positions, counts, threeAxis, axis3]);

  const posById = useMemo(() => {
    const m = new Map<number, [number, number, number]>();
    for (const n of nodes) m.set(n.topic.no, n.position);
    return m;
  }, [nodes]);

  // 接続線：内容ベースのエッジ（週次Gemma）があれば優先。無ければ「同じ大カテゴリの最近傍同士」を結ぶ（類似カテゴリ接続）。
  const effectiveEdges = useMemo<Edge[]>(() => {
    if (edges.length) return edges;
    const out: Edge[] = [];
    const seen = new Set<string>();
    for (const n of nodes) {
      let best: { no: number; d: number } | null = null;
      for (const m of nodes) {
        if (m.topic.no === n.topic.no || m.topic.major !== n.topic.major) continue;
        const dx = n.position[0] - m.position[0];
        const dz = n.position[2] - m.position[2];
        const d = dx * dx + dz * dz;
        if (!best || d < best.d) best = { no: m.topic.no, d };
      }
      if (best) {
        const a = Math.min(n.topic.no, best.no);
        const b = Math.max(n.topic.no, best.no);
        const k = `${a}-${b}`;
        if (!seen.has(k)) { seen.add(k); out.push({ a, b, weight: 1 }); }
      }
    }
    return out;
  }, [edges, nodes]);

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 20, 10]} intensity={0.5} color="#cdd9ff" />
      {/* 宇宙感（控えめな星空。流れ星・小惑星などは置かない） */}
      <Stars radius={120} depth={50} count={1400} factor={3} saturation={0} fade speed={0.25} />
      <AxisFrame config={config} threeAxis={threeAxis} axis3Label={axis3.label} />
      <TopicEdges edges={effectiveEdges} posById={posById} />
      <CenterHub label={centerLabel} onSelect={onSelectCenter} />
      {nodes.map(({ topic, posts, position }) => (
        <TopicNode key={topic.no} topic={topic} posts={posts} position={position} onSelect={() => onSelectTopic(topic)} />
      ))}
      <Controls />
      <EffectComposer multisampling={0}>
        <Bloom intensity={0.5} luminanceThreshold={0.55} luminanceSmoothing={0.9} mipmapBlur radius={0.5} />
      </EffectComposer>
    </>
  );
}

export default function ForumGalaxy3D({ centerLabel }: { centerLabel?: string }) {
  const router = useRouter();
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [config, setConfig] = useState<AxisConfig>(DEFAULT_AXIS_CONFIG);
  const [positions, setPositions] = useState<Record<number, AxisPoint>>({});
  const [axis3, setAxis3] = useState<Axis3>({ label: "停滞 ↔ 活発", values: {} });
  const [edges, setEdges] = useState<Edge[]>([]);
  const [threeAxis, setThreeAxis] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/interop/axis")
      .then((r) => r.json())
      .then((d: { config?: AxisConfig; positions?: Record<number, AxisPoint>; axis3?: Axis3; edges?: Edge[] }) => {
        if (cancelled) return;
        if (d.config) setConfig(d.config);
        if (d.positions && Object.keys(d.positions).length) setPositions(d.positions);
        if (d.axis3) setAxis3({ label: d.axis3.label ?? "停滞 ↔ 活発", values: d.axis3.values ?? {} });
        if (Array.isArray(d.edges)) setEdges(d.edges);
      })
      .catch(() => {});
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

  return (
    <div className="absolute inset-0">
      <Canvas camera={{ position: [0, 20, 34], fov: 50 }} dpr={[1, 1.6]} gl={{ antialias: true }}>
        <color attach="background" args={["#070a18"]} />
        <Scene
          centerLabel={centerLabel?.trim() || "議員会館"}
          config={config}
          positions={positions}
          axis3={axis3}
          edges={edges}
          counts={counts}
          threeAxis={threeAxis}
          onSelectTopic={(t) => { if (t.roomId) router.push(`/forum/${t.roomId}?from=interop`); }}
          onSelectCenter={() => router.push("/forum/kaikan")}
        />
      </Canvas>

      {/* 操作トグル＋ヘルプ */}
      <div className="absolute bottom-4 right-4 z-40 flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => setThreeAxis((v) => !v)}
          className={`rounded-full border px-3 py-1.5 text-xs font-bold backdrop-blur transition ${threeAxis ? "border-sky-300/50 bg-sky-400/20 text-white" : "border-white/15 bg-[#0a1024]/80 text-white/80 hover:text-white"}`}
        >
          {threeAxis ? `◳ 第3軸：ON（${axis3.label}）` : "◰ 第3軸（高さ）：OFF"}
        </button>
      </div>
      <p className="pointer-events-none absolute bottom-4 left-4 z-40 text-[11px] leading-relaxed text-white/45">
        ドラッグで回転・<span className="text-white/70">Shift+ドラッグで移動</span>・ホイールで拡大／玉やタイトルをタップで掲示板へ
      </p>
    </div>
  );
}
