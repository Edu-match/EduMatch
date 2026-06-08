"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";

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

/* ── SVG layout constants ── */
const VB_W = 640;
const VB_H = 460;
const CX = VB_W / 2;
const CY = VB_H / 2;
const R_DIST   = 170;
const R_CENTER = 72;
const R_SAT    = 52;
const R_SUB    = 46;

/*
  位置決め（外側 <g> の SVG transform 属性）と
  アニメーション（内側 <g> の CSS transform）を別要素に分離して競合を防ぐ。
*/
const FLOAT_CSS = `
  @keyframes itmFloat {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-12px); }
  }
  .itm-float {
    animation: itmFloat var(--itm-dur, 3s) ease-in-out var(--itm-del, 0s) infinite;
    transform-box: fill-box;
    transform-origin: center;
  }
`;

function satPos(i: number, total: number, dist = R_DIST) {
  const angle = (-90 + (360 / total) * i) * (Math.PI / 180);
  return { x: CX + dist * Math.cos(angle), y: CY + dist * Math.sin(angle) };
}

function splitLabel(name: string): string[] {
  if (name.length <= 4) return [name];
  const mid = Math.ceil(name.length / 2);
  return [name.slice(0, mid), name.slice(mid)];
}

/* ── 共通バブル描画 ── */
function Bubble({
  x, y, r, color, label, glow, dur, del, selected, onClick,
}: {
  x: number; y: number; r: number; color: string; label: string;
  glow: "hub" | "sat"; dur: number; del: number;
  selected?: boolean; onClick?: () => void;
}) {
  const lines = splitLabel(label);
  const fontSize = r >= 60 ? 15 : 13;
  const lineH    = r >= 60 ? 18 : 16;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <g
        className="itm-float"
        style={{
          "--itm-dur": `${dur}s`,
          "--itm-del": `${del}s`,
          cursor: onClick ? "pointer" : "default",
        } as React.CSSProperties}
        onClick={onClick}
      >
        {selected && (
          <circle r={r + 10} fill="none" stroke={color} strokeWidth="2" opacity="0.7" />
        )}
        {glow === "hub" && (
          <>
            <circle r={r + 18} fill="rgba(0,200,255,0.08)" />
            <circle r={r + 10} fill="none" stroke="rgba(0,210,255,0.35)" strokeWidth="1.5" />
          </>
        )}
        <circle r={r} fill={color} fillOpacity={selected ? 0.95 : 0.85} filter={`url(#${glow}Glow)`} />
        {lines.map((line, li) => (
          <text
            key={li}
            textAnchor="middle"
            dominantBaseline="middle"
            y={lines.length === 1 ? 0 : (li - 0.5) * lineH}
            fill="white"
            fontSize={fontSize}
            fontWeight="bold"
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            {line}
          </text>
        ))}
      </g>
    </g>
  );
}

export function InteropExplorer() {
  const [categories,    setCategories]    = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [loadingCats,   setLoadingCats]   = useState(true);
  const [loadingSubs,   setLoadingSubs]   = useState(false);
  const [selectedCat,   setSelectedCat]   = useState<Category | null>(null);

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
    if (!selectedCat) { setSubCategories([]); return; }
    let cancelled = false;
    setLoadingSubs(true);
    fetch(`/api/interop/sub-categories?categoryId=${selectedCat.id}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled && Array.isArray(d.subCategories)) setSubCategories(d.subCategories); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoadingSubs(false); });
    return () => { cancelled = true; };
  }, [selectedCat]);

  const primary    = categories.find((c) => c.isPrimary) ?? null;
  const satellites = categories.filter((c) => !c.isPrimary);

  if (loadingCats) {
    return (
      <div className="flex h-64 items-center justify-center text-white/60">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden /> 読み込み中…
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-center text-sm text-white/60">
        まだカテゴリがありません。管理画面（/admin/interop）から追加してください。
      </div>
    );
  }

  const svgDefs = (
    <defs>
      <filter id="hubGlow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="10" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id="satGlow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
  );

  /* ── レベル2：サブカテゴリマップ ── */
  if (selectedCat) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setSelectedCat(null)}
          className="inline-flex items-center gap-1.5 text-sm text-white/70 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> マップに戻る
        </button>

        <div className="w-full overflow-hidden rounded-2xl" style={{ background: "rgba(0,10,40,0.55)" }}>
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            className="w-full"
            style={{ maxHeight: 480 }}
            aria-label={`${selectedCat.name} サブカテゴリマップ`}
          >
            {svgDefs}
            <style>{FLOAT_CSS}</style>

            {loadingSubs ? (
              <foreignObject x="0" y="0" width={VB_W} height={VB_H}>
                <div className="flex h-full items-center justify-center text-white/60">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 読み込み中…
                </div>
              </foreignObject>
            ) : (
              <>
                {/* コネクターライン */}
                {subCategories.map((_, i) => {
                  const { x, y } = satPos(i, subCategories.length, R_DIST - 10);
                  return (
                    <line
                      key={i + "-line"}
                      x1={CX} y1={CY} x2={x} y2={y}
                      stroke="rgba(120,180,255,0.2)"
                      strokeWidth="1.5"
                      strokeDasharray="6 5"
                    />
                  );
                })}

                {/* サブカテゴリ衛星 */}
                {subCategories.map((sub, i) => {
                  const { x, y } = satPos(i, subCategories.length, R_DIST - 10);
                  return (
                    <Bubble
                      key={sub.id}
                      x={x} y={y} r={R_SUB}
                      color={selectedCat.color}
                      label={sub.name}
                      glow="sat"
                      dur={2.6 + i * 0.3}
                      del={(i * 0.45) % 2}
                    />
                  );
                })}

                {/* 中心：選択カテゴリ */}
                <Bubble
                  x={CX} y={CY} r={R_CENTER}
                  color={selectedCat.color}
                  label={selectedCat.name}
                  glow="hub"
                  dur={3.5} del={0}
                />
              </>
            )}
          </svg>
        </div>
      </div>
    );
  }

  /* ── レベル1：メインハブマップ ── */
  return (
    <div className="w-full overflow-hidden rounded-2xl" style={{ background: "rgba(0,10,40,0.55)" }}>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full"
        style={{ maxHeight: 480 }}
        aria-label="インフォメーションマップ"
      >
        {svgDefs}
        <style>{FLOAT_CSS}</style>

        {/* コネクターライン */}
        {satellites.map((cat, i) => {
          const { x, y } = satPos(i, satellites.length);
          return (
            <line
              key={cat.id + "-line"}
              x1={CX} y1={CY} x2={x} y2={y}
              stroke="rgba(120,180,255,0.2)"
              strokeWidth="1.5"
              strokeDasharray="6 5"
            />
          );
        })}

        {/* サテライトバブル */}
        {satellites.map((cat, i) => {
          const { x, y } = satPos(i, satellites.length);
          return (
            <Bubble
              key={cat.id}
              x={x} y={y} r={R_SAT}
              color={cat.color}
              label={cat.name}
              glow="sat"
              dur={2.8 + i * 0.35}
              del={(i * 0.5) % 2}
              onClick={() => setSelectedCat(cat)}
            />
          );
        })}

        {/* センターバブル（クリック可） */}
        {primary && (
          <Bubble
            x={CX} y={CY} r={R_CENTER}
            color={primary.color}
            label={primary.name}
            glow="hub"
            dur={3.5} del={0}
            onClick={() => setSelectedCat(primary)}
          />
        )}
      </svg>
    </div>
  );
}
