"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  FileText,
  Loader2,
  MessageCircle,
  Minus,
  Move,
  Plus,
  RotateCcw,
  Video,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── 型 ──────────────────────────────────────────────────

export type ForumCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
};

export type ForumSubCategory = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  contentKind: string;
  sortOrder: number;
  isActive: boolean;
};

// ─── アイコンマップ ───────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  MessageCircle,
  FileText,
  Briefcase,
  Video,
  Calendar,
};

function subIcon(sub: ForumSubCategory): LucideIcon {
  return (sub.icon && ICON_MAP[sub.icon]) || MessageCircle;
}

// ─── 大カテゴリのバブル配置（画像1） ───────────────────────
// 散らした配置を index から決定論的に算出（パーセント）
const MAP_POSITIONS: { x: number; y: number }[] = [
  { x: 18, y: 38 },
  { x: 50, y: 30 },
  { x: 82, y: 38 },
  { x: 34, y: 68 },
  { x: 66, y: 68 },
  { x: 12, y: 72 },
  { x: 88, y: 72 },
  { x: 50, y: 62 },
];

// フォールバックのパステルカラー
const FALLBACK_COLORS = [
  "#FBC9D4",
  "#C9D4F6",
  "#C7EFC0",
  "#F6EBB0",
  "#E7CCF4",
  "#FFD9B8",
];

// ─── サブカテゴリのバブル配置（画像2・楕円の中） ──────────
// community を上中央、残りを下に2×2
function subCategoryLayout(subs: ForumSubCategory[]): {
  sub: ForumSubCategory;
  x: number;
  y: number;
}[] {
  const community = subs.find(
    (s) => s.contentKind === "community" || s.slug === "community"
  );
  const others = subs.filter((s) => s !== community);

  const slots: { x: number; y: number }[] = [
    { x: 34, y: 50 },
    { x: 66, y: 50 },
    { x: 34, y: 76 },
    { x: 66, y: 76 },
    { x: 50, y: 88 },
    { x: 20, y: 63 },
    { x: 80, y: 63 },
  ];

  const out: { sub: ForumSubCategory; x: number; y: number }[] = [];
  if (community) out.push({ sub: community, x: 50, y: 22 });
  others.forEach((sub, i) => {
    const pos = slots[i % slots.length];
    out.push({ sub, x: pos.x, y: pos.y });
  });
  return out;
}

// ─── メイン ──────────────────────────────────────────────

export function ForumCategoryExplorer({
  initialCategorySlug,
}: {
  initialCategorySlug?: string;
}) {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [subCategories, setSubCategories] = useState<ForumSubCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ForumCategory | null>(null);
  const [zooming, setZooming] = useState(false);
  const [pendingSubId, setPendingSubId] = useState<string | null>(null);
  const router = useRouter();

  // データ取得
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/forum/categories").then((r) => r.json()),
      fetch("/api/forum/sub-categories").then((r) => r.json()),
    ])
      .then(([cat, sub]) => {
        if (cancelled) return;
        if (Array.isArray(cat.categories)) setCategories(cat.categories);
        if (Array.isArray(sub.subCategories)) setSubCategories(sub.subCategories);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 初期カテゴリ（?cat=slug で直接サブカテゴリ表示）
  useEffect(() => {
    if (!initialCategorySlug || categories.length === 0) return;
    const cat = categories.find((c) => c.slug === initialCategorySlug);
    if (cat) setSelected(cat);
  }, [initialCategorySlug, categories]);

  const handleSelectCategory = useCallback(
    (cat: ForumCategory) => {
      setZooming(true);
      setSelected(cat);
      // URL を同期（履歴を残す）
      router.push(`/forum?cat=${encodeURIComponent(cat.slug)}`, { scroll: false });
      window.setTimeout(() => setZooming(false), 420);
    },
    [router]
  );

  const handleBack = useCallback(() => {
    setPendingSubId(null);
    setSelected(null);
    router.push("/forum", { scroll: false });
  }, [router]);

  const subLayout = useMemo(() => subCategoryLayout(subCategories), [subCategories]);

  useEffect(() => {
    if (!selected) return;
    for (const { sub } of subLayout) {
      router.prefetch(`/forum/${selected.slug}/${sub.slug}`);
    }
  }, [selected, subLayout, router]);

  return (
    <div>
      {/* ヘッダー見出し */}
      <div className="mb-4 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground/70">
          Room Graph
        </p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
          話題のつながりを、グラフで探索する
        </h2>
      </div>

      {/* グラフ枠 */}
      <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-b from-muted/30 to-background shadow-sm">
        {/* 右上のコントロール（装飾＋戻る） */}
        {selected ? (
          <button
            type="button"
            onClick={handleBack}
            className="absolute left-4 top-4 z-30 flex items-center gap-1.5 rounded-full border bg-background/95 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm backdrop-blur transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            大カテゴリ一覧に戻る
          </button>
        ) : null}

        <div className="absolute right-4 top-4 z-30 flex items-center gap-1 rounded-full border bg-background/90 px-1.5 py-1 shadow-sm backdrop-blur">
          <span className="px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {selected ? "サブカテゴリ" : "概要"}
          </span>
          <span className="mx-0.5 h-4 w-px bg-border" />
          <span className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground/60">
            <Minus className="h-3.5 w-3.5" />
          </span>
          <span className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground/60">
            <Plus className="h-3.5 w-3.5" />
          </span>
        </div>

        <div className="relative aspect-[16/9] w-full">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : categories.length === 0 ? (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
              まだ大カテゴリが登録されていません。管理画面から追加してください。
            </div>
          ) : (
            <>
              {/* ─── レベル1: 大カテゴリのマップ ─── */}
              <div
                className={cn(
                  "absolute inset-0 transition-all duration-500 ease-out",
                  selected
                    ? "pointer-events-none scale-110 opacity-0"
                    : "scale-100 opacity-100"
                )}
              >
                {categories.map((cat, i) => {
                  const pos = MAP_POSITIONS[i % MAP_POSITIONS.length];
                  const color = cat.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length];
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSelectCategory(cat)}
                      className="group absolute -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                    >
                      {/* バブル（テキストを内包） */}
                      <span
                        className="flex flex-col items-center justify-center rounded-full px-3 shadow-[0_12px_30px_-8px_rgba(0,0,0,0.25)] transition-transform duration-300 ease-out group-hover:scale-105"
                        style={{
                          width: "clamp(100px, 16vw, 190px)",
                          height: "clamp(100px, 16vw, 190px)",
                          backgroundColor: color,
                        }}
                      >
                        <span
                          className="w-full text-center font-bold leading-tight text-foreground/85"
                          style={{ fontSize: "clamp(10px, 1.2vw, 14px)", wordBreak: "keep-all", overflowWrap: "anywhere" }}
                        >
                          {cat.name}
                        </span>
                        {cat.description ? (
                          <span
                            className="mt-1 line-clamp-3 w-full text-center leading-tight text-foreground/60"
                            style={{ fontSize: "clamp(8px, 0.9vw, 11px)", wordBreak: "keep-all", overflowWrap: "anywhere" }}
                          >
                            {cat.description}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* ─── レベル2: サブカテゴリの楕円 ─── */}
              <div
                className={cn(
                  "absolute inset-0 transition-all duration-500 ease-out",
                  selected
                    ? "scale-100 opacity-100"
                    : "pointer-events-none scale-90 opacity-0"
                )}
              >
                {selected && (
                  <div className="absolute inset-0 flex items-center justify-center p-4">
                    {/* 楕円（大カテゴリ） */}
                    <div
                      className="relative h-[88%] w-[92%] rounded-[50%] shadow-inner transition-all duration-500"
                      style={{
                        backgroundColor:
                          selected.color || FALLBACK_COLORS[0],
                      }}
                    >
                      {/* 楕円上部のカテゴリ名ラベル */}
                      <div className="absolute left-1/2 top-3 z-20 w-[55%] -translate-x-1/2 rounded-xl bg-background/85 px-3 py-2 text-center shadow-sm backdrop-blur">
                        <p className="break-keep text-sm font-bold leading-tight text-foreground/90">
                          {selected.name}
                        </p>
                        {selected.description ? (
                          <p className="mt-0.5 break-keep text-[10px] leading-snug text-muted-foreground line-clamp-2">
                            {selected.description}
                          </p>
                        ) : null}
                      </div>

                      {/* サブカテゴリのバブル */}
                      {subLayout.map(({ sub, x, y }) => {
                        const Icon = subIcon(sub);
                        const isCommunity =
                          sub.contentKind === "community" ||
                          sub.slug === "community";
                        const href = `/forum/${selected.slug}/${sub.slug}`;
                        const isNavigating = pendingSubId === sub.id;
                        return (
                          <Link
                            key={sub.id}
                            href={href}
                            prefetch
                            aria-busy={isNavigating}
                            onClick={() => setPendingSubId(sub.id)}
                            className={cn(
                              "group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full text-foreground/80 shadow-[0_10px_24px_-8px_rgba(0,0,0,0.3)] transition-transform duration-300 ease-out hover:scale-105",
                              isNavigating && "pointer-events-none scale-95 opacity-80"
                            )}
                            style={{
                              left: `${x}%`,
                              top: `${y}%`,
                              width: "clamp(78px, 13vw, 150px)",
                              height: "clamp(78px, 13vw, 150px)",
                              backgroundColor: isCommunity
                                ? "rgba(255,255,255,0.78)"
                                : "rgba(214,200,236,0.92)",
                            }}
                          >
                            {isNavigating ? (
                              <Loader2 className="mb-1 h-5 w-5 animate-spin opacity-70" />
                            ) : (
                              <Icon className="mb-1 h-5 w-5 opacity-70" />
                            )}
                            <span className="px-2 text-center text-xs font-semibold leading-tight">
                              {sub.name}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* 下部ヒント */}
        <div className="pointer-events-none absolute bottom-4 left-4 z-20 flex items-center gap-1.5 rounded-full border bg-background/85 px-3 py-1.5 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
          <Move className="h-3.5 w-3.5" />
          {selected
            ? "サブカテゴリを選ぶと、そのテーマの部屋に入れます"
            : "大カテゴリを選ぶと、サブカテゴリが開きます"}
        </div>
      </div>
    </div>
  );
}
