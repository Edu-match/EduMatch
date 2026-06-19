"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { Html, OrbitControls, Line, Stars } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { INTEROP_PRIORITY_TOPICS, MAJOR_META, type InteropPriorityTopic } from "@/lib/interop-priority-topics";
import { DEFAULT_AXIS_CONFIG, type AxisConfig, type AxisPoint } from "@/lib/interop-topic-axis";
import { KaikanHubOverlay } from "./kaikan-hub-overlay";

// -1..1 の軸座標 → ワールド座標のスケール
const S = 18;
// 第3軸（高さ）の最大値（axis3 値 0..1 → 0..MAXH）
const MAXH = 15;
const TOPIC_BY_NO = new Map(INTEROP_PRIORITY_TOPICS.map((t) => [t.no, t]));

// 大カテゴリ別の絵文字（玉の中に出すアイコン）
const MAJOR_EMOJI: Record<string, string> = {
  A: "🤖", B: "📊", C: "🛡️", D: "🌈", E: "🏫", F: "📚",
};

type Axis3 = { label: string; values: Record<number, number> };
type Edge = { a: number; b: number; weight: number };

/** "停滞 ↔ 活発" のような両極ラベルを [低, 高] に分割。 */
function splitPoles(label: string): [string, string] {
  const parts = label.split(/↔|⇔|<->|〜|~|→|↑/).map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) return [parts[0], parts[1]];
  return ["", label.trim()];
}

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

// 活発さ（投稿数）＝玉の大きさ。差が見えるよう強めに効かせる。
function nodeSize(posts: number): number {
  return 0.62 + Math.min(1.5, posts * 0.085);
}

/** カテゴリ名＋アイコンの“ガラス玉風”チップ（2Dマップのバブルに揃える）。 */
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
        background: `linear-gradient(135deg, rgba(10,14,38,0.86), ${color}3a)`,
        border: `1px solid ${color}cc`,
        boxShadow: `0 4px 16px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 0 14px ${color}55`,
        textShadow: "0 1px 2px rgba(0,0,0,0.6)",
        backdropFilter: "blur(2px)",
        transition: "font-size .12s ease",
      }}
    >
      <span
        style={{
          display: "grid",
          placeItems: "center",
          width: hover ? 22 : 19,
          height: hover ? 22 : 19,
          borderRadius: 999,
          fontSize: hover ? 13 : 11,
          background: `radial-gradient(circle at 32% 28%, #ffffff, ${color})`,
          boxShadow: `0 0 8px ${color}aa`,
        }}
      >
        {emoji}
      </span>
      <span>{title}</span>
      {posts > 0 && (
        <span style={{ opacity: 0.7, fontWeight: 700, fontSize: hover ? 11 : 9.5 }}>· {posts}</span>
      )}
    </div>
  );
}

/** 1トピックの点（光沢のある球＋クリック可能なチップ）。 */
function TopicNode({ topic, posts, position, onSelect }: { topic: InteropPriorityTopic; posts: number; position: [number, number, number]; onSelect: () => void }) {
  const [hover, setHover] = useState(false);
  const color = MAJOR_META[topic.major]?.color ?? "#C9D4F6";
  const emoji = MAJOR_EMOJI[topic.major] ?? "✨";
  const r = nodeSize(posts);
  const enter = () => { setHover(true); document.body.style.cursor = "pointer"; };
  const leave = () => { setHover(false); document.body.style.cursor = "auto"; };
  return (
    <group position={position}>
      {/* 広めの透明当たり判定 */}
      <mesh onPointerOver={(e) => { e.stopPropagation(); enter(); }} onPointerOut={leave} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        <sphereGeometry args={[Math.max(1.4, r * 2.2), 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* 本体：光沢（クリアコート）のあるガラス玉 */}
      <mesh raycast={() => null} scale={hover ? 1.18 : 1}>
        <sphereGeometry args={[r, 48, 48]} />
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hover ? 0.5 : 0.32}
          roughness={0.16}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.22}
          envMapIntensity={0.8}
        />
      </mesh>
      {/* ハイライト（鏡面の白点） */}
      <mesh raycast={() => null} position={[-r * 0.34, r * 0.4, r * 0.5]}>
        <sphereGeometry args={[r * 0.16, 16, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={hover ? 0.95 : 0.8} depthWrite={false} />
      </mesh>
      {/* 外周のやわらかい発光 */}
      <mesh raycast={() => null} scale={hover ? 1.55 : 1.4}>
        <sphereGeometry args={[r, 20, 20]} />
        <meshBasicMaterial color={color} transparent opacity={hover ? 0.16 : 0.1} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      {/* プロット面（地面）への垂線：高さ＝第3軸の値を示す */}
      {position[1] > 0.01 && (
        <Line points={[[0, 0, 0], [0, -position[1], 0]]} color={color} lineWidth={1} transparent opacity={0.22} dashed dashScale={3} />
      )}
      {/* タイトル＝クリックボタン */}
      <Html center distanceFactor={hover ? 15 : 21} position={[0, r + 0.8, 0]} zIndexRange={[16, 2]} style={{ pointerEvents: "auto" }}>
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
        <Line key={s.key} points={[s.a, s.b]} color="#9fb6ff" lineWidth={1} transparent opacity={0.16} />
      ))}
    </group>
  );
}

/** 2軸（地面の十字＋グリッド＋ラベル）と、第3軸（縦・常時表示・両端ラベル）。 */
function AxisFrame({ config, axis3Low, axis3High }: { config: AxisConfig; axis3Low: string; axis3High: string }) {
  const grid = "#2a3566";
  const axis = "#6f86d6";
  const v3 = "#7fd6ff";
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
      {/* 第3軸（縦）：常時表示。上下に対の項目を出す。 */}
      <Line points={[[0, 0, 0], [0, MAXH + 1, 0]]} color={v3} lineWidth={1.5} />
      <Html center position={[0, MAXH + 2, 0]} style={{ pointerEvents: "none" }}>
        <div style={{ ...axisLabelStyle, color: "#d6f3ff", borderColor: "rgba(127,214,255,0.55)", background: "rgba(8,20,34,0.6)" }}>{axis3High || "（巡回待ち）"} ↑</div>
      </Html>
      {axis3Low && (
        <Html center position={[3.4, 0.4, 0]} style={{ pointerEvents: "none" }}>
          <div style={{ ...axisLabelStyle, color: "#d6f3ff", borderColor: "rgba(127,214,255,0.4)", background: "rgba(8,20,34,0.55)", fontSize: 11 }}>↓ {axis3Low}</div>
        </Html>
      )}
    </group>
  );
}

/** 中心ハブ（議員会館）。クリックでイベントのコンテンツ一覧を“内封”表示。 */
function CenterHub({ label, onSelect }: { label: string; onSelect: () => void }) {
  const [hover, setHover] = useState(false);
  const enter = () => { setHover(true); document.body.style.cursor = "pointer"; };
  const leave = () => { setHover(false); document.body.style.cursor = "auto"; };
  const select = (e?: { stopPropagation?: () => void }) => { e?.stopPropagation?.(); onSelect(); };
  return (
    <group position={[0, 1.6, 0]}>
      {/* 広めの透明当たり判定 */}
      <mesh onPointerOver={(e) => { e.stopPropagation(); enter(); }} onPointerOut={leave} onClick={(e) => select(e)}>
        <sphereGeometry args={[3, 20, 20]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh raycast={() => null} scale={hover ? 1.1 : 1}>
        <sphereGeometry args={[1.6, 48, 48]} />
        <meshPhysicalMaterial color="#eaf2ff" emissive="#9db8ff" emissiveIntensity={hover ? 0.9 : 0.6} roughness={0.12} metalness={0} clearcoat={1} clearcoatRoughness={0.18} />
      </mesh>
      <mesh raycast={() => null} position={[-0.5, 0.6, 0.8]}>
        <sphereGeometry args={[0.26, 16, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.92} depthWrite={false} />
      </mesh>
      <mesh raycast={() => null} scale={1.6}>
        <sphereGeometry args={[1.6, 20, 20]} />
        <meshBasicMaterial color="#9db8ff" transparent opacity={0.14} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      <Html center distanceFactor={hover ? 19 : 25} position={[0, 2.8, 0]} zIndexRange={[60, 40]} style={{ pointerEvents: "auto" }}>
        <button
          type="button"
          onMouseEnter={enter}
          onMouseLeave={leave}
          onClick={(e) => select(e)}
          style={{
            cursor: "pointer", appearance: "none", whiteSpace: "nowrap",
            fontSize: 13, fontWeight: 800, color: "#fff",
            background: "linear-gradient(135deg, rgba(10,14,38,0.9), #9db8ff55)",
            border: "1px solid #9db8ffcc", borderRadius: 999, padding: "4px 12px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.5), 0 0 16px #9db8ff66",
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
      minDistance={10}
      maxDistance={90}
      maxPolarAngle={Math.PI * 0.49}
      target={[0, 1, 0]}
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
      // 第3軸（高さ）＝週次Gemmaが設計した意味軸の値（0..1）。常時表示。
      const y = (axis3.values[no] ?? 0) * MAXH;
      out.push({ topic, posts, position: [p.x * S, y, -p.y * S] });
    }
    return out;
  }, [positions, counts, axis3]);

  const posById = useMemo(() => {
    const m = new Map<number, [number, number, number]>();
    for (const n of nodes) m.set(n.topic.no, n.position);
    return m;
  }, [nodes]);

  // 接続線：内容ベースのエッジ（週次Gemma）があれば優先。無ければ「同じ大カテゴリの最近傍同士」を結ぶ。
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
      <ambientLight intensity={0.55} />
      <directionalLight position={[12, 22, 10]} intensity={0.7} color="#cdd9ff" />
      {/* 鏡面ハイライト用の色付きポイントライト（玉に艶を出す） */}
      <pointLight position={[-18, 14, 16]} intensity={120} distance={70} color="#8fd0ff" />
      <pointLight position={[18, 10, -16]} intensity={90} distance={70} color="#ffd0e6" />
      {/* 宇宙感（控えめな星空） */}
      <Stars radius={120} depth={50} count={1400} factor={3} saturation={0} fade speed={0.25} />
      <AxisFrame config={config} axis3Low={axis3Low} axis3High={axis3High} />
      <TopicEdges edges={effectiveEdges} posById={posById} />
      <CenterHub label={centerLabel} onSelect={onSelectCenter} />
      {nodes.map(({ topic, posts, position }) => (
        <TopicNode key={topic.no} topic={topic} posts={posts} position={position} onSelect={() => onSelectTopic(topic)} />
      ))}
      <Controls />
      <EffectComposer multisampling={0}>
        <Bloom intensity={0.45} luminanceThreshold={0.6} luminanceSmoothing={0.9} mipmapBlur radius={0.5} />
      </EffectComposer>
    </>
  );
}

export default function ForumGalaxy3D({ centerLabel }: { centerLabel?: string }) {
  const router = useRouter();
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [config, setConfig] = useState<AxisConfig>(DEFAULT_AXIS_CONFIG);
  const [positions, setPositions] = useState<Record<number, AxisPoint>>({});
  const [axis3, setAxis3] = useState<Axis3>({ label: "短期 ↔ 長期", values: {} });
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
      <Canvas camera={{ position: [0, 18, 36], fov: 50 }} dpr={[1, 1.6]} gl={{ antialias: true }}>
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

      {/* 中心ハブ＝議員会館イベントのコンテンツ一覧を“内封”表示（別ページに飛ばさない） */}
      <KaikanHubOverlay open={hubOpen} label={label} onClose={() => setHubOpen(false)} />

      <p className="pointer-events-none absolute bottom-4 left-4 z-40 text-[11px] leading-relaxed text-white/45">
        ドラッグで回転・<span className="text-white/70">Shift+ドラッグで移動</span>・ホイールで拡大／玉の大きさ＝活発さ・高さ＝週次AI巡回の分析軸
      </p>
    </div>
  );
}
