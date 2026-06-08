"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Info, Loader2, Move } from "lucide-react";
import { BubbleGraphCanvas } from "@/components/community/forum-bubble-graph/BubbleGraphCanvas";
import { computeBubbleDiameter } from "@/components/community/forum-bubble-graph/layout";
import type { BubbleGraphNode } from "@/components/community/forum-bubble-graph/types";

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

const FALLBACK_COLORS = ["#FBC9D4", "#C9D4F6", "#C7EFC0", "#F6EBB0", "#E7CCF4", "#FFD9B8"];

/** 井戸端と統一した青グラデ＋グリッド＋発光のマップ枠 */
function MapShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-white/15 shadow-sm"
      style={{
        background: "linear-gradient(135deg, #33529e 0%, #4a78d8 52%, #7aa3f0 100%)",
        minHeight: 420,
      }}
    >
      {/* 中央の発光 */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 44%, rgba(225,238,255,0.28) 0%, rgba(120,160,240,0.10) 40%, transparent 70%)",
        }}
      />
      {/* サイバーなグリッド */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "38px 38px",
          maskImage: "radial-gradient(ellipse at 50% 50%, #000 35%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 50%, #000 35%, transparent 78%)",
        }}
      />
      {/* 端のビネット */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 60%, rgba(28,48,120,0.30) 100%)",
        }}
      />
      <div className="relative aspect-[16/10] w-full">{children}</div>
    </div>
  );
}

export function InteropExplorer() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [selected, setSelected] = useState<Category | null>(null);

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

  // ── レベル1：カテゴリマップ（中心=インフォメーション） ──
  const categoryDiameter = useMemo(
    () => computeBubbleDiameter(Math.max(categories.length, 1)),
    [categories.length]
  );
  const categoryNodes: BubbleGraphNode[] = useMemo(
    () =>
      categories.map((cat, i) => ({
        id: cat.id,
        label: cat.name,
        sublabel: cat.description || undefined,
        diameter: cat.isPrimary ? categoryDiameter.primary : categoryDiameter.default,
        backgroundColor: cat.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
        isPrimary: cat.isPrimary,
        icon: cat.isPrimary ? <Info className="h-5 w-5" /> : undefined,
        onActivate: () => setSelected(cat),
      })),
    [categories, categoryDiameter]
  );

  // ── レベル2：サブカテゴリマップ（中心=選択カテゴリ + 放射状にサブ） ──
  const subDiameter = useMemo(
    () => computeBubbleDiameter(Math.max(subCategories.length + 1, 1)),
    [subCategories.length]
  );
  const subNodes: BubbleGraphNode[] = useMemo(() => {
    if (!selected) return [];
    const center: BubbleGraphNode = {
      id: `center-${selected.id}`,
      label: selected.name,
      sublabel: selected.description || undefined,
      diameter: subDiameter.primary,
      backgroundColor: selected.color || "#C9D4F6",
      isPrimary: true,
      icon: selected.isPrimary ? <Info className="h-5 w-5" /> : undefined,
    };
    const subs: BubbleGraphNode[] = subCategories.map((s) => ({
      id: s.id,
      label: s.name,
      sublabel: s.description || undefined,
      diameter: subDiameter.default,
      backgroundColor: selected.color || "#C9D4F6",
    }));
    return [center, ...subs];
  }, [selected, subCategories, subDiameter]);

  return (
    <div>
      {/* ===== カテゴリマップビュー ===== */}
      {!selected && (
        <>
          <MapShell>
            {loadingCats ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-white/80" />
              </div>
            ) : categories.length === 0 ? (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/80">
                まだカテゴリが登録されていません。管理画面（/admin/interop）から追加してください。
              </div>
            ) : (
              <BubbleGraphCanvas
                nodes={categoryNodes}
                connections={[]}
                layoutMode="category"
                className="h-full"
              />
            )}
          </MapShell>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-white/50">
            <Move className="h-3.5 w-3.5" />
            ドラッグでマップを移動。タップでカテゴリを選択。右下のボタンで拡大・縮小
          </div>
        </>
      )}

      {/* ===== サブカテゴリマップビュー ===== */}
      {selected && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur transition-colors hover:bg-white/20"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> マップに戻る
          </button>
          <MapShell>
            {loadingSubs ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-white/80" />
              </div>
            ) : subCategories.length === 0 ? (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/80">
                まだサブカテゴリがありません。管理画面（/admin/interop）から追加してください。
              </div>
            ) : (
              <BubbleGraphCanvas
                nodes={subNodes}
                connections={[]}
                layoutMode="subcategory"
                className="h-full"
              />
            )}
          </MapShell>
        </div>
      )}
    </div>
  );
}
