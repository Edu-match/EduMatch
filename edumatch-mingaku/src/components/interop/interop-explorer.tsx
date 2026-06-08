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
      className="relative aspect-[4/3] w-full overflow-hidden rounded-[2rem] border border-white/15 shadow-2xl shadow-blue-950/40 sm:aspect-[16/10]"
      style={{ minHeight: 460, background: "linear-gradient(135deg, #33529e 0%, #4a78d8 52%, #7aa3f0 100%)" }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 50% 44%, rgba(225,238,255,0.28) 0%, rgba(120,160,240,0.10) 40%, transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(ellipse at 50% 50%, #000 35%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 50%, #000 35%, transparent 80%)",
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

  // ── レベル2/3：サブカテゴリ → コンテンツ ──
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => { setSelectedCat(null); setSelectedSub(null); }}
        className="inline-flex items-center gap-1.5 text-sm text-white/80 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 rounded"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> マップに戻る
      </button>

      <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl text-[#13287a]" style={{ background: selectedCat.color }} aria-hidden>
            {selectedCat.isPrimary ? <Info className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
          </span>
          <div>
            <h2 className="text-lg font-bold">{selectedCat.name}</h2>
            {selectedCat.description && <p className="text-xs text-white/75">{selectedCat.description}</p>}
          </div>
        </div>

        {/* サブカテゴリ（面）選択 */}
        <div className="mt-4 flex flex-wrap gap-2">
          {subCategories.map((s) => {
            const active = selectedSub?.id === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedSub(s)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                  active ? "border-white bg-white text-[#13287a]" : "border-white/30 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                {KIND_ICON[s.contentKind] ?? <FileText className="h-4 w-4" />}
                {s.name}
              </button>
            );
          })}
        </div>

        {/* コンテンツ */}
        <div className="mt-5 rounded-xl border border-white/10 bg-[#0a1a5c]/30 p-5">
          {selectedSub ? (
            <div className="text-center">
              <p className="text-sm font-semibold text-white">{selectedCat.name} / {selectedSub.name}</p>
              <p className="mt-2 text-xs leading-relaxed text-white/70">
                ここに案内記事（タイムテーブル等）が表示されます。記事は管理画面から投稿・紐づけできます。
              </p>
            </div>
          ) : (
            <p className="text-center text-xs text-white/60">面（{subCategories.map((s) => s.name).join("・")}）を選ぶと内容が表示されます。</p>
          )}
        </div>
      </div>
    </div>
  );
}
