"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Award,
  Bot,
  GraduationCap,
  Hand,
  Info,
  Landmark,
  Loader2,
  Network,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  isPrimary: boolean;
};
type SubCategory = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
};

/** スラッグ→アイコン */
const ICONS: Record<string, LucideIcon> = {
  information: Info,
  "giin-kaikan": Landmark,
  "ai-kentei": Award,
  interop: Network,
  edumatch: GraduationCap,
  "ai-bu": Bot,
};
function iconFor(slug: string): LucideIcon {
  return ICONS[slug] ?? Sparkles;
}

/** サイバーネオンの全演出CSS */
const FX_CSS = `
  @keyframes itmFloat {
    0%,100% { transform: translate(-50%, -50%) translateY(0); }
    50%      { transform: translate(-50%, -50%) translateY(-10px); }
  }
  @keyframes itmPulseRing {
    0%   { transform: scale(0.85); opacity: 0.9; }
    70%  { transform: scale(1.45); opacity: 0; }
    100% { transform: scale(1.45); opacity: 0; }
  }
  @keyframes itmDash { to { stroke-dashoffset: -28; } }
  @keyframes itmGridScroll { to { background-position: 0 44px, 44px 0; } }
  @keyframes itmSpinCCW { from { transform: rotate(0deg); }   to { transform: rotate(-360deg); } }
  @keyframes itmSpinCW  { from { transform: rotate(0deg); }   to { transform: rotate(360deg); } }
  @keyframes itmBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(7px); } }
  @keyframes itmTwinkle { 0%,100% { opacity: 0.25; } 50% { opacity: 1; } }
  @keyframes itmHueGlow {
    0%,100% { filter: drop-shadow(0 0 14px var(--g)) drop-shadow(0 0 30px var(--g)); }
    50%      { filter: drop-shadow(0 0 22px var(--g)) drop-shadow(0 0 48px var(--g)); }
  }
`;

/* 中心からの配置（%座標、コネクタSVGと共有） */
const RX = 33;
const RY = 31;
function satXY(i: number, total: number) {
  const ang = (-90 + (360 / total) * i) * (Math.PI / 180);
  return { x: 50 + RX * Math.cos(ang), y: 50 + RY * Math.sin(ang) };
}

/** サイバー遊園地の背景（シンセウェーブのグリッド床＋星＋ネオン） */
function CyberBackdrop() {
  const stars = useMemo(
    () =>
      Array.from({ length: 46 }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 70,
        d: 1.4 + Math.random() * 2.2,
        delay: Math.random() * 4,
        dur: 2.5 + Math.random() * 3,
      })),
    []
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* ベースのネオングラデ */}
      <div
        className="absolute inset-0"
        style={{
          background: [
            "radial-gradient(ellipse 70% 55% at 50% 38%, rgba(120,40,220,0.40) 0%, transparent 60%)",
            "radial-gradient(ellipse 90% 60% at 12% 8%, rgba(0,200,255,0.30) 0%, transparent 55%)",
            "radial-gradient(ellipse 80% 60% at 90% 14%, rgba(255,40,180,0.28) 0%, transparent 55%)",
            "linear-gradient(180deg, #07021f 0%, #0a0530 45%, #120a4a 72%, #1b0c5e 100%)",
          ].join(", "),
        }}
      />
      {/* 星 */}
      {stars.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.d,
            height: s.d,
            animation: `itmTwinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
            boxShadow: "0 0 6px rgba(180,220,255,0.9)",
          }}
        />
      ))}
      {/* シンセウェーブのグリッド床（下半分・遠近） */}
      <div
        className="absolute inset-x-0 bottom-0 h-[55%]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,230,255,0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,60,200,0.45) 1px, transparent 1px)",
          backgroundSize: "44px 44px, 44px 44px",
          transform: "perspective(420px) rotateX(62deg)",
          transformOrigin: "bottom center",
          maskImage: "linear-gradient(to top, #000 5%, transparent 95%)",
          WebkitMaskImage: "linear-gradient(to top, #000 5%, transparent 95%)",
          animation: "itmGridScroll 4.5s linear infinite",
        }}
      />
      {/* 上部ビネット */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 80% 80% at 50% 45%, transparent 55%, rgba(4,1,18,0.7) 100%)" }}
      />
    </div>
  );
}

/* ════════ カテゴリ・ノード（HTMLポッド） ════════ */
function CategoryPod({
  cat,
  style,
  size,
  center,
  delay,
  onClick,
}: {
  cat: Category;
  style: React.CSSProperties;
  size: number;
  center?: boolean;
  delay: number;
  onClick: () => void;
}) {
  const Icon = iconFor(cat.slug);
  const glow = cat.color || "#7ad0ff";
  return (
    <button
      type="button"
      onClick={onClick}
      className="group absolute z-10 flex flex-col items-center focus:outline-none"
      style={{ ...style, animation: `itmFloat 5s ease-in-out ${delay}s infinite` }}
      aria-label={`${cat.name} を開く`}
    >
      <span className="relative grid place-items-center" style={{ width: size, height: size }}>
        {/* 注意喚起のパルスリング（押せる合図） */}
        <span
          className="absolute inset-0 rounded-full"
          style={{
            border: `2px solid ${glow}`,
            animation: `itmPulseRing 2.6s ease-out ${delay}s infinite`,
          }}
        />
        {/* ポッド本体 */}
        <span
          className="relative grid h-full w-full place-items-center rounded-full transition-transform duration-300 group-hover:scale-110 group-active:scale-95"
          style={{
            background: `radial-gradient(circle at 38% 30%, rgba(255,255,255,0.95) 0%, ${glow} 42%, rgba(8,4,40,0.92) 100%)`,
            border: "2px solid rgba(255,255,255,0.65)",
            // @ts-expect-error CSS var
            "--g": glow,
            animation: `itmHueGlow 3.4s ease-in-out ${delay}s infinite`,
          }}
        >
          <Icon
            className="text-white drop-shadow"
            style={{ width: size * (center ? 0.34 : 0.32), height: size * (center ? 0.34 : 0.32) }}
            strokeWidth={2.2}
          />
        </span>
      </span>
      {/* ラベルチップ */}
      <span className="mt-2 flex flex-col items-center">
        <span
          className="rounded-full px-3 py-1 text-center font-bold leading-tight text-white shadow-lg backdrop-blur-sm"
          style={{
            fontSize: center ? "clamp(13px,1.5vmin,17px)" : "clamp(11px,1.3vmin,15px)",
            background: "rgba(10,6,42,0.78)",
            border: `1.5px solid ${glow}`,
            boxShadow: `0 0 14px ${glow}66`,
          }}
        >
          {cat.name}
        </span>
        <span
          className="mt-1 inline-flex items-center gap-0.5 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white/90 opacity-90 transition group-hover:bg-white/30"
        >
          {center ? "ここから探索 ▶" : "タップ ▶"}
        </span>
      </span>
    </button>
  );
}

export function InteropExplorer() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [selected, setSelected] = useState<Category | null>(null);
  const [selectedSub, setSelectedSub] = useState<SubCategory | null>(null);

  // 画面幅に応じてポッドサイズを調整
  const [vw, setVw] = useState(1280);
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const SAT_SIZE = vw < 480 ? 84 : vw < 768 ? 100 : 120;
  const CENTER_SIZE = vw < 480 ? 120 : vw < 768 ? 144 : 172;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/interop/categories")
      .then((r) => r.json())
      .then((d) => { if (!cancelled && Array.isArray(d.categories)) setCategories(d.categories); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoadingCats(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selected) { setSubCategories([]); setSelectedSub(null); return; }
    let cancelled = false;
    setLoadingSubs(true);
    setSelectedSub(null);
    fetch(`/api/interop/sub-categories?categoryId=${selected.id}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled && Array.isArray(d.subCategories)) setSubCategories(d.subCategories); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoadingSubs(false); });
    return () => { cancelled = true; };
  }, [selected]);

  const primary = categories.find((c) => c.isPrimary) ?? null;
  const satellites = categories.filter((c) => !c.isPrimary);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <style>{FX_CSS}</style>
      <CyberBackdrop />

      {/* ════════ ローディング / 空 ════════ */}
      {loadingCats ? (
        <div className="absolute inset-0 grid place-items-center text-white/70">
          <span className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" /> マップを起動中…
          </span>
        </div>
      ) : categories.length === 0 ? (
        <div className="absolute inset-0 grid place-items-center px-8 text-center text-sm text-white/70">
          まだカテゴリがありません。管理画面（/admin/interop）から追加してください。
        </div>
      ) : !selected ? (
        /* ════════ レベル1：カテゴリマップ ════════ */
        <div className="absolute inset-0">
          {/* コネクタ（中心→各エリアのネオン光路） */}
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            {satellites.map((cat, i) => {
              const { x, y } = satXY(i, satellites.length);
              return (
                <line
                  key={cat.id}
                  x1="50" y1="50" x2={x} y2={y}
                  stroke={cat.color || "#7ad0ff"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray="4 6"
                  vectorEffect="non-scaling-stroke"
                  style={{ animation: `itmDash 1.1s linear infinite`, opacity: 0.7 }}
                />
              );
            })}
          </svg>

          {/* サテライト（各コンテンツ） */}
          {satellites.map((cat, i) => {
            const { x, y } = satXY(i, satellites.length);
            return (
              <CategoryPod
                key={cat.id}
                cat={cat}
                size={SAT_SIZE}
                style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)" }}
                delay={i * 0.4}
                onClick={() => setSelected(cat)}
              />
            );
          })}

          {/* 中心：インフォメーション（少し大きめ） */}
          {primary && (
            <CategoryPod
              cat={primary}
              center
              size={CENTER_SIZE}
              style={{ left: "50%", top: "50%", transform: "translate(-50%,-50%)" }}
              delay={0}
              onClick={() => setSelected(primary)}
            />
          )}

          {/* 初見ユーザー向けガイド */}
          <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center px-4">
            <div
              className="flex items-center gap-2 rounded-full px-4 py-2 text-center text-[12px] font-bold text-white shadow-lg sm:text-sm"
              style={{
                background: "rgba(12,6,48,0.72)",
                border: "1.5px solid rgba(0,230,255,0.55)",
                boxShadow: "0 0 18px rgba(0,200,255,0.35)",
                backdropFilter: "blur(6px)",
              }}
            >
              <Hand className="h-4 w-4 shrink-0 text-cyan-300" style={{ animation: "itmBob 1.4s ease-in-out infinite" }} />
              光るエリアをタップして、セミナー・展示・登壇情報を探検しよう
            </div>
          </div>
        </div>
      ) : (
        /* ════════ レベル2：サブカテゴリ（円周配置・反時計回り） ════════ */
        <div className="absolute inset-0">
          {/* 戻る */}
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="absolute left-4 top-4 z-30 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white shadow backdrop-blur transition-colors hover:bg-white/25"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> マップに戻る
          </button>

          {loadingSubs ? (
            <div className="absolute inset-0 grid place-items-center text-white/70">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              {/* 回転リング */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <div
                  className="relative"
                  style={{
                    width: "min(74vmin, 560px)",
                    height: "min(74vmin, 560px)",
                    animation: "itmSpinCCW 60s linear infinite",
                  }}
                >
                  {/* リングの軌道線 */}
                  <span
                    className="absolute inset-[6%] rounded-full"
                    style={{
                      border: `1.5px dashed ${(selected.color || "#7ad0ff")}88`,
                      boxShadow: `0 0 30px ${(selected.color || "#7ad0ff")}44 inset`,
                    }}
                  />
                  {subCategories.map((sub, i) => {
                    const ang = (360 / subCategories.length) * i;
                    const a = (ang - 90) * (Math.PI / 180);
                    const r = 47; // % of ring
                    const left = 50 + r * Math.cos(a);
                    const top = 50 + r * Math.sin(a);
                    const active = selectedSub?.id === sub.id;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setSelectedSub(active ? null : sub)}
                        className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center focus:outline-none"
                        style={{ left: `${left}%`, top: `${top}%` }}
                      >
                        {/* ラベル本体は逆回転で正立させる */}
                        <span
                          className="flex flex-col items-center"
                          style={{ animation: "itmSpinCW 60s linear infinite" }}
                        >
                          <span
                            className="grid h-12 w-12 place-items-center rounded-full text-white transition-transform hover:scale-110 sm:h-14 sm:w-14"
                            style={{
                              background: `radial-gradient(circle at 38% 30%, #fff 0%, ${selected.color || "#7ad0ff"} 45%, rgba(8,4,40,0.9) 100%)`,
                              border: active ? "2.5px solid #fff" : "2px solid rgba(255,255,255,0.6)",
                              boxShadow: `0 0 16px ${(selected.color || "#7ad0ff")}aa`,
                            }}
                          >
                            <Sparkles className="h-4 w-4" />
                          </span>
                          <span
                            className="mt-1.5 max-w-[110px] rounded-full px-2.5 py-0.5 text-center text-[11px] font-bold leading-tight text-white shadow"
                            style={{
                              background: "rgba(10,6,42,0.82)",
                              border: `1px solid ${(selected.color || "#7ad0ff")}aa`,
                            }}
                          >
                            {sub.name}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 中心ハブ：カテゴリ or 選択中サブの詳細 */}
              <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 w-[min(40vmin,260px)] -translate-x-1/2 -translate-y-1/2 text-center">
                <div
                  className="rounded-3xl px-5 py-5"
                  style={{
                    background: "rgba(10,6,42,0.78)",
                    border: `2px solid ${selected.color || "#7ad0ff"}`,
                    boxShadow: `0 0 30px ${(selected.color || "#7ad0ff")}66`,
                    backdropFilter: "blur(6px)",
                  }}
                >
                  {(() => {
                    const Icon = iconFor(selected.slug);
                    return <Icon className="mx-auto mb-2 h-7 w-7 text-white" />;
                  })()}
                  <p className="text-base font-bold text-white">
                    {selectedSub ? selectedSub.name : selected.name}
                  </p>
                  <p className="mt-1 text-[12px] leading-relaxed text-white/70">
                    {selectedSub
                      ? selectedSub.description || "詳細は会場・公式でご案内します。"
                      : selected.description || "まわりのアイコンをタップ"}
                  </p>
                  {subCategories.length === 0 && (
                    <p className="mt-2 text-[11px] text-white/50">
                      サブカテゴリは準備中です。
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
