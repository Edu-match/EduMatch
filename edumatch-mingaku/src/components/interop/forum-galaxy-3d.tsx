"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { Html, OrbitControls, Line, Stars } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { INTEROP_PRIORITY_TOPICS, MAJOR_META, type InteropPriorityTopic } from "@/lib/interop-priority-topics";
import { DEFAULT_AXIS_CONFIG, type AxisConfig, type AxisPoint } from "@/lib/interop-topic-axis";
import { KaikanHubOverlay } from "./kaikan-hub-overlay";

// -1..1 の軸座標 → ワールド座標のスケール（広めに取って玉の重なりを避ける）
const S = 26;
// 第3軸（高さ）の最大値（axis3 値 0..1 → 0..MAXH）
const MAXH = 18;
// 中心ハブは常に分布の中央（縦軸の中点）に置く
const CENTER_Y = MAXH / 2;
const TOPIC_BY_NO = new Map(INTEROP_PRIORITY_TOPICS.map((t) => [t.no, t]));

// 大カテゴリ別の絵文字（玉ラベルのアイコン）
const MAJOR_EMOJI: Record<string, string> = {
  A: "🤖", B: "📊", C: "🛡️", D: "🌈", E: "🏫", F: "📚",
};

type Axis3 = { label: string; values: Record<number, number> };
type Edge = { a: number; b: number; weight: number };

/** "個の尊重 ↔ 全体最適" のような両極ラベルを [低, 高] に分割。 */
function splitPoles(label: string): [string, string] {
  const parts = label.split(/↔|⇔|<->|〜|~|→|↑/).map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) return [parts[0], parts[1]];
  return ["", label.trim()];
}

const axisLabelStyle: React.CSSProperties = {
  whiteSpace: "nowrap",
  fontSize: 12,
  fontWeight: 800,
  color: "rgba(214,228,255,0.92)",
  background: "rgba(8,11,32,0.5)",
  border: "1px solid rgba(150,175,255,0.28)",
  borderRadius: 6,
  padding: "2px 8px",
};

// 活発さ（投稿数）＝玉の大きさ。重なりを避けるため控えめに効かせる。
function nodeSize(posts: number): number {
  return 0.62 + Math.min(1.0, posts * 0.06);
}

/** カテゴリ名＋アイコンのクリック可能なラベル（2Dマップに揃える）。 */
function NodeChip({ color, emoji, title, posts, hover }: { color: string; emoji: string; title: string; posts: number; hover: boolean }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        whiteSpace: "nowrap",
        padding: "3px 10px 3px 4px",
        borderRadius: 999,
        fontSize: hover ? 12.5 : 11,
        fontWeight: 800,
        color: "#fff",
        background: "rgba(10,14,34,0.82)",
        border: `1px solid ${color}aa`,
        boxShadow: "0 4px 14px rgba(0,0,0,0.45)",
        textShadow: "0 1px 2px rgba(0,0,0,0.6)",
      }}
    >
      <span
        style={{
          display: "grid",
          placeItems: "center",
          width: hover ? 21 : 18,
          height: hover ? 21 : 18,
          borderRadius: 999,
          fontSize: hover ? 12 : 10.5,
          background: color,
        }}
      >
        {emoji}
      </span>
      <span>{title}</span>
      {posts > 0 && <span style={{ opacity: 0.65, fontWeight: 700, fontSize: hover ? 11 : 9.5 }}>· {posts}</span>}
    </div>
  );
}

/** 1トピックの点（膜なしのクリーンな光沢球＋クリック可能なラベル）。 */
function TopicNode({ topic, posts, position, onSelect }: { topic: InteropPriorityTopic; posts: number; position: [number, number, number]; onSelect: () => void }) {
  const [hover, setHover] = useState(false);
  const color = MAJOR_META[topic.major]?.color ?? "#C9D4F6";
  const emoji = MAJOR_EMOJI[topic.major] ?? "✨";
  const r = nodeSize(posts);
  const enter = () => { setHover(true); document.body.style.cursor = "pointer"; };
  const leave = () => { setHover(false); document.body.style.cursor = "auto"; };
  return (
    <group position={position}>
      {/* 透明な当たり判定 */}
      <mesh onPointerOver={(e) => { e.stopPropagation(); enter(); }} onPointerOut={leave} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        <sphereGeometry args={[r * 1.25, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* 本体：クリアコートのある艶やかな球（発光・膜は付けない） */}
      <mesh raycast={() => null} scale={hover ? 1.12 : 1}>
        <sphereGeometry args={[r, 64, 64]} />
        <meshPhysicalMaterial
          color={color}
          roughness={0.3}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.15}
          emissive={color}
          emissiveIntensity={0.06}
          envMapIntensity={1}
        />
      </mesh>
      {/* 鏡面ハイライト（白点。realな艶） */}
      <mesh raycast={() => null} position={[-r * 0.34, r * 0.4, r * 0.5]}>
        <sphereGeometry args={[r * 0.13, 16, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={hover ? 0.85 : 0.6} depthWrite={false} />
      </mesh>
      {/* 高さ（第3軸）を読むための、基準面への細い垂線 */}
      {position[1] > 0.01 && (
        <Line points={[[0, 0, 0], [0, -position[1], 0]]} color={color} lineWidth={1} transparent opacity={0.16} dashed dashScale={3} />
      )}
      {/* タイトル＝クリックボタン */}
      <Html center distanceFactor={hover ? 17 : 24} position={[0, r + 0.9, 0]} zIndexRange={[16, 2]} style={{ pointerEvents: "auto" }}>
        <button
          type="button"
          onMouseEnter={enter}
          onMouseLeave={leave}
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          style={{ cursor: "pointer", appearance: "none", background: "none", border: "none", padding: 0 }}
        >
          <NodeChip color={color} emoji={emoji} title={topic.category} posts={posts} hover={hover} />
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
        <Line key={s.key} points={[s.a, s.b]} color="#9fb6ff" lineWidth={1} transparent opacity={0.14} />
      ))}
    </group>
  );
}

/** 2軸（X/Z の十字線＋ラベル）と、第3軸（縦・常時表示・両端ラベル）。地面グリッドは置かない。 */
function AxisFrame({ config, axis3Low, axis3High }: { config: AxisConfig; axis3Low: string; axis3High: string }) {
  const axis = "#5a6db0";
  const v3 = "#7fd6ff";
  return (
    <group>
      {/* X軸 */}
      <Line points={[[-S, 0, 0], [S, 0, 0]]} color={axis} lineWidth={1.25} transparent opacity={0.55} />
      {/* Z軸（axis_y を Z にマップ。+y を奥へ） */}
      <Line points={[[0, 0, S], [0, 0, -S]]} color={axis} lineWidth={1.25} transparent opacity={0.55} />
      <Html center position={[S + 3, 0, 0]} style={{ pointerEvents: "none" }}><div style={axisLabelStyle}>{config.xRight} →</div></Html>
      <Html center position={[-S - 3, 0, 0]} style={{ pointerEvents: "none" }}><div style={axisLabelStyle}>← {config.xLeft}</div></Html>
      <Html center position={[0, 0, -S - 3]} style={{ pointerEvents: "none" }}><div style={axisLabelStyle}>{config.yTop} ↑</div></Html>
      <Html center position={[0, 0, S + 3]} style={{ pointerEvents: "none" }}><div style={axisLabelStyle}>{config.yBottom} ↓</div></Html>
      {/* 第3軸（縦）：常時表示。上下に対の項目。 */}
      <Line points={[[0, 0, 0], [0, MAXH + 1, 0]]} color={v3} lineWidth={1.5} transparent opacity={0.7} />
      <Html center position={[0, MAXH + 2.4, 0]} style={{ pointerEvents: "none" }}>
        <div style={{ ...axisLabelStyle, color: "#d6f3ff", borderColor: "rgba(127,214,255,0.5)", background: "rgba(8,20,34,0.6)" }}>{axis3High || "（巡回待ち）"} ↑</div>
      </Html>
      {axis3Low && (
        <Html center position={[4, 0.5, 0]} style={{ pointerEvents: "none" }}>
          <div style={{ ...axisLabelStyle, color: "#d6f3ff", borderColor: "rgba(127,214,255,0.38)", background: "rgba(8,20,34,0.55)", fontSize: 11 }}>↓ {axis3Low}</div>
        </Html>
      )}
    </group>
  );
}

/** 中心ハブ（議員会館）。常に分布の中央(縦中点)に固定。クリックで内封オーバーレイ。 */
function CenterHub({ label, onSelect }: { label: string; onSelect: () => void }) {
  const [hover, setHover] = useState(false);
  const enter = () => { setHover(true); document.body.style.cursor = "pointer"; };
  const leave = () => { setHover(false); document.body.style.cursor = "auto"; };
  const select = (e?: { stopPropagation?: () => void }) => { e?.stopPropagation?.(); onSelect(); };
  return (
    <group position={[0, CENTER_Y, 0]}>
      {/* 透明な当たり判定 */}
      <mesh onPointerOver={(e) => { e.stopPropagation(); enter(); }} onPointerOut={leave} onClick={(e) => select(e)}>
        <sphereGeometry args={[2.6, 20, 20]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* 本体：白めの艶やかな球 */}
      <mesh raycast={() => null} scale={hover ? 1.08 : 1}>
        <sphereGeometry args={[1.8, 64, 64]} />
        <meshPhysicalMaterial color="#eef3ff" roughness={0.22} metalness={0} clearcoat={1} clearcoatRoughness={0.12} emissive="#9db8ff" emissiveIntensity={0.12} />
      </mesh>
      {/* 鏡面ハイライト */}
      <mesh raycast={() => null} position={[-0.55, 0.66, 0.9]}>
        <sphereGeometry args={[0.24, 16, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.85} depthWrite={false} />
      </mesh>
      <Html center distanceFactor={hover ? 21 : 28} position={[0, 3, 0]} zIndexRange={[60, 40]} style={{ pointerEvents: "auto" }}>
        <button
          type="button"
          onMouseEnter={enter}
          onMouseLeave={leave}
          onClick={(e) => select(e)}
          style={{
            cursor: "pointer", appearance: "none", whiteSpace: "nowrap",
            fontSize: 13, fontWeight: 800, color: "#fff",
            background: "rgba(10,14,34,0.85)",
            border: "1px solid #9db8ffcc", borderRadius: 999, padding: "4px 12px",
            boxShadow: "0 4px 14px rgba(0,0,0,0.5)",
          }}
        >
          🎫 {label}
        </button>
      </Html>
    </group>
  );
}

/** OrbitControls：ドラッグ=回転、Shift+ドラッグ=平行移動、ホイール=ズーム。
 *  Shift 判定は pointerdown のキャプチャ段階で行い、確実に PAN に切り替える。 */
function Controls() {
  const ref = useRef<any>(null);
  const { gl } = useThree();
  useEffect(() => {
    const c = ref.current;
    if (c) c.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    const el = gl.domElement;
    const onDown = (e: PointerEvent) => {
      if (ref.current) ref.current.mouseButtons.LEFT = e.shiftKey ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
    };
    el.addEventListener("pointerdown", onDown, { capture: true });
    return () => el.removeEventListener("pointerdown", onDown, { capture: true } as EventListenerOptions);
  }, [gl]);
  return (
    <OrbitControls
      ref={ref}
      makeDefault
      enablePan
      screenSpacePanning
      minDistance={14}
      maxDistance={130}
      maxPolarAngle={Math.PI * 0.52}
      target={[0, CENTER_Y, 0]}
      enableDamping
      dampingFactor={0.08}
    />
  );
}

function Scene({ centerLabel, config, positions, axis3, edges, counts, onSelectTopic, onSelectCenter }: {
  centerLabel: string;
  config: AxisConfig;
  positions: Record<number, AxisPoint>;
  axis3: Axis3;
  edges: Edge[];
  counts: Map<string, number>;
  onSelectTopic: (t: InteropPriorityTopic) => void;
  onSelectCenter: () => void;
}) {
  const [axis3Low, axis3High] = useMemo(() => splitPoles(axis3.label), [axis3.label]);

  const nodes = useMemo(() => {
    const out: { topic: InteropPriorityTopic; posts: number; position: [number, number, number] }[] = [];
    for (const [noStr, p] of Object.entries(positions)) {
      const no = Number(noStr);
      const topic = TOPIC_BY_NO.get(no);
      if (!topic) continue;
      const posts = counts.get(topic.roomId) ?? 0;
      // 第3軸（高さ）＝週次AI巡回が設計した意味軸の値（0..1）。常時表示。
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

  // 接続線：内容ベースのエッジ（週次AI）があれば優先。無ければ同じ大カテゴリの最近傍同士を結ぶ。
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
      <ambientLight intensity={0.8} />
      <hemisphereLight args={["#cdd9ff", "#0a1024", 0.6]} />
      <directionalLight position={[16, 26, 14]} intensity={1.15} color="#ffffff" />
      {/* 鏡面ハイライト用の色付きポイントライト */}
      <pointLight position={[-26, 18, 22]} intensity={260} distance={120} color="#bfe3ff" />
      <pointLight position={[26, 12, -22]} intensity={200} distance={120} color="#ffd6ec" />
      {/* 控えめな星空（宇宙感） */}
      <Stars radius={140} depth={60} count={1100} factor={3} saturation={0} fade speed={0.2} />
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
    fetch("/api/interop/axis")
      .then((r) => r.json())
      .then((d: { config?: AxisConfig; positions?: Record<number, AxisPoint>; axis3?: Axis3; edges?: Edge[] }) => {
        if (cancelled) return;
        if (d.config) setConfig(d.config);
        if (d.positions && Object.keys(d.positions).length) setPositions(d.positions);
        if (d.axis3?.label) setAxis3({ label: d.axis3.label, values: d.axis3.values ?? {} });
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

  const label = centerLabel?.trim() || "議員会館";

  return (
    <div className="absolute inset-0">
      <Canvas camera={{ position: [0, 22, 52], fov: 48 }} dpr={[1, 2]} gl={{ antialias: true }}>
        <color attach="background" args={["#070a18"]} />
        <Scene
          centerLabel={label}
          config={config}
          positions={positions}
          axis3={axis3}
          edges={edges}
          counts={counts}
          onSelectTopic={(t) => { if (t.roomId) router.push(`/forum/${t.roomId}?from=interop`); }}
          onSelectCenter={() => setHubOpen(true)}
        />
      </Canvas>

      {/* 中心ハブ＝議員会館。クリックでカテゴリ選択→コンテンツ→申込を内封表示（別ページに飛ばさない） */}
      <KaikanHubOverlay open={hubOpen} label={label} onClose={() => setHubOpen(false)} />

      <p className="pointer-events-none absolute bottom-4 left-4 z-40 text-[11px] leading-relaxed text-white/45">
        ドラッグで回転・<span className="text-white/70">Shift+ドラッグで移動</span>・ホイールで拡大／玉の大きさ＝活発さ・高さ＝週次AI巡回の分析軸
      </p>
    </div>
  );
}
