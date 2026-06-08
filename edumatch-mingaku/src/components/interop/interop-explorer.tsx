"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Info, Loader2 } from "lucide-react";
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


function MapShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative w-full overflow-hidden sm:aspect-[16/9]"
      style={{
        minHeight: 500,
        background: "linear-gradient(160deg, #020d28 0%, #041840 40%, #071f5a 70%, #0a2870 100%)",
      }}
    >
      {/* ドットグリッド */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(rgba(140,190,255,0.35) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(ellipse 80% 70% at 50% 50%, #000 40%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 50%, #000 40%, transparent 100%)",
        }}
      />
      {/* 中心グロー */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(30,80,200,0.25) 0%, transparent 70%)",
        }}
      />
      {children}
    </div>
  );
}

export function InteropExplorer() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [selectedSub, setSelectedSub] = useState<SubCategory | null>(null);

  // カテゴリ一覧を取得
  useEffect(() => {
    let cancelled = false;
    fetch("/api/interop/categories")
      .then((r) => r.json())
      .then((d) => { if (!cancelled && Array.isArray(d.categories)) setCategories(d.categories); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoadingCats(false); });
    return () => { cancelled = true; };
  }, []);

  // カテゴリ選択時にそのカテゴリのサブカテゴリを取得
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

  const diameter = useMemo(() => computeBubbleDiameter(Math.max(categories.length, 1)).default, [categories.length]);
  const nodes: BubbleGraphNode[] = useMemo(
    () =>
      categories.map((c) => ({
        id: c.id,
        label: c.name,
        sublabel: c.description || undefined,
        diameter,
        backgroundColor: c.color,
        isPrimary: c.isPrimary,
        icon: c.isPrimary ? <Info className="h-5 w-5" /> : undefined,
        onActivate: () => { setSelectedCat(c); setSelectedSub(null); },
      })),
    [categories, diameter]
  );

  const subNodes: BubbleGraphNode[] = useMemo(() => {
    const d = computeBubbleDiameter(Math.max(subCategories.length, 1)).default;
    return subCategories.map((s, i) => ({
      id: s.id,
      label: s.name,
      sublabel: s.description || undefined,
      diameter: d,
      backgroundColor: selectedCat?.color ?? "#c9d4f6",
      isPrimary: i === 0,
      onActivate: () => setSelectedSub(s),
    }));
  }, [subCategories, selectedCat]);

  const loading = loadingCats;
  if (loading) {
    return (
      <MapShell>
        <div className="flex h-full items-center justify-center text-white/70">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden /> 読み込み中…
        </div>
      </MapShell>
    );
  }

  if (categories.length === 0) {
    return (
      <MapShell>
        <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/80">
          まだカテゴリがありません。管理画面（/admin/interop）から追加してください。
        </div>
      </MapShell>
    );
  }

  // ── レベル1：カテゴリマップ（中心=インフォメーション） ──
  if (!selectedCat) {
    return (
      <MapShell>
        <BubbleGraphCanvas nodes={nodes} connections={[]} layoutMode="subcategory" className="h-full" />
      </MapShell>
    );
  }

  // ── レベル2：サブカテゴリ マップ ──
  if (!selectedSub) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => { setSelectedCat(null); setSelectedSub(null); }}
            className="inline-flex items-center gap-1.5 rounded text-sm text-white/85 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> マップに戻る
          </button>
          <span className="flex items-center gap-1.5 text-sm font-bold text-white">
            <span className="h-3 w-3 rounded-full" style={{ background: selectedCat.color }} aria-hidden />
            {selectedCat.name}
          </span>
        </div>
        <MapShell>
          {loadingSubs ? (
            <div className="flex h-full items-center justify-center text-white/60">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 読み込み中…
            </div>
          ) : subNodes.length === 0 ? (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/70">
              まだサブカテゴリがありません。管理画面（/admin/interop）から追加してください。
            </div>
          ) : (
            <BubbleGraphCanvas nodes={subNodes} connections={[]} layoutMode="subcategory" className="h-full" />
          )}
        </MapShell>
      </div>
    );
  }

  // ── レベル3：コンテンツ（案内記事など） ──
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setSelectedSub(null)}
        className="inline-flex items-center gap-1.5 rounded text-sm text-white/85 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> {selectedCat.name} に戻る
      </button>
      <div className="rounded-2xl border border-white/15 bg-white/10 p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-white/50">{selectedCat.name}</p>
        <p className="mt-0.5 text-base font-bold text-white">{selectedSub.name}</p>
        {selectedSub.description && (
          <p className="mt-1 text-[13px] text-white/65">{selectedSub.description}</p>
        )}
        <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-6 text-center">
          <p className="text-xs leading-relaxed text-white/55">
            案内記事・タイムテーブルはここに表示されます。<br />
            管理画面（/admin/interop）からサブカテゴリに紐づけた記事を投稿できます。
          </p>
        </div>
      </div>
    </div>
  );
}
