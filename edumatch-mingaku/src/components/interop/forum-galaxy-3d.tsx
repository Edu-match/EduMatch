"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, Stars } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useMemo, useRef, useState } from "react";
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

/** 渦巻銀河のダスト（背景の星粒）。太陽系をぐるりと囲む。 */
function GalaxyDust() {
  const ref = useRef<THREE.Points>(null);
  const { positions, colors } = useMemo(() => {
    const COUNT = 6000;
    const R = 130;
    const arms = 4;
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const inner = new THREE.Color("#c4b5fd");
    const mid = new THREE.Color("#7dd3fc");
    const outer = new THREE.Color("#475569");
    for (let i = 0; i < COUNT; i++) {
      const r = 14 + Math.pow(Math.random(), 0.7) * R;
      const branch = ((i % arms) / arms) * Math.PI * 2 + r * 0.045;
      const sc = (Math.random() - 0.5) * (4 + r * 0.05);
      const x = Math.cos(branch) * r + sc + (Math.random() - 0.5) * 5;
      const z = Math.sin(branch) * r + sc + (Math.random() - 0.5) * 5;
      const y = (Math.random() - 0.5) * (1.5 + (1 - Math.min(1, r / R)) * 6);
      positions.set([x, y, z], i * 3);
      const t = Math.min(1, r / R);
      const c = (t < 0.5 ? inner.clone().lerp(mid, t * 2) : mid.clone().lerp(outer, (t - 0.5) * 2));
      colors.set([c.r, c.g, c.b], i * 3);
    }
    return { positions, colors };
  }, []);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.012; });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.5} vertexColors transparent opacity={0.75} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

/** ふんわりした星雲（巨大な発光スプライト風の球） */
function Nebula({ position, color, scale }: { position: [number, number, number]; color: string; scale: number }) {
  return (
    <mesh position={position} scale={scale}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial color={color} transparent opacity={0.06} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

function Moon({ topic, color, onSelect }: { topic: InteropPriorityTopic; color: string; onSelect: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <group>
      <mesh
        scale={hover ? 1.6 : 1}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = "auto"; }}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
      >
        <sphereGeometry args={[0.42, 14, 14]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={hover ? 1.4 : 0.6} roughness={0.4} toneMapped={false} />
      </mesh>
      {/* タイトルは常時表示（ホバーで強調） */}
      <Html center distanceFactor={hover ? 14 : 20} position={[0, 0.8, 0]} style={{ pointerEvents: "none", transition: "all .1s" }} zIndexRange={[10, 0]}>
        <div style={labelStyle(color, hover ? 12 : 10)}>{topic.category}</div>
      </Html>
    </group>
  );
}

function PlanetSystem({
  major, planetRadius, angle0, topics, onSelect,
}: { major: string; planetRadius: number; angle0: number; topics: InteropPriorityTopic[]; onSelect: (t: InteropPriorityTopic) => void }) {
  const orbitRef = useRef<THREE.Group>(null);
  const moonsRef = useRef<THREE.Group>(null);
  const color = MAJOR_META[major]?.color ?? "#C9D4F6";
  useFrame((_, dt) => {
    if (orbitRef.current) orbitRef.current.rotation.y += dt * 0.03;
    if (moonsRef.current) moonsRef.current.rotation.y += dt * 0.2;
  });
  return (
    <group ref={orbitRef} rotation={[0, angle0, 0]}>
      <group position={[planetRadius, 0, 0]}>
        <mesh>
          <sphereGeometry args={[1.15, 22, 22]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} roughness={0.45} toneMapped={false} />
        </mesh>
        <Html center distanceFactor={20} position={[0, 1.9, 0]} style={{ pointerEvents: "none" }} zIndexRange={[20, 10]}>
          <div style={{ ...labelStyle(color, 12.5), fontWeight: 800 }}>{MAJOR_META[major]?.label ?? major}</div>
        </Html>
        <group ref={moonsRef}>
          {topics.map((t, i) => {
            const a = (i / Math.max(1, topics.length)) * Math.PI * 2;
            const r = 2.6 + (i % 2) * 0.9;
            const y = ((i % 3) - 1) * 0.6;
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
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 0, 0]} intensity={3.2} distance={80} color="#cfe0ff" />

      {/* 銀河の背景 */}
      <Stars radius={120} depth={60} count={3500} factor={3.5} fade speed={0.3} />
      <group rotation={[0.32, 0, 0.06]}>
        <GalaxyDust />
      </group>
      <Nebula position={[-40, -6, -30]} color="#7c3aed" scale={36} />
      <Nebula position={[45, 8, -20]} color="#0ea5e9" scale={32} />
      <Nebula position={[10, -10, 40]} color="#db2777" scale={28} />

      {/* 中心ハブ＝恒星 */}
      <mesh>
        <sphereGeometry args={[2.1, 28, 28]} />
        <meshStandardMaterial color="#eaf2ff" emissive="#a9c0ff" emissiveIntensity={1.8} roughness={0.2} toneMapped={false} />
      </mesh>
      <Html center distanceFactor={26} position={[0, 3.4, 0]} style={{ pointerEvents: "none" }} zIndexRange={[40, 30]}>
        <div style={{ ...labelStyle("#a9c0ff", 13.5), fontWeight: 800 }}>{centerLabel}</div>
      </Html>

      {/* 太陽系（少し傾けて銀河の円盤っぽく） */}
      <group rotation={[0.18, 0, 0.04]}>
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
      </group>

      <OrbitControls enablePan={false} minDistance={7} maxDistance={70} autoRotate autoRotateSpeed={0.3} />

      <EffectComposer>
        <Bloom intensity={1.1} luminanceThreshold={0.25} luminanceSmoothing={0.9} mipmapBlur radius={0.7} />
      </EffectComposer>
    </>
  );
}

export default function ForumGalaxy3D({ centerLabel }: { centerLabel?: string }) {
  const router = useRouter();
  return (
    <div className="absolute inset-0">
      <Canvas camera={{ position: [0, 16, 36], fov: 55 }} dpr={[1, 1.5]} gl={{ antialias: true }}>
        <color attach="background" args={["#04050d"]} />
        <Scene
          centerLabel={centerLabel?.trim() || "議員会館"}
          onSelect={(t) => { if (t.roomId) router.push(`/forum/${t.roomId}?from=interop`); }}
        />
      </Canvas>
    </div>
  );
}
