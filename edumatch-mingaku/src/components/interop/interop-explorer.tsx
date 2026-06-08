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

/** 演出CSS（洗練されたダークテック） */
const FX_CSS = `
  @keyframes itmFloat {
    0%,100% { transform: translate(-50%, -50%) translateY(0); }
    50%      { transform: translate(-50%, -50%) translateY(-7px); }
  }
  @keyframes itmPulseRing {
    0%   { transform: scale(0.88); opacity: 0.6; }
    70%  { transform: scale(1.38); opacity: 0; }
    100% { transform: scale(1.38); opacity: 0; }
  }
  @keyframes itmDash { to { stroke-dashoffset: -28; } }
  @keyframes itmSpinCCW { from { transform: rotate(0deg); }   to { transform: rotate(-360deg); } }
  @keyframes itmSpinCW  { from { transform: rotate(0deg); }   to { transform: rotate(360deg); } }
  @keyframes itmBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(5px); } }
  @keyframes itmTwinkle { 0%,100% { opacity: 0.15; } 50% { opacity: 0.7; } }
  @keyframes itmHueGlow {
    0%,100% { filter: drop-shadow(0 0 8px var(--g)); }
    50%      { filter: drop-shadow(0 0 16px var(--g)); }
  }
  @keyframes itmFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
`;

/* 中心からの配置（%座標、コネクタSVGと共有） */
const RX = 33;
const RY = 31;
function satXY(i: number, total: number) {
  const ang = (-90 + (360 / total) * i) * (Math.PI / 180);
  return { x: 50 + RX * Math.cos(ang), y: 50 + RY * Math.sin(ang) };
}

/** 背景（落ち着いたダーク宇宙） */
function CyberBackdrop() {
  const stars = useMemo(
    () =>
      Array.from({ length: 56 }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 85,
        d: 1 + Math.random() * 1.8,
        delay: Math.random() * 5,
        dur: 3 + Math.random() * 4,
      })),
    []
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* ベースグラデ */}
      <div
        className="absolute inset-0"
        style={{
          background: [
            "radial-gradient(ellipse 65% 50% at 50% 35%, rgba(80,30,170,0.28) 0%, transparent 60%)",
            "radial-gradient(ellipse 80% 55% at 10% 10%, rgba(0,160,220,0.18) 0%, transparent 55%)",
            "radial-gradient(ellipse 70% 55% at 92% 12%, rgba(200,30,140,0.16) 0%, transparent 55%)",
            "linear-gradient(180deg, #07021f 0%, #090428 50%, #0e0840 100%)",
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
            opacity: 0.4,
          }}
        />
      ))}
      {/* 下部のほのかな境界光 */}
      <div
        className="absolute inset-x-0 bottom-0 h-[30%]"
        style={{
          background: "linear-gradient(to top, rgba(60,20,120,0.35) 0%, transparent 100%)",
        }}
      />
      {/* 周辺ビネット */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 85% 85% at 50% 48%, transparent 60%, rgba(4,1,18,0.55) 100%)" }}
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
        {/* パルスリング（控えめ） */}
        <span
          className="absolute inset-0 rounded-full"
          style={{
            border: `1.5px solid ${glow}`,
            animation: `itmPulseRing 3.8s ease-out ${delay}s infinite`,
            opacity: 0.7,
          }}
        />
        {/* ポッド本体 */}
        <span
          className="relative grid h-full w-full place-items-center rounded-full transition-transform duration-300 group-hover:scale-108 group-active:scale-95"
          style={{
            background: `radial-gradient(circle at 40% 32%, rgba(255,255,255,0.18) 0%, ${glow}55 40%, rgba(8,4,40,0.88) 100%)`,
            border: `1.5px solid ${glow}88`,
            boxShadow: `0 0 20px ${glow}44, inset 0 1px 1px rgba(255,255,255,0.12)`,
            // @ts-expect-error CSS var
            "--g": glow,
            animation: `itmHueGlow 4.5s ease-in-out ${delay}s infinite`,
          }}
        >
          <Icon
            className="text-white/90"
            style={{ width: size * (center ? 0.34 : 0.32), height: size * (center ? 0.34 : 0.32) }}
            strokeWidth={2}
          />
        </span>
      </span>
      {/* ラベルチップ */}
      <span className="mt-2 flex flex-col items-center">
        <span
          className="rounded-full px-3 py-1 text-center font-bold leading-tight text-white backdrop-blur-sm"
          style={{
            fontSize: center ? "clamp(13px,1.5vmin,17px)" : "clamp(11px,1.3vmin,15px)",
            background: "rgba(8,5,32,0.82)",
            border: `1px solid ${glow}55`,
            boxShadow: `0 0 8px ${glow}33`,
          }}
        >
          {cat.name}
        </span>
        <span
          className="mt-1 inline-flex items-center gap-0.5 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white/75 transition group-hover:bg-white/20 group-hover:text-white/95"
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
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeDasharray="3 7"
                  vectorEffect="non-scaling-stroke"
                  style={{ animation: `itmDash 1.8s linear infinite`, opacity: 0.45 }}
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
              className="flex items-center gap-2 rounded-full px-4 py-2 text-center text-[12px] font-bold text-white/80 sm:text-sm"
              style={{
                background: "rgba(10,6,38,0.75)",
                border: "1px solid rgba(180,200,255,0.25)",
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
            className="absolute left-4 top-4 z-30 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/8 px-3.5 py-1.5 text-xs font-bold text-white/80 shadow backdrop-blur transition-colors hover:bg-white/18 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> マップに戻る
          </button>

          {/* カテゴリナビ（下部タブ） */}
          <div
            className="absolute inset-x-0 bottom-14 z-30 flex justify-center px-4"
            style={{ animation: "itmFadeIn 0.3s ease-out both" }}
          >
            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
              {categories.map((cat) => {
                const CatIcon = iconFor(cat.slug);
                const active = selected?.id === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => { setSelected(cat); setSelectedSub(null); }}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold text-white transition-all focus:outline-none"
                    style={{
                      background: active
                        ? `${cat.color || "#7ad0ff"}33`
                        : "rgba(255,255,255,0.06)",
                      border: active
                        ? `1.5px solid ${cat.color || "#7ad0ff"}88`
                        : "1px solid rgba(255,255,255,0.15)",
                      boxShadow: active ? `0 0 10px ${cat.color || "#7ad0ff"}30` : "none",
                      opacity: active ? 1 : 0.65,
                    }}
                    aria-current={active ? "page" : undefined}
                  >
                    <CatIcon className="h-3 w-3 shrink-0" />
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>

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
                      border: `1px dashed ${(selected.color || "#7ad0ff")}55`,
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
                              background: `radial-gradient(circle at 40% 32%, rgba(255,255,255,0.14) 0%, ${selected.color || "#7ad0ff"}44 40%, rgba(8,4,40,0.88) 100%)`,
                              border: active ? `2px solid ${selected.color || "#7ad0ff"}` : `1.5px solid ${(selected.color || "#7ad0ff")}66`,
                              boxShadow: active
                                ? `0 0 18px ${(selected.color || "#7ad0ff")}77`
                                : `0 0 8px ${(selected.color || "#7ad0ff")}44`,
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
                    background: "rgba(8,5,28,0.82)",
                    border: `1.5px solid ${(selected.color || "#7ad0ff")}66`,
                    boxShadow: `0 0 20px ${(selected.color || "#7ad0ff")}33`,
                    backdropFilter: "blur(8px)",
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
