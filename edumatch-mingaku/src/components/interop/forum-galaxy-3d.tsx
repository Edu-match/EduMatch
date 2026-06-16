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

function Moon({ topic, color, posts, onSelect }: { topic: InteropPriorityTopic; color: string; posts: number; onSelect: () => void }) {
  const [hover, setHover] = useState(false);
  const s = topicScale(posts);
  return (
    <group>
      <mesh
        scale={s * (hover ? 1.18 : 1)}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = "auto"; }}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
      >
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={hover ? 1.4 : 0.65} roughness={0.4} toneMapped={false} />
      </mesh>
      <Html center distanceFactor={hover ? 16 : 22} position={[0, 0.5 * s + 0.5, 0]} style={{ pointerEvents: "none" }} zIndexRange={[10, 0]}>
        <div style={labelStyle(color, hover ? 12 : 10.5)}>{topic.category}{posts > 0 ? ` · ${posts}` : ""}</div>
      </Html>
    </group>
  );
}

function PlanetSystem({
  major, planetRadius, angle0, topics, counts, onSelect,
}: { major: string; planetRadius: number; angle0: number; topics: InteropPriorityTopic[]; counts: Map<string, number>; onSelect: (t: InteropPriorityTopic) => void }) {
  const orbitRef = useRef<THREE.Group>(null);
  const moonsRef = useRef<THREE.Group>(null);
  const color = MAJOR_META[major]?.color ?? "#C9D4F6";
  useFrame((_, dt) => {
    if (orbitRef.current) orbitRef.current.rotation.y += dt * 0.025;
    if (moonsRef.current) moonsRef.current.rotation.y += dt * 0.16;
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
                  <Moon topic={t} color={color} posts={posts} onSelect={() => onSelect(t)} />
                </group>
              </group>
            );
          })}
        </group>
      </group>
    </group>
  );
}

function Scene({ centerLabel, counts, onSelect }: { centerLabel: string; counts: Map<string, number>; onSelect: (t: InteropPriorityTopic) => void }) {
  const grouped = useMemo(
    () => MAJORS.map((m) => ({ major: m, topics: INTEROP_PRIORITY_TOPICS.filter((t) => t.major === m) })),
    [],
  );
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
            onSelect={onSelect}
          />
        ))}
      </group>

      <OrbitControls enablePan={false} minDistance={8} maxDistance={120} autoRotate autoRotateSpeed={0.28} />

      <EffectComposer>
        <Bloom intensity={1.0} luminanceThreshold={0.3} luminanceSmoothing={0.9} mipmapBlur radius={0.65} />
      </EffectComposer>
    </>
  );
}

export default function ForumGalaxy3D({ centerLabel }: { centerLabel?: string }) {
  const router = useRouter();
  const [counts, setCounts] = useState<Map<string, number>>(new Map());

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
          onSelect={(t) => { if (t.roomId) router.push(`/forum/${t.roomId}?from=interop`); }}
        />
      </Canvas>
    </div>
  );
}
