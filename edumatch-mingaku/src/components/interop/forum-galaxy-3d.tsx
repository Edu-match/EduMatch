"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, Stars } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { INTEROP_PRIORITY_TOPICS, MAJOR_META, type InteropPriorityTopic } from "@/lib/interop-priority-topics";

const MAJORS = Object.keys(MAJOR_META);

const labelStyle = (color: string, size = 11): React.CSSProperties => ({
  whiteSpace: "nowrap",
  fontSize: size,
  fontWeight: 700,
  color: "#fff",
  background: `linear-gradient(135deg, rgba(8,11,32,0.82), ${color}44)`,
  border: `1px solid ${color}aa`,
  borderRadius: 8,
  padding: "1.5px 6px",
  boxShadow: `0 2px 10px rgba(0,0,0,0.45)`,
  textShadow: "0 1px 2px rgba(0,0,0,0.6)",
});

// 投稿数 → 玉の倍率（3Dなので大胆に大きく）
function topicScale(posts: number): number {
  return 1 + Math.min(3.6, posts * 0.14);
}

function Moon({ topic, color, posts, onHover, onSelect }: { topic: InteropPriorityTopic; color: string; posts: number; onHover: (v: boolean) => void; onSelect: () => void }) {
  const [hover, setHover] = useState(false);
  const s = topicScale(posts);
  const hitR = Math.max(2.0, 0.55 * s * 1.5); // 当たり判定はかなり広めに
  const enter = () => { setHover(true); onHover(true); document.body.style.cursor = "pointer"; };
  const leave = () => { setHover(false); onHover(false); document.body.style.cursor = "auto"; };
  return (
    <group>
      {/* 透明の広い当たり判定（玉そのものを押しても反応） */}
      <mesh onPointerOver={(e) => { e.stopPropagation(); enter(); }} onPointerOut={leave} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        <sphereGeometry args={[hitR, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* 見た目の玉（クリックは当たり判定とラベルに任せる） */}
      <mesh scale={s * (hover ? 1.2 : 1)} raycast={() => null}>
        <sphereGeometry args={[0.55, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={hover ? 1.6 : 0.75} roughness={0.4} toneMapped={false} />
      </mesh>
      {/* ★タイトル＝クリック可能なボタン（DOMなので確実に押せる）。これが主なクリック手段。 */}
      <Html center distanceFactor={hover ? 14 : 20} position={[0, 0.55 * s + 0.6, 0]} zIndexRange={[16, 2]} style={{ pointerEvents: "auto" }}>
        <button
          type="button"
          onMouseEnter={enter}
          onMouseLeave={leave}
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          style={{ ...labelStyle(color, hover ? 12.5 : 10.5), cursor: "pointer", appearance: "none" }}
        >
          {topic.category}{posts > 0 ? ` · ${posts}` : ""}
        </button>
      </Html>
    </group>
  );
}

function PlanetSystem({
  major, planetRadius, angle0, topics, counts, spin, pausedRef, onHover, onSelect,
}: { major: string; planetRadius: number; angle0: number; topics: InteropPriorityTopic[]; counts: Map<string, number>; spin: boolean; pausedRef: React.MutableRefObject<boolean>; onHover: (v: boolean) => void; onSelect: (t: InteropPriorityTopic) => void }) {
  const orbitRef = useRef<THREE.Group>(null);
  const moonsRef = useRef<THREE.Group>(null);
  const color = MAJOR_META[major]?.color ?? "#C9D4F6";
  // 既定では公転を止めて「動かない＝押しやすい」状態に（回転ONのときだけゆっくり公転）。
  useFrame((_, dt) => {
    if (!spin || pausedRef.current) return;
    if (orbitRef.current) orbitRef.current.rotation.y += dt * 0.012;
    if (moonsRef.current) moonsRef.current.rotation.y += dt * 0.05;
  });
  return (
    <group ref={orbitRef} rotation={[0, angle0, 0]}>
      <group position={[planetRadius, 0, 0]}>
        <mesh>
          <sphereGeometry args={[1.3, 22, 22]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} roughness={0.45} toneMapped={false} />
        </mesh>
        <Html center distanceFactor={22} position={[0, 2.2, 0]} style={{ pointerEvents: "none" }} zIndexRange={[20, 10]}>
          <div style={{ ...labelStyle(color, 12.5), fontWeight: 800 }}>{MAJOR_META[major]?.label ?? major}</div>
        </Html>
        <group ref={moonsRef}>
          {topics.map((t, i) => {
            const posts = counts.get(t.roomId) ?? 0;
            const a = (i / Math.max(1, topics.length)) * Math.PI * 2;
            const r = 4 + topicScale(posts) * 0.8 + (i % 2) * 1.6;
            const y = ((i % 3) - 1) * 0.9;
            return (
              <group key={t.no} rotation={[0, a, 0]}>
                <group position={[r, y, 0]}>
                  <Moon topic={t} color={color} posts={posts} onHover={onHover} onSelect={() => onSelect(t)} />
                </group>
              </group>
            );
          })}
        </group>
      </group>
    </group>
  );
}

function Scene({ centerLabel, counts, spin, onSelect }: { centerLabel: string; counts: Map<string, number>; spin: boolean; onSelect: (t: InteropPriorityTopic) => void }) {
  const grouped = useMemo(
    () => MAJORS.map((m) => ({ major: m, topics: INTEROP_PRIORITY_TOPICS.filter((t) => t.major === m) })),
    [],
  );
  // ホバー中は公転＋自動回転を止める（回転ONのとき用）。
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const onHover = (v: boolean) => { pausedRef.current = v; setPaused(v); };
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 0, 0]} intensity={3.2} distance={120} color="#cfe0ff" />
      <Stars radius={140} depth={60} count={2200} factor={3} fade speed={0.25} />

      {/* 中心ハブ＝恒星 */}
      <mesh>
        <sphereGeometry args={[2.4, 28, 28]} />
        <meshStandardMaterial color="#eaf2ff" emissive="#a9c0ff" emissiveIntensity={1.8} roughness={0.2} toneMapped={false} />
      </mesh>
      <Html center distanceFactor={28} position={[0, 3.9, 0]} style={{ pointerEvents: "none" }} zIndexRange={[40, 30]}>
        <div style={{ ...labelStyle("#a9c0ff", 13.5), fontWeight: 800 }}>{centerLabel}</div>
      </Html>

      {/* 太陽系（少し傾けて円盤っぽく・大きく広げる） */}
      <group rotation={[0.16, 0, 0.04]}>
        {grouped.map((g, i) => (
          <PlanetSystem
            key={g.major}
            major={g.major}
            planetRadius={15 + (i % 3) * 5}
            angle0={(i / MAJORS.length) * Math.PI * 2}
            topics={g.topics}
            counts={counts}
            spin={spin}
            pausedRef={pausedRef}
            onHover={onHover}
            onSelect={onSelect}
          />
        ))}
      </group>

      <OrbitControls enablePan={false} minDistance={8} maxDistance={120} autoRotate={spin && !paused} autoRotateSpeed={0.12} />

      <EffectComposer>
        <Bloom intensity={1.0} luminanceThreshold={0.3} luminanceSmoothing={0.9} mipmapBlur radius={0.65} />
      </EffectComposer>
    </>
  );
}

export default function ForumGalaxy3D({ centerLabel }: { centerLabel?: string }) {
  const router = useRouter();
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [spin, setSpin] = useState(false); // 既定は静止（押しやすさ優先）。トグルで回転。

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

  return (
    <div className="absolute inset-0">
      <Canvas camera={{ position: [0, 22, 52], fov: 55 }} dpr={[1, 1.5]} gl={{ antialias: true }}>
        <color attach="background" args={["#04050d"]} />
        <Scene
          centerLabel={centerLabel?.trim() || "議員会館"}
          counts={counts}
          spin={spin}
          onSelect={(t) => { if (t.roomId) router.push(`/forum/${t.roomId}?from=interop`); }}
        />
      </Canvas>
      {/* 回転 ON/OFF（既定OFF＝静止で押しやすい。ドラッグで自由に回せます） */}
      <button
        type="button"
        onClick={() => setSpin((v) => !v)}
        className="absolute bottom-4 right-4 z-40 rounded-full border border-white/15 bg-[#0a1024]/80 px-3 py-1.5 text-xs font-bold text-white/80 backdrop-blur transition hover:text-white"
      >
        {spin ? "⏸ 回転を止める" : "▶ 回転"}
      </button>
      <p className="pointer-events-none absolute bottom-4 left-4 z-40 text-[11px] text-white/45">ドラッグで回転・ホイールで拡大／玉やタイトルをタップで掲示板へ</p>
    </div>
  );
}
