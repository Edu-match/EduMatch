"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Award,
  Bot,
  GraduationCap,
  Hand,
  Info,
  Landmark,
  LayoutGrid,
  Loader2,
  MessageCircle,
  Network,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { InteropBackdrop } from "@/components/interop/interop-backdrop";
import type { InteropThemeMode } from "@/lib/interop-settings";

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

/** 演出CSS（静かなダーク・星図） */
const FX_CSS = `
  @keyframes itmFloat {
    0%,100% { transform: translate(-50%, -50%) translateY(0); }
    50%      { transform: translate(-50%, -50%) translateY(-6px); }
  }
  @keyframes itmFloatY {
    0%,100% { transform: translateY(0); }
    50%      { transform: translateY(-5px); }
  }
  @keyframes itmDash { to { stroke-dashoffset: -22; } }
  @keyframes itmBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(4px); } }
  @keyframes itmFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes itmHalo { 0%,100% { opacity: 0.35; } 50% { opacity: 0.6; } }
`;

/* 中心からの配置（%座標、コネクタSVGと共有） */
const RX = 33;
const RY = 31;
function satXY(i: number, total: number) {
  const ang = (-90 + (360 / total) * i) * (Math.PI / 180);
  return { x: 50 + RX * Math.cos(ang), y: 50 + RY * Math.sin(ang) };
}

/* ════════ カテゴリ・ノード ════════ */
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
  const glow = cat.color || "#9fb4e8";
  return (
    <button
      type="button"
      onClick={onClick}
      className="group absolute z-10 flex flex-col items-center focus:outline-none"
      style={{ ...style, animation: `itmFloat 6s ease-in-out ${delay}s infinite` }}
      aria-label={`${cat.name} を開く`}
    >
      <span className="relative grid place-items-center" style={{ width: size, height: size }}>
        {/* ほのかなハロー */}
        <span
          className="absolute rounded-full"
          style={{
            inset: "-14%",
            background: `radial-gradient(circle, ${glow}33 0%, transparent 70%)`,
            animation: `itmHalo 4.5s ease-in-out ${delay}s infinite`,
          }}
        />
        {/* ポッド本体（ガラス円） */}
        <span
          className="relative grid h-full w-full place-items-center rounded-full transition-transform duration-300 group-hover:scale-105 group-active:scale-95"
          style={{
            background: `radial-gradient(circle at 38% 30%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 45%, rgba(10,14,40,0.85) 100%)`,
            border: `1px solid ${glow}55`,
            boxShadow: `0 4px 24px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.10)`,
          }}
        >
          <Icon
            className="text-white/85"
            style={{ width: size * (center ? 0.34 : 0.32), height: size * (center ? 0.34 : 0.32), color: glow }}
            strokeWidth={1.8}
          />
        </span>
      </span>
      {/* ラベル */}
      <span className="mt-2 flex flex-col items-center">
        <span
          className="rounded-full px-3 py-1 text-center font-bold leading-tight text-white/90 backdrop-blur-sm"
          style={{
            fontSize: center ? "clamp(13px,1.5vmin,17px)" : "clamp(11px,1.3vmin,15px)",
            background: "rgba(8,11,32,0.7)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {cat.name}
        </span>
        <span className="mt-1 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide text-white/45 transition group-hover:text-white/70">
          {center ? "ここから探索" : "タップ"}
        </span>
      </span>
    </button>
  );
}

export function InteropExplorer({
  themeMode = "auto",
  guideText = "気になるエリアをタップして、セミナー・展示・登壇情報を探そう",
}: {
  themeMode?: InteropThemeMode;
  guideText?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const catParam = searchParams.get("cat");
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [selected, setSelected] = useState<Category | null>(null);

  // 画面幅に応じてポッドサイズを調整
  const [vw, setVw] = useState(1280);
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const SAT_SIZE = vw < 480 ? 82 : vw < 768 ? 98 : 116;
  const CENTER_SIZE = vw < 480 ? 116 : vw < 768 ? 140 : 168;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/interop/categories")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !Array.isArray(d.categories)) return;
        setCategories(d.categories);
        // ?cat=<id> が指定されていれば、その大カテゴリを開いた状態で復元する
        if (catParam) {
          const match = d.categories.find((c: Category) => c.id === catParam);
          if (match) setSelected(match);
        }
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoadingCats(false); });
    return () => { cancelled = true; };
    // catParam は初回ロード時のみ参照（依存に入れるとマップ操作中に再選択されるため除外）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selected) { setSubCategories([]); return; }
    let cancelled = false;
    setLoadingSubs(true);
    fetch(`/api/interop/sub-categories?categoryId=${selected.id}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled && Array.isArray(d.subCategories)) setSubCategories(d.subCategories); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoadingSubs(false); });
    return () => { cancelled = true; };
  }, [selected]);

  const primary = categories.find((c) => c.isPrimary) ?? null;
  const satellites = categories.filter((c) => !c.isPrimary);
  const accent = selected?.color || "#9fb4e8";

  return (
    <div className="absolute inset-0 overflow-hidden">
      <style>{FX_CSS}</style>
      <InteropBackdrop themeMode={themeMode} />

      {/* ════════ ローディング / 空 ════════ */}
      {loadingCats ? (
        <div className="absolute inset-0 grid place-items-center text-white/60">
          <span className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" /> マップを起動中…
          </span>
        </div>
      ) : categories.length === 0 ? (
        <div className="absolute inset-0 grid place-items-center px-8 text-center text-sm text-white/60">
          まだカテゴリがありません。管理画面（/admin/interop）から追加してください。
        </div>
      ) : !selected ? (
        /* ════════ レベル1：カテゴリマップ ════════ */
        <div className="absolute inset-0">
          {/* コネクタ */}
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
                  stroke={cat.color || "#9fb4e8"}
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeDasharray="2 8"
                  vectorEffect="non-scaling-stroke"
                  style={{ animation: `itmDash 2.6s linear infinite`, opacity: 0.3 }}
                />
              );
            })}
          </svg>

          {/* サテライト */}
          {satellites.map((cat, i) => {
            const { x, y } = satXY(i, satellites.length);
            return (
              <CategoryPod
                key={cat.id}
                cat={cat}
                size={SAT_SIZE}
                style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)" }}
                delay={i * 0.5}
                onClick={() => setSelected(cat)}
              />
            );
          })}

          {/* 中心：インフォメーション */}
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

          {/* 初見ガイド */}
          <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center px-4">
            <div
              className="flex items-center gap-2 rounded-full px-4 py-2 text-center text-[12px] font-medium text-white/70 sm:text-sm"
              style={{
                background: "rgba(8,11,32,0.7)",
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(6px)",
              }}
            >
              <Hand className="h-4 w-4 shrink-0 text-white/50" style={{ animation: "itmBob 1.6s ease-in-out infinite" }} />
              {guideText}
            </div>
          </div>
        </div>
      ) : (
        /* ════════ レベル2：サブカテゴリ（静止した星座配置） ════════ */
        <div className="absolute inset-0">
          {/* カテゴリナビ（下部タブ） */}
          <div
            className="absolute inset-x-0 bottom-6 z-30 flex justify-center px-4"
            style={{ animation: "itmFadeIn 0.3s ease-out both" }}
          >
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {/* 大カテゴリ選択（マップ全体）へ戻るチップ */}
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/[0.08] px-3 py-1.5 text-[11px] font-bold text-white/80 transition-all hover:bg-white/15 focus:outline-none"
                aria-label="カテゴリ選択に戻る"
              >
                <LayoutGrid className="h-3 w-3 shrink-0" />
                全体
              </button>
              {categories.map((cat) => {
                const CatIcon = iconFor(cat.slug);
                const active = selected.id === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelected(cat)}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold text-white transition-all focus:outline-none"
                    style={{
                      background: active ? `${cat.color || "#9fb4e8"}26` : "rgba(255,255,255,0.05)",
                      border: active ? `1px solid ${cat.color || "#9fb4e8"}77` : "1px solid rgba(255,255,255,0.12)",
                      opacity: active ? 1 : 0.6,
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
            <div className="absolute inset-0 grid place-items-center text-white/60">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              {/* 星座リング（静止） */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <div
                  className="relative"
                  style={{ width: "min(76vmin, 580px)", height: "min(76vmin, 580px)" }}
                >
                  {/* 軌道線 */}
                  <span
                    className="absolute inset-[8%] rounded-full"
                    style={{ border: `1px dashed ${accent}40` }}
                  />
                  {subCategories.map((sub, i) => {
                    const ang = (360 / Math.max(subCategories.length, 1)) * i;
                    const a = (ang - 90) * (Math.PI / 180);
                    const r = 46;
                    const left = 50 + r * Math.cos(a);
                    const top = 50 + r * Math.sin(a);
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => router.push(`/t/${sub.id}`)}
                        className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center focus:outline-none"
                        style={{
                          left: `${left}%`,
                          top: `${top}%`,
                          animation: `itmFloatY ${5 + (i % 3)}s ease-in-out ${i * 0.3}s infinite`,
                        }}
                      >
                        <span
                          className="grid h-14 w-14 place-items-center rounded-full text-white transition-transform group-hover:scale-110 sm:h-16 sm:w-16"
                          style={{
                            background: `radial-gradient(circle at 40% 32%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 45%, rgba(10,14,40,0.88) 100%)`,
                            border: `1px solid ${accent}66`,
                            boxShadow: `0 4px 20px rgba(0,0,0,0.35)`,
                          }}
                        >
                          <MessageCircle className="h-5 w-5" style={{ color: accent }} strokeWidth={1.8} />
                        </span>
                        <span
                          className="mt-2 max-w-[120px] rounded-full px-2.5 py-0.5 text-center text-[11px] font-bold leading-tight text-white/90"
                          style={{
                            background: "rgba(8,11,32,0.78)",
                            border: "1px solid rgba(255,255,255,0.1)",
                          }}
                        >
                          {sub.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 中心ハブ：タップでカテゴリ選択に戻る */}
              <div className="absolute left-1/2 top-1/2 z-20 w-[min(42vmin,280px)] -translate-x-1/2 -translate-y-1/2 text-center">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="group w-full rounded-3xl px-5 py-5 text-center transition-transform hover:scale-[1.03] focus:outline-none"
                  style={{
                    background: "rgba(8,11,32,0.8)",
                    border: `1px solid ${accent}55`,
                    boxShadow: `0 0 24px ${accent}22`,
                    backdropFilter: "blur(8px)",
                  }}
                  aria-label="カテゴリ選択に戻る"
                >
                  {(() => {
                    const Icon = iconFor(selected.slug);
                    return <Icon className="mx-auto mb-2 h-7 w-7" style={{ color: accent }} strokeWidth={1.8} />;
                  })()}
                  <p className="text-base font-bold text-white">{selected.name}</p>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-white/55">
                    {subCategories.length === 0
                      ? "トピックは準備中です。"
                      : "まわりのトピックをタップすると、掲示板が開きます。"}
                  </p>
                  <span
                    className="mt-3 inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/[0.06] px-3 py-1 text-[11px] font-bold text-white/70 transition group-hover:bg-white/15 group-hover:text-white"
                  >
                    <ArrowLeft className="h-3 w-3" /> カテゴリ選択に戻る
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
