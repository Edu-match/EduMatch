"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Html,
  OrbitControls,
  Stars,
  Sparkles,
  Environment,
  Instances,
  Instance,
  Trail,
  Billboard,
  Line,
  PerformanceMonitor,
  AdaptiveDpr,
  useGLTF,
} from "@react-three/drei";
import {
  Bloom,
  EffectComposer,
  Vignette,
  ChromaticAberration,
  Noise,
  GodRays,
} from "@react-three/postprocessing";
import { BlendFunction, KernelSize } from "postprocessing";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { INTEROP_PRIORITY_TOPICS, MAJOR_META, type InteropPriorityTopic } from "@/lib/interop-priority-topics";

const MAJORS = Object.keys(MAJOR_META);
const ASSET = (f: string) => `/3d/${f}`;

useGLTF.preload(ASSET("star.glb"));
useGLTF.preload(ASSET("planet_gas.glb"));
useGLTF.preload(ASSET("ring.glb"));
useGLTF.preload(ASSET("asteroid.glb"));

const labelStyle = (color: string, size = 11): React.CSSProperties => ({
  whiteSpace: "nowrap",
  fontSize: size,
  fontWeight: 700,
  color: "#fff",
  background: `linear-gradient(135deg, rgba(8,11,32,0.72), ${color}55)`,
  border: `1px solid ${color}aa`,
  borderRadius: 9,
  padding: "1.5px 7px",
  boxShadow: `0 2px 12px rgba(0,0,0,0.5), 0 0 18px ${color}33`,
  textShadow: "0 1px 2px rgba(0,0,0,0.6)",
  backdropFilter: "blur(2px)",
});

// 投稿数 → 玉の倍率（3Dなので大胆に大きく）
function topicScale(posts: number): number {
  return 1 + Math.min(3.6, posts * 0.14);
}

/** GLB から最初のメッシュを取り出す。 */
function useGlbMesh(url: string): THREE.Mesh | null {
  const { scene } = useGLTF(url);
  return useMemo(() => {
    let mesh: THREE.Mesh | null = null;
    scene.traverse((o) => {
      if (!mesh && (o as THREE.Mesh).isMesh) mesh = o as THREE.Mesh;
    });
    return mesh;
  }, [scene]);
}

/** Canvas で放射状グローのスプライト用テクスチャを生成。 */
function makeGlowTexture(inner: string, mid: string): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, inner);
  g.addColorStop(0.35, mid);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** 雲状ネビュラのテクスチャ（複数色のソフトブロブ）。 */
function makeNebulaTexture(colors: string[]): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 512, 512);
  let seed = 11;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 26; i++) {
    const x = rnd() * 512, y = rnd() * 512, r = 60 + rnd() * 170;
    const col = colors[Math.floor(rnd() * colors.length)];
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** 加算合成の発光ハロー（玉の周囲をふわっと光らせて高級感を出す）。raycast 無効でクリックは透過。 */
function Glow({ radius, color, opacity = 0.5 }: { radius: number; color: string; opacity?: number }) {
  return (
    <mesh raycast={() => null}>
      <sphereGeometry args={[radius, 24, 24]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

/** 公転軌道を表す極薄リング（XZ平面）。奥行きと秩序感を与える。 */
function OrbitRing({ radius, color }: { radius: number; color: string }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
      <ringGeometry args={[radius - 0.06, radius + 0.06, 128]} />
      <meshBasicMaterial color={color} transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
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
      <group scale={s * (hover ? 1.2 : 1)}>
        <mesh raycast={() => null}>
          <sphereGeometry args={[0.55, 40, 40]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={hover ? 1.7 : 0.85}
            metalness={0.45}
            roughness={0.25}
            toneMapped={false}
          />
        </mesh>
        <Glow radius={0.92} color={color} opacity={hover ? 0.55 : 0.3} />
      </group>
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

/** 惑星（Blender製ガス惑星GLBをメジャー色にティント）＋一部にリング＋既存のGlow。 */
function GasPlanet({ color, withRing }: { color: string; withRing: boolean }) {
  const planet = useGlbMesh(ASSET("planet_gas.glb"));
  const ring = useGlbMesh(ASSET("ring.glb"));
  const ref = useRef<THREE.Group>(null);
  const mat = useMemo(() => {
    if (!planet) return null;
    const m = (planet.material as THREE.MeshStandardMaterial).clone();
    m.color = new THREE.Color(color);
    m.emissive = new THREE.Color(color).multiplyScalar(0.35);
    m.emissiveIntensity = 0.5;
    m.roughness = 0.58;
    m.metalness = 0.1;
    m.toneMapped = false;
    return m;
  }, [planet, color]);
  const ringMat = useMemo(() => {
    if (!ring) return null;
    const m = (ring.material as THREE.MeshStandardMaterial).clone();
    m.transparent = true;
    m.depthWrite = false;
    m.side = THREE.DoubleSide;
    m.emissive = new THREE.Color(color).multiplyScalar(0.25);
    m.emissiveIntensity = 0.4;
    m.toneMapped = false;
    return m;
  }, [ring, color]);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.06;
  });
  if (!planet || !mat) return null;
  return (
    <group scale={1.3}>
      <group ref={ref}>
        <mesh geometry={planet.geometry} material={mat} />
        {withRing && ring && ringMat && (
          <mesh geometry={ring.geometry} material={ringMat} rotation={[0.42, 0, 0.12]} scale={1.05} />
        )}
      </group>
      <Glow radius={1.55} color={color} opacity={0.32} />
    </group>
  );
}

/** 中心恒星：Blender製GLB＋脈動＋多層コロナ。GodRays用に sun(明るいコア) を公開。 */
function Star({ onSun }: { onSun: (m: THREE.Mesh | null) => void }) {
  const star = useGlbMesh(ASSET("star.glb"));
  const skinRef = useRef<THREE.Mesh>(null);
  const glow = useMemo(() => makeGlowTexture("rgba(255,247,224,1)", "rgba(255,176,84,0.5)"), []);
  const starMat = useMemo(() => {
    if (!star) return null;
    const m = (star.material as THREE.MeshStandardMaterial).clone();
    m.emissive = new THREE.Color("#ffd9a0");
    m.emissiveIntensity = 4.2;
    m.toneMapped = false;
    return m;
  }, [star]);
  useEffect(() => () => onSun(null), [onSun]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const pulse = 1 + Math.sin(t * 1.4) * 0.025 + Math.sin(t * 5.1) * 0.008;
    if (skinRef.current) skinRef.current.scale.setScalar(2.4 * pulse);
    if (starMat) starMat.emissiveIntensity = 4.2 + Math.sin(t * 2.3) * 0.6;
  });
  return (
    <group>
      {/* GodRays の発生源になる明るいコア */}
      <mesh ref={(m) => onSun(m)} scale={2.0}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#fff4d8" toneMapped={false} />
      </mesh>
      {/* Blender製の恒星サーフェス（脈動） */}
      {star && starMat && <mesh ref={skinRef} geometry={star.geometry} material={starMat} scale={2.4} />}
      {/* 多層コロナ（並列セッション由来の質感を踏襲） */}
      <Glow radius={3.3} color="#ffcf9a" opacity={0.6} />
      <Glow radius={4.6} color="#ffa860" opacity={0.26} />
      <Glow radius={6.6} color="#ff8a4a" opacity={0.13} />
      {/* コロナ（加算グローのビルボード） */}
      <Billboard>
        <mesh raycast={() => null}>
          <planeGeometry args={[18, 18]} />
          <meshBasicMaterial map={glow} transparent blending={THREE.AdditiveBlending} depthWrite={false} opacity={0.9} toneMapped={false} />
        </mesh>
      </Billboard>
    </group>
  );
}

/** 小惑星帯（Blender製GLBをインスタンス化）。 */
function AsteroidBelt({ count = 80, radius = 9 }: { count?: number; radius?: number }) {
  const rock = useGlbMesh(ASSET("asteroid.glb"));
  const ref = useRef<THREE.Group>(null);
  const items = useMemo(() => {
    let seed = 5;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    return new Array(count).fill(0).map(() => {
      const a = rnd() * Math.PI * 2;
      const r = radius + (rnd() - 0.5) * 2.4;
      return {
        position: [Math.cos(a) * r, (rnd() - 0.5) * 1.2, Math.sin(a) * r] as [number, number, number],
        rotation: [rnd() * 6, rnd() * 6, rnd() * 6] as [number, number, number],
        scale: 0.35 + rnd() * 0.7,
      };
    });
  }, [count, radius]);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.03;
  });
  if (!rock) return null;
  return (
    <group ref={ref}>
      <Instances geometry={rock.geometry} material={rock.material as THREE.Material} limit={count}>
        {items.map((it, i) => (
          <Instance key={i} position={it.position} rotation={it.rotation} scale={it.scale} />
        ))}
      </Instances>
    </group>
  );
}

/** 流星（周期的に流す）。 */
function Meteor({ seed }: { seed: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const state = useRef({ t: 0, from: new THREE.Vector3(), to: new THREE.Vector3(), dur: 2.4, wait: seed * 1.7 });
  const respawn = (rnd: () => number) => {
    const s = state.current;
    const ang = rnd() * Math.PI * 2;
    const R = 60;
    s.from.set(Math.cos(ang) * R, 20 + rnd() * 30, Math.sin(ang) * R);
    s.to.set(-Math.cos(ang) * R * 0.4 + (rnd() - 0.5) * 40, -10 - rnd() * 20, -Math.sin(ang) * R * 0.4);
    s.dur = 1.6 + rnd() * 1.6;
    s.wait = 1 + rnd() * 5;
    s.t = 0;
  };
  useEffect(() => { respawn(Math.random); }, []);
  useFrame((_, dt) => {
    const s = state.current;
    s.t += dt;
    if (!ref.current) return;
    if (s.t < s.wait) { ref.current.visible = false; return; }
    const k = (s.t - s.wait) / s.dur;
    if (k >= 1) { respawn(Math.random); return; }
    ref.current.visible = true;
    ref.current.position.lerpVectors(s.from, s.to, k);
  });
  return (
    <Trail width={3.2} length={7} color={new THREE.Color("#bcd6ff")} attenuation={(w) => w * w}>
      <mesh ref={ref}>
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshBasicMaterial color="#eaf3ff" toneMapped={false} />
      </mesh>
    </Trail>
  );
}

/** ドリフトするネビュラ雲（加算合成のビルボード数枚）。 */
function Nebula() {
  const texA = useMemo(() => makeNebulaTexture(["rgba(120,90,255,0.5)", "rgba(70,150,255,0.4)", "rgba(180,90,220,0.35)"]), []);
  const texB = useMemo(() => makeNebulaTexture(["rgba(40,180,200,0.4)", "rgba(90,120,255,0.4)", "rgba(160,80,230,0.3)"]), []);
  const g1 = useRef<THREE.Group>(null);
  const g2 = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (g1.current) g1.current.rotation.z += dt * 0.004;
    if (g2.current) g2.current.rotation.z -= dt * 0.003;
  });
  return (
    <group>
      <group ref={g1} position={[-24, 8, -42]}>
        <mesh raycast={() => null}>
          <planeGeometry args={[95, 95]} />
          <meshBasicMaterial map={texA} transparent blending={THREE.AdditiveBlending} depthWrite={false} opacity={0.5} toneMapped={false} />
        </mesh>
      </group>
      <group ref={g2} position={[32, -10, -54]}>
        <mesh raycast={() => null}>
          <planeGeometry args={[115, 115]} />
          <meshBasicMaterial map={texB} transparent blending={THREE.AdditiveBlending} depthWrite={false} opacity={0.42} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

function PlanetSystem({
  major, planetRadius, angle0, topics, counts, spin, pausedRef, onHover, onSelect, withRing, threeAxis,
}: { major: string; planetRadius: number; angle0: number; topics: InteropPriorityTopic[]; counts: Map<string, number>; spin: boolean; pausedRef: React.MutableRefObject<boolean>; onHover: (v: boolean) => void; onSelect: (t: InteropPriorityTopic) => void; withRing: boolean; threeAxis: boolean }) {
  const orbitRef = useRef<THREE.Group>(null);
  const moonsRef = useRef<THREE.Group>(null);
  const color = MAJOR_META[major]?.color ?? "#C9D4F6";
  // 既定では公転を止めて「動かない＝押しやすい」状態に（回転ONのときだけゆっくり公転）。
  useFrame((_, dt) => {
    if (!spin || pausedRef.current) return;
    if (orbitRef.current) orbitRef.current.rotation.y += dt * 0.012;
    if (moonsRef.current) moonsRef.current.rotation.y += dt * 0.05;
  });
  // トピックの配置を一度だけ計算（玉描画とノード接続線で共有）。
  // X/Y の2軸は固定。三軸表示ONのとき Z に「週次の活発さ」(暫定=投稿数)を割り当てる。
  const layout = useMemo(() => topics.map((t, i) => {
    const posts = counts.get(t.roomId) ?? 0;
    const a = (i / Math.max(1, topics.length)) * Math.PI * 2;
    const r = 4 + topicScale(posts) * 0.8 + (i % 2) * 1.6;
    const y = ((i % 3) - 1) * 0.9;
    // group rotation Y(a) を point(r,y,0) に適用した実座標（線の頂点に使用）
    const pos: [number, number, number] = [r * Math.cos(a), y, -r * Math.sin(a)];
    return { topic: t, posts, a, r, y, pos };
  }), [topics, counts]);
  // 三軸目（週次分布）：投稿数を Z オフセットに（既存2軸は不変）。
  const zOf = (posts: number) => (threeAxis ? Math.min(6, posts * 0.5) - 1.5 : 0);
  // 星座のように同一メジャー内のトピックを線で結ぶ（閉ループ）。
  const linePoints = useMemo(() => {
    if (layout.length < 2) return [] as [number, number, number][];
    const pts = layout.map((m) => [m.pos[0], m.pos[1] + zOf(m.posts), m.pos[2]] as [number, number, number]);
    return [...pts, pts[0]];
  }, [layout, threeAxis]);
  return (
    <group ref={orbitRef} rotation={[0, angle0, 0]}>
      <group position={[planetRadius, 0, 0]}>
        <GasPlanet color={color} withRing={withRing} />
        <Html center distanceFactor={22} position={[0, 2.4, 0]} style={{ pointerEvents: "none" }} zIndexRange={[20, 10]}>
          <div style={{ ...labelStyle(color, 12.5), fontWeight: 800 }}>{MAJOR_META[major]?.label ?? major}</div>
        </Html>
        <group ref={moonsRef}>
          {/* ノード接続線（類似カテゴリ＝同一メジャーを星座状に結ぶ） */}
          {linePoints.length > 1 && (
            <Line points={linePoints} color={color} lineWidth={1} transparent opacity={0.28} depthWrite={false} />
          )}
          {layout.map(({ topic, posts, a, r, y }) => (
            <group key={topic.no} rotation={[0, a, 0]}>
              <group position={[r, y + (threeAxis ? Math.min(6, posts * 0.5) - 1.5 : 0), 0]}>
                <Moon topic={topic} color={color} posts={posts} onHover={onHover} onSelect={() => onSelect(topic)} />
              </group>
            </group>
          ))}
        </group>
      </group>
    </group>
  );
}

/** 起動時のカメラ・フライイン（完了後に OrbitControls へ制御を委譲）。 */
function CameraIntro({ controlsRef }: { controlsRef: React.MutableRefObject<any> }) {
  const { camera } = useThree();
  const done = useRef(false);
  const t = useRef(0);
  const start = useMemo(() => new THREE.Vector3(0, 58, 124), []);
  const target = useMemo(() => new THREE.Vector3(0, 22, 52), []);
  useEffect(() => {
    camera.position.copy(start);
    if (controlsRef.current) controlsRef.current.enabled = false;
  }, [camera, start, controlsRef]);
  useFrame((_, dt) => {
    if (done.current) return;
    t.current = Math.min(1, t.current + dt / 2.6);
    const e = 1 - Math.pow(1 - t.current, 3); // easeOutCubic
    camera.position.lerpVectors(start, target, e);
    camera.lookAt(0, 0, 0);
    if (t.current >= 1) {
      done.current = true;
      if (controlsRef.current) controlsRef.current.enabled = true;
    }
  });
  return null;
}

function Scene({ centerLabel, counts, spin, threeAxis, quality, onSelect }: { centerLabel: string; counts: Map<string, number>; spin: boolean; threeAxis: boolean; quality: number; onSelect: (t: InteropPriorityTopic) => void }) {
  const grouped = useMemo(
    () => MAJORS.map((m) => ({ major: m, topics: INTEROP_PRIORITY_TOPICS.filter((t) => t.major === m) })),
    [],
  );
  const planetRadii = useMemo(() => grouped.map((_, i) => 15 + (i % 3) * 5), [grouped]);
  // ホバー中は公転＋自動回転を止める（回転ONのとき用）。
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const onHover = (v: boolean) => { pausedRef.current = v; setPaused(v); };
  const [sun, setSun] = useState<THREE.Mesh | null>(null);
  const controlsRef = useRef<any>(null);

  return (
    <>
      {/* 奥行きを出す霧（遠景の星と惑星が深さ方向にフェード） */}
      <fog attach="fog" args={["#05060f", 70, 200]} />

      {/* HDRI 環境（GLBの反射・環境光に効かせる。背景は別途 color/Stars） */}
      <Environment files={ASSET("nightsky_1k.hdr")} environmentIntensity={0.32} />

      {/* ライティング：弱い環境光＋空/地の色味＋中心の恒星光＋2方向のカラーリムライト */}
      <ambientLight intensity={0.3} />
      <hemisphereLight args={["#9fc0ff", "#1a1330", 0.45]} />
      <pointLight position={[0, 0, 0]} intensity={4.0} distance={160} decay={1.4} color="#ffe9c8" />
      <directionalLight position={[40, 30, 20]} intensity={0.7} color="#a9c8ff" />
      <directionalLight position={[-35, -10, -25]} intensity={0.5} color="#c89bff" />

      {/* 二層の星空（粒の大小で密度感）＋ネビュラ＋宇宙塵 */}
      <Stars radius={150} depth={70} count={2600} factor={3.2} fade speed={0.18} />
      <Stars radius={90} depth={40} count={900} factor={5} fade speed={0.4} />
      <Nebula />
      <Sparkles count={140} scale={[120, 50, 120]} size={2.2} speed={0.25} color="#bcd4ff" opacity={0.55} />

      {/* 中心ハブ＝恒星（Blender製サーフェス＋多層コロナ） */}
      <Star onSun={setSun} />
      <Html center distanceFactor={28} position={[0, 4.6, 0]} style={{ pointerEvents: "none" }} zIndexRange={[40, 30]}>
        <div style={{ ...labelStyle("#ffd9a0", 13.5), fontWeight: 800 }}>{centerLabel}</div>
      </Html>

      {/* 小惑星帯（Blender製インスタンス。品質に応じて数を調整） */}
      <group rotation={[0.18, 0, 0.05]}>
        <AsteroidBelt count={quality >= 1 ? 64 : 28} radius={9} />
      </group>

      {/* 太陽系（少し傾けて円盤っぽく・大きく広げる） */}
      <group rotation={[0.16, 0, 0.04]}>
        {/* 公転軌道リング */}
        {planetRadii.map((r, i) => (
          <OrbitRing key={`ring-${i}`} radius={r} color={MAJOR_META[grouped[i].major]?.color ?? "#9fb4e8"} />
        ))}
        {grouped.map((g, i) => (
          <PlanetSystem
            key={g.major}
            major={g.major}
            planetRadius={planetRadii[i]}
            angle0={(i / MAJORS.length) * Math.PI * 2}
            topics={g.topics}
            counts={counts}
            spin={spin}
            pausedRef={pausedRef}
            onHover={onHover}
            onSelect={onSelect}
            withRing={i % 2 === 0}
            threeAxis={threeAxis}
          />
        ))}
      </group>

      {/* 流星 */}
      <Meteor seed={0} />
      <Meteor seed={1} />
      <Meteor seed={2} />

      <OrbitControls ref={controlsRef} enablePan={false} minDistance={8} maxDistance={130} autoRotate={spin && !paused} autoRotateSpeed={0.12} enableDamping dampingFactor={0.08} />
      <CameraIntro controlsRef={controlsRef} />

      {/* ポスプロは品質レベルで増減（低fps時は GodRays/色収差を切ってカクつき回避） */}
      <EffectComposer multisampling={0}>
        <Bloom intensity={quality >= 1 ? 1.3 : 1.0} luminanceThreshold={0.22} luminanceSmoothing={0.9} mipmapBlur kernelSize={quality >= 1 ? KernelSize.LARGE : KernelSize.MEDIUM} radius={0.8} />
        {quality >= 1 && sun ? (
          <GodRays sun={sun} blendFunction={BlendFunction.SCREEN} samples={36} density={0.93} decay={0.92} weight={0.3} blur />
        ) : (
          <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.03} />
        )}
        {quality >= 1 ? (
          <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={[0.0007, 0.0011]} />
        ) : (
          <></>
        )}
        <Vignette eskil={false} offset={0.22} darkness={0.85} />
      </EffectComposer>
    </>
  );
}

export default function ForumGalaxy3D({ centerLabel }: { centerLabel?: string }) {
  const router = useRouter();
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [spin, setSpin] = useState(false); // 既定は静止（押しやすさ優先）。トグルで回転。
  const [threeAxis, setThreeAxis] = useState(false); // 三軸表示（週次分布）。既定OFF＝二軸固定。
  const [quality, setQuality] = useState(1); // 1=高品質 / 0=軽量（低fps時に自動降格）。

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
      <Canvas
        camera={{ position: [0, 58, 124], fov: 55 }}
        dpr={[1, 1.6]}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05, powerPreference: "high-performance" }}
      >
        {/* 深い宇宙の背景（単色より奥行きが出る） */}
        <color attach="background" args={["#05060f"]} />
        {/* fpsが落ちたら品質を自動降格（カクつき対策）。回復で復帰。 */}
        <PerformanceMonitor onDecline={() => setQuality(0)} onIncline={() => setQuality(1)} />
        <AdaptiveDpr pixelated />
        <Suspense fallback={null}>
          <Scene
            centerLabel={centerLabel?.trim() || "議員会館"}
            counts={counts}
            spin={spin}
            threeAxis={threeAxis}
            quality={quality}
            onSelect={(t) => { if (t.roomId) router.push(`/forum/${t.roomId}?from=interop`); }}
          />
        </Suspense>
      </Canvas>
      {/* 操作トグル群（右下） */}
      <div className="absolute bottom-4 right-4 z-40 flex flex-col items-end gap-2">
        {/* 三軸表示（週次分布）。既存2軸は固定、ONで3軸目(Z=週次の活発さ)を展開 */}
        <button
          type="button"
          onClick={() => setThreeAxis((v) => !v)}
          className={`rounded-full border px-3 py-1.5 text-xs font-bold backdrop-blur transition ${threeAxis ? "border-sky-300/50 bg-sky-400/20 text-white" : "border-white/15 bg-[#0a1024]/80 text-white/80 hover:text-white"}`}
        >
          {threeAxis ? "◳ 三軸表示：ON" : "◰ 三軸表示：OFF"}
        </button>
        {/* 回転 ON/OFF（既定OFF＝静止で押しやすい。ドラッグで自由に回せます） */}
        <button
          type="button"
          onClick={() => setSpin((v) => !v)}
          className="rounded-full border border-white/15 bg-[#0a1024]/80 px-3 py-1.5 text-xs font-bold text-white/80 backdrop-blur transition hover:text-white"
        >
          {spin ? "⏸ 回転を止める" : "▶ 回転"}
        </button>
      </div>
      <p className="pointer-events-none absolute bottom-4 left-4 z-40 text-[11px] text-white/45">ドラッグで回転・ホイールで拡大／玉やタイトルをタップで掲示板へ</p>
    </div>
  );
}
