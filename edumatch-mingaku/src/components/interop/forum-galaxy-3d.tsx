"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { Html, OrbitControls, Line } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { INTEROP_PRIORITY_TOPICS, MAJOR_META, type InteropPriorityTopic } from "@/lib/interop-priority-topics";
import { DEFAULT_AXIS_CONFIG, type AxisConfig, type AxisPoint } from "@/lib/interop-topic-axis";

// -1..1 の軸座標 → ワールド座標のスケール
const S = 18;
const TOPIC_BY_NO = new Map(INTEROP_PRIORITY_TOPICS.map((t) => [t.no, t]));

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
// 三軸ON時の高さ（週次の活発さ＝当面は投稿数を採用）
function activityHeight(posts: number): number {
  return Math.min(14, posts * 0.7);
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
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={hover ? 0.85 : 0.45} roughness={0.45} metalness={0.05} />
      </mesh>
      <mesh raycast={() => null} scale={hover ? 1.7 : 1.45}>
        <sphereGeometry args={[r, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={hover ? 0.18 : 0.1} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      {/* 3軸ON時：地面(プロット面)への投影点と垂線 */}
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

/** 2軸（地面の十字＋グリッド＋ラベル）と、3軸ON時の縦軸。 */
function AxisFrame({ config, threeAxis }: { config: AxisConfig; threeAxis: boolean }) {
  const grid = "#2a3566";
  const axis = "#6f86d6";
  return (
    <group>
      <gridHelper args={[S * 2, 16, grid, "#1c2444"]} position={[0, 0, 0]} />
      {/* X軸：人間↔技術 */}
      <Line points={[[-S, 0, 0], [S, 0, 0]]} color={axis} lineWidth={1.5} />
      {/* Z軸：現場↔制度（axis_y を Z にマップ。+y=制度を奥へ） */}
      <Line points={[[0, 0, S], [0, 0, -S]]} color={axis} lineWidth={1.5} />
      <Html center position={[S + 2.5, 0, 0]} style={{ pointerEvents: "none" }}><div style={axisLabelStyle}>{config.xRight} →</div></Html>
      <Html center position={[-S - 2.5, 0, 0]} style={{ pointerEvents: "none" }}><div style={axisLabelStyle}>← {config.xLeft}</div></Html>
      <Html center position={[0, 0, -S - 2.5]} style={{ pointerEvents: "none" }}><div style={axisLabelStyle}>{config.yTop} ↑</div></Html>
      <Html center position={[0, 0, S + 2.5]} style={{ pointerEvents: "none" }}><div style={axisLabelStyle}>{config.yBottom} ↓</div></Html>
      {threeAxis && (
        <>
          <Line points={[[0, 0, 0], [0, 15, 0]]} color="#7fd6ff" lineWidth={1.5} />
          <Html center position={[0, 16, 0]} style={{ pointerEvents: "none" }}><div style={{ ...axisLabelStyle, color: "#bfeaff", borderColor: "rgba(127,214,255,0.5)" }}>活発さ（週次）↑</div></Html>
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
  return (
    <group position={[0, 1.4, 0]}>
      <mesh onPointerOver={(e) => { e.stopPropagation(); enter(); }} onPointerOut={leave} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        <sphereGeometry args={[2.4, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh raycast={() => null} scale={hover ? 1.12 : 1}>
        <sphereGeometry args={[1.4, 32, 32]} />
        <meshStandardMaterial color="#eaf2ff" emissive="#9db8ff" emissiveIntensity={hover ? 1.1 : 0.7} roughness={0.3} />
      </mesh>
      <mesh raycast={() => null} scale={1.6}>
        <sphereGeometry args={[1.4, 20, 20]} />
        <meshBasicMaterial color="#9db8ff" transparent opacity={0.14} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      <Html center distanceFactor={hover ? 20 : 26} position={[0, 2.4, 0]} zIndexRange={[40, 30]} style={{ pointerEvents: "auto" }}>
        <button type="button" onMouseEnter={enter} onMouseLeave={leave} onClick={(e) => { e.stopPropagation(); onSelect(); }} style={{ ...labelStyle("#9db8ff", 13), cursor: "pointer", appearance: "none", fontWeight: 800 }}>
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

function Scene({ centerLabel, config, positions, counts, threeAxis, onSelectTopic, onSelectCenter }: {
  centerLabel: string;
  config: AxisConfig;
  positions: Record<number, AxisPoint>;
  counts: Map<string, number>;
  threeAxis: boolean;
  onSelectTopic: (t: InteropPriorityTopic) => void;
  onSelectCenter: () => void;
}) {
  const nodes = useMemo(() => {
    const out: { topic: InteropPriorityTopic; posts: number; position: [number, number, number] }[] = [];
    for (const [noStr, p] of Object.entries(positions)) {
      const topic = TOPIC_BY_NO.get(Number(noStr));
      if (!topic) continue;
      const posts = counts.get(topic.roomId) ?? 0;
      const y = threeAxis ? activityHeight(posts) : 0;
      out.push({ topic, posts, position: [p.x * S, y, -p.y * S] });
    }
    return out;
  }, [positions, counts, threeAxis]);

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 20, 10]} intensity={0.5} color="#cdd9ff" />
      <AxisFrame config={config} threeAxis={threeAxis} />
      <CenterHub label={centerLabel} onSelect={onSelectCenter} />
      {nodes.map(({ topic, posts, position }) => (
        <TopicNode key={topic.no} topic={topic} posts={posts} position={position} onSelect={() => onSelectTopic(topic)} />
      ))}
      <Controls />
      <EffectComposer>
        <Bloom intensity={0.55} luminanceThreshold={0.55} luminanceSmoothing={0.9} mipmapBlur radius={0.5} />
      </EffectComposer>
    </>
  );
}

export default function ForumGalaxy3D({ centerLabel }: { centerLabel?: string }) {
  const router = useRouter();
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [config, setConfig] = useState<AxisConfig>(DEFAULT_AXIS_CONFIG);
  const [positions, setPositions] = useState<Record<number, AxisPoint>>({});
  const [threeAxis, setThreeAxis] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/interop/axis")
      .then((r) => r.json())
      .then((d: { config?: AxisConfig; positions?: Record<number, AxisPoint> }) => {
        if (cancelled) return;
        if (d.config) setConfig(d.config);
        if (d.positions && Object.keys(d.positions).length) setPositions(d.positions);
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
          counts={counts}
          threeAxis={threeAxis}
          onSelectTopic={(t) => { if (t.roomId) router.push(`/forum/${t.roomId}?from=interop`); }}
          onSelectCenter={() => router.push("/kaikan/tickets")}
        />
      </Canvas>

      {/* 操作トグル＋ヘルプ */}
      <div className="absolute bottom-4 right-4 z-40 flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => setThreeAxis((v) => !v)}
          className={`rounded-full border px-3 py-1.5 text-xs font-bold backdrop-blur transition ${threeAxis ? "border-sky-300/50 bg-sky-400/20 text-white" : "border-white/15 bg-[#0a1024]/80 text-white/80 hover:text-white"}`}
        >
          {threeAxis ? "◳ 第3軸（高さ）：ON" : "◰ 第3軸（高さ）：OFF"}
        </button>
      </div>
      <p className="pointer-events-none absolute bottom-4 left-4 z-40 text-[11px] leading-relaxed text-white/45">
        ドラッグで回転・<span className="text-white/70">Shift+ドラッグで移動</span>・ホイールで拡大／玉やタイトルをタップで掲示板へ
      </p>
    </div>
  );
}
