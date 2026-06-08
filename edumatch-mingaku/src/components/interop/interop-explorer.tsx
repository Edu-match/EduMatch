"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

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
const CX = VB_W / 2;   // 320
const CY = VB_H / 2;   // 230
const R_DIST   = 170;  // center → satellite distance
const R_CENTER = 72;   // center bubble radius
const R_SAT    = 52;   // satellite bubble radius

/*
  CSS アニメーションは別 <g> 要素に適用し、
  SVG transform 属性（位置決め）と CSS transform（アニメーション）を
  同一要素で競合させないことで位置ズレを防ぐ。
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

function satPos(i: number, total: number) {
  const angle = (-90 + (360 / total) * i) * (Math.PI / 180);
  return { x: CX + R_DIST * Math.cos(angle), y: CY + R_DIST * Math.sin(angle) };
}

function splitLabel(name: string): string[] {
  if (name.length <= 4) return [name];
  const mid = Math.ceil(name.length / 2);
  return [name.slice(0, mid), name.slice(mid)];
}

export function InteropExplorer() {
  const [categories,   setCategories]   = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [loadingCats,  setLoadingCats]  = useState(true);
  const [loadingSubs,  setLoadingSubs]  = useState(false);
  const [selectedCat,  setSelectedCat]  = useState<Category | null>(null);

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

  return (
    <div className="space-y-6">
      <style>{FLOAT_CSS}</style>

      {/* ── SVGハブマップ ── */}
      <div className="w-full overflow-hidden rounded-2xl" style={{ background: "rgba(0,10,40,0.55)" }}>
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="w-full"
          style={{ maxHeight: 480 }}
          aria-label="インフォメーションマップ"
        >
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

          {/* ── コネクターライン（位置固定、アニメーションなし） ── */}
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

          {/* ── サテライトバブル ── */}
          {satellites.map((cat, i) => {
            const { x, y } = satPos(i, satellites.length);
            const isSelected = selectedCat?.id === cat.id;
            const dur = 2.8 + i * 0.35;
            const del = (i * 0.5) % 2;
            const lines = splitLabel(cat.name);
            return (
              /* 外側 <g>: SVG transform 属性で位置決め（CSS と競合しない） */
              <g key={cat.id} transform={`translate(${x}, ${y})`}>
                {/* 内側 <g>: CSS アニメーション専用 */}
                <g
                  className="itm-float"
                  style={{
                    "--itm-dur": `${dur}s`,
                    "--itm-del": `${del}s`,
                    cursor: "pointer",
                  } as React.CSSProperties}
                  onClick={() => setSelectedCat(isSelected ? null : cat)}
                >
                  {isSelected && (
                    <circle r={R_SAT + 10} fill="none" stroke={cat.color} strokeWidth="2" opacity="0.7" />
                  )}
                  <circle r={R_SAT} fill={cat.color} fillOpacity={isSelected ? 0.95 : 0.82} filter="url(#satGlow)" />
                  {lines.map((line, li) => (
                    <text
                      key={li}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      y={lines.length === 1 ? 0 : (li - 0.5) * 16}
                      fill="white"
                      fontSize="13"
                      fontWeight="bold"
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      {line}
                    </text>
                  ))}
                </g>
              </g>
            );
          })}

          {/* ── センターバブル（インフォメーション） ── */}
          {primary && (
            /* 外側 <g>: SVG transform 属性で中央位置決め */
            <g transform={`translate(${CX}, ${CY})`}>
              {/* 内側 <g>: CSS アニメーション専用 */}
              <g
                className="itm-float"
                style={{ "--itm-dur": "3.5s", "--itm-del": "0s" } as React.CSSProperties}
              >
                <circle r={R_CENTER + 18} fill="rgba(0,200,255,0.08)" />
                <circle r={R_CENTER + 10} fill="none" stroke="rgba(0,210,255,0.35)" strokeWidth="1.5" />
                <circle r={R_CENTER} fill={primary.color} fillOpacity={0.95} filter="url(#hubGlow)" />
                {splitLabel(primary.name).map((line, li, arr) => (
                  <text
                    key={li}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    y={arr.length === 1 ? 0 : (li - 0.5) * 18}
                    fill="white"
                    fontSize="15"
                    fontWeight="bold"
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {line}
                  </text>
                ))}
              </g>
            </g>
          )}
        </svg>
      </div>

      {/* ── サブカテゴリチップパネル ── */}
      {selectedCat && (
        <div className="rounded-2xl border border-white/15 bg-white/5 p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: selectedCat.color }} aria-hidden />
            <span className="text-sm font-bold text-white">{selectedCat.name}</span>
            {selectedCat.description && (
              <span className="text-xs text-white/50">— {selectedCat.description}</span>
            )}
          </div>

          {loadingSubs ? (
            <div className="flex items-center gap-2 text-xs text-white/50">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> 読み込み中…
            </div>
          ) : subCategories.length === 0 ? (
            <p className="text-xs text-white/45">
              サブカテゴリがありません。管理画面から追加してください。
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {subCategories.map((sub) => (
                <span
                  key={sub.id}
                  className="rounded-full border border-white/20 px-3.5 py-1.5 text-sm font-medium text-white/85"
                  style={{ background: selectedCat.color + "33" }}
                  title={sub.description || undefined}
                >
                  {sub.name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
