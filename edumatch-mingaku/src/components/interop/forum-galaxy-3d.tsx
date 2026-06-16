"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, Stars } from "@react-three/drei";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { INTEROP_PRIORITY_TOPICS, MAJOR_META, type InteropPriorityTopic } from "@/lib/interop-priority-topics";

const MAJORS = Object.keys(MAJOR_META);

const labelStyle = (color: string): React.CSSProperties => ({
  whiteSpace: "nowrap",
  fontSize: 11,
  fontWeight: 700,
  color: "#fff",
  background: `linear-gradient(135deg, rgba(8,11,32,0.92), ${color}55)`,
  border: `1px solid ${color}`,
  borderRadius: 8,
  padding: "2px 7px",
  transform: "translateY(-2px)",
  boxShadow: `0 2px 10px rgba(0,0,0,0.4)`,
});

/** トピック＝惑星を周回する衛星（クリックで掲示板へ） */
function Moon({ topic, color, onSelect }: { topic: InteropPriorityTopic; color: string; onSelect: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <mesh
      scale={hover ? 1.5 : 1}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = "auto"; }}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      <sphereGeometry args={[0.42, 14, 14]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={hover ? 0.9 : 0.35} roughness={0.45} />
      {hover && (
        <Html center distanceFactor={16} position={[0, 0.9, 0]} style={{ pointerEvents: "none" }}>
          <div style={labelStyle(color)}>{topic.category}</div>
        </Html>
      )}
    </mesh>
  );
}

/** 大分類＝惑星。中心を公転し、配下トピック（衛星）が惑星を公転する。 */
function PlanetSystem({
  major, planetRadius, angle0, topics, onSelect,
}: { major: string; planetRadius: number; angle0: number; topics: InteropPriorityTopic[]; onSelect: (t: InteropPriorityTopic) => void }) {
  const orbitRef = useRef<THREE.Group>(null);
  const moonsRef = useRef<THREE.Group>(null);
  const color = MAJOR_META[major]?.color ?? "#C9D4F6";

  useFrame((_, dt) => {
    if (orbitRef.current) orbitRef.current.rotation.y += dt * 0.035;
    if (moonsRef.current) moonsRef.current.rotation.y += dt * 0.22;
  });

  return (
    <group ref={orbitRef} rotation={[0, angle0, 0]}>
      <group position={[planetRadius, 0, 0]}>
        <mesh>
          <sphereGeometry args={[1.1, 20, 20]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.28} roughness={0.5} />
        </mesh>
        <Html center distanceFactor={22} position={[0, 1.9, 0]} style={{ pointerEvents: "none" }}>
          <div style={{ ...labelStyle(color), fontSize: 12 }}>{MAJOR_META[major]?.label ?? major}</div>
        </Html>
        <group ref={moonsRef}>
          {topics.map((t, i) => {
            const a = (i / Math.max(1, topics.length)) * Math.PI * 2;
            const r = 2.5 + (i % 2) * 0.7;
            const y = ((i % 3) - 1) * 0.5;
            return (
              <group key={t.no} rotation={[0, a, 0]}>
                <group position={[r, y, 0]}>
                  <Moon topic={t} color={color} onSelect={() => onSelect(t)} />
                </group>
              </group>
            );
          })}
        </group>
      </group>
    </group>
  );
}

function Scene({ centerLabel, onSelect }: { centerLabel: string; onSelect: (t: InteropPriorityTopic) => void }) {
  const grouped = useMemo(
    () => MAJORS.map((m) => ({ major: m, topics: INTEROP_PRIORITY_TOPICS.filter((t) => t.major === m) })),
    [],
  );
  return (
    <>
      <ambientLight intensity={0.55} />
      <pointLight position={[0, 0, 0]} intensity={3} distance={70} color="#cfe0ff" />
      <Stars radius={90} depth={40} count={1400} factor={3} fade speed={0.4} />

      {/* 中心ハブ＝恒星 */}
      <mesh>
        <sphereGeometry args={[2, 28, 28]} />
        <meshStandardMaterial color="#dbeafe" emissive="#9fb4e8" emissiveIntensity={0.95} roughness={0.3} />
      </mesh>
      <Html center distanceFactor={28} position={[0, 3.2, 0]} style={{ pointerEvents: "none" }}>
        <div style={{ ...labelStyle("#9fb4e8"), fontSize: 13 }}>{centerLabel}</div>
      </Html>

      {grouped.map((g, i) => (
        <PlanetSystem
          key={g.major}
          major={g.major}
          planetRadius={9 + (i % 3) * 2.6}
          angle0={(i / MAJORS.length) * Math.PI * 2}
          topics={g.topics}
          onSelect={onSelect}
        />
      ))}

      <OrbitControls enablePan={false} minDistance={7} maxDistance={50} autoRotate autoRotateSpeed={0.35} />
    </>
  );
}

export default function ForumGalaxy3D({ centerLabel }: { centerLabel?: string }) {
  const router = useRouter();
  return (
    <div className="absolute inset-0">
      <Canvas camera={{ position: [0, 14, 32], fov: 55 }} dpr={[1, 1.5]}>
        <color attach="background" args={["#05060f"]} />
        <Scene
          centerLabel={centerLabel?.trim() || "議員会館"}
          onSelect={(t) => { if (t.roomId) router.push(`/forum/${t.roomId}?from=interop`); }}
        />
      </Canvas>
    </div>
  );
}
