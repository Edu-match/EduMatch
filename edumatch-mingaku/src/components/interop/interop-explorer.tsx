"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileText, Video, Calendar, MessageCircle, Info, Loader2 } from "lucide-react";
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
  name: string;
  slug: string;
  contentKind: string;
};

const KIND_ICON: Record<string, React.ReactNode> = {
  article: <FileText className="h-4 w-4" />,
  media: <Video className="h-4 w-4" />,
  "events-info": <Calendar className="h-4 w-4" />,
  community: <MessageCircle className="h-4 w-4" />,
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
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [selectedSub, setSelectedSub] = useState<SubCategory | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/interop/categories").then((r) => r.json()),
      fetch("/api/interop/sub-categories").then((r) => r.json()),
    ])
      .then(([cat, sub]) => {
        if (cancelled) return;
        if (Array.isArray(cat.categories)) setCategories(cat.categories);
        if (Array.isArray(sub.subCategories)) setSubCategories(sub.subCategories);
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

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
    const colors: Record<string, string> = {
      article: "#fddbe8",
      media: "#e2d1f9",
      "events-info": "#fff0be",
      community: "#bde8fb",
    };
    const d = computeBubbleDiameter(Math.max(subCategories.length, 1)).default;
    return subCategories.map((s, i) => ({
      id: s.id,
      label: s.name,
      diameter: d,
      backgroundColor: colors[s.contentKind] ?? "#e8e8e8",
      isPrimary: i === 0,
      onActivate: () => setSelectedSub(s),
    }));
  }, [subCategories]);

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

  // ── レベル2：サブカテゴリ マップ（大カテゴリを選ぶとマップで表示） ──
  if (!selectedSub) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setSelectedCat(null)}
            className="inline-flex items-center gap-1.5 rounded text-sm text-white/85 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> マップに戻る
          </button>
          <span className="flex items-center gap-1.5 text-sm font-bold">
            <span className="h-3 w-3 rounded-full" style={{ background: selectedCat.color }} aria-hidden />
            {selectedCat.name}
          </span>
        </div>
        <MapShell>
          <BubbleGraphCanvas nodes={subNodes} connections={[]} layoutMode="subcategory" className="h-full" />
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
      <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur">
        <div className="flex items-center gap-2 text-base font-bold">
          {KIND_ICON[selectedSub.contentKind] ?? <FileText className="h-4 w-4" />}
          {selectedCat.name} / {selectedSub.name}
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-[#0a1a5c]/30 p-6 text-center">
          <p className="text-xs leading-relaxed text-white/70">
            ここに案内記事（タイムテーブル等）が表示されます。記事は管理画面から投稿・紐づけできます。
          </p>
        </div>
      </div>
    </div>
  );
}
