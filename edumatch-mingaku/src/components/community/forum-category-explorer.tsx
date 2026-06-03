"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  FileText,
  Loader2,
  MessageCircle,
  Move,
  Video,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { computeCategoryConnectionsFromTags } from "@/lib/forum-category-tags";
import { BubbleGraphCanvas } from "@/components/community/forum-bubble-graph/BubbleGraphCanvas";
import { computeBubbleDiameter } from "@/components/community/forum-bubble-graph/layout";
import type { BubbleGraphNode } from "@/components/community/forum-bubble-graph/types";

export type ForumCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  tags: string[];
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

const ICON_MAP: Record<string, LucideIcon> = {
  MessageCircle,
  FileText,
  Briefcase,
  Video,
  Calendar,
};

const FALLBACK_COLORS = [
  "#FBC9D4",
  "#C9D4F6",
  "#C7EFC0",
  "#F6EBB0",
  "#E7CCF4",
  "#FFD9B8",
];

function subIcon(sub: ForumSubCategory) {
  const Icon = (sub.icon && ICON_MAP[sub.icon]) || MessageCircle;
  return <Icon className="h-5 w-5" />;
}

export function ForumCategoryExplorer({
  initialCategorySlug,
}: {
  initialCategorySlug?: string;
}) {
  const router = useRouter();
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [subCategories, setSubCategories] = useState<ForumSubCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ForumCategory | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/forum/categories").then((r) => r.json()),
      fetch("/api/forum/sub-categories").then((r) => r.json()),
    ])
      .then(([cat, sub]) => {
        if (cancelled) return;
        if (Array.isArray(cat.categories)) {
          setCategories(
            cat.categories.map((c: ForumCategory) => ({
              ...c,
              tags: Array.isArray(c.tags) ? c.tags : [],
            }))
          );
        }
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

  useEffect(() => {
    if (!initialCategorySlug || categories.length === 0) return;
    const cat = categories.find((c) => c.slug === initialCategorySlug);
    if (cat) setSelected(cat);
  }, [initialCategorySlug, categories]);

  const handleSelectCategory = useCallback(
    (cat: ForumCategory) => {
      setSelected(cat);
      router.push(`/forum?cat=${encodeURIComponent(cat.slug)}`, { scroll: false });
    },
    [router]
  );

  const handleBack = useCallback(() => {
    setSelected(null);
    router.push("/forum", { scroll: false });
  }, [router]);

  const categoryConnections = useMemo(
    () =>
      computeCategoryConnectionsFromTags(
        categories.map((c) => ({ id: c.id, tags: c.tags }))
      ).map((e) => ({ from: e.from, to: e.to, weight: e.sharedCount })),
    [categories]
  );

  const categoryDiameter = useMemo(
    () => computeBubbleDiameter(categories.length),
    [categories.length]
  );

  const categoryNodes: BubbleGraphNode[] = useMemo(
    () =>
      categories.map((cat, i) => ({
        id: cat.id,
        label: cat.name,
        sublabel: cat.description || undefined,
        diameter: categoryDiameter.default,
        backgroundColor: cat.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
        onActivate: () => handleSelectCategory(cat),
      })),
    [categories, categoryDiameter.default, handleSelectCategory]
  );

  const subDiameter = useMemo(
    () => computeBubbleDiameter(subCategories.length, { max: 150, min: 68 }),
    [subCategories.length]
  );

  const subNodes: BubbleGraphNode[] = useMemo(() => {
    if (!selected) return [];
    return subCategories.map((sub) => {
      const isCommunity =
        sub.contentKind === "community" || sub.slug === "community";
      return {
        id: sub.id,
        label: sub.name,
        diameter: isCommunity ? subDiameter.primary : subDiameter.default,
        backgroundColor: isCommunity
          ? "rgba(255,255,255,0.92)"
          : "rgba(214,200,236,0.92)",
        href: `/forum/${selected.slug}/${sub.slug}`,
        isPrimary: isCommunity,
        icon: subIcon(sub),
      };
    });
  }, [selected, subCategories, subDiameter]);

  useEffect(() => {
    if (!selected) return;
    for (const sub of subCategories) {
      router.prefetch(`/forum/${selected.slug}/${sub.slug}`);
    }
  }, [selected, subCategories, router]);

  return (
    <div>
      <div className="mb-4 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground/70">
          Room Graph
        </p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
          話題のつながりを、グラフで探索する
        </h2>
      </div>

      <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-b from-muted/30 to-background shadow-sm">
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
              <div
                className={cn(
                  "absolute inset-0 transition-all duration-500 ease-out",
                  selected ? "pointer-events-none scale-105 opacity-0" : "opacity-100"
                )}
              >
                <BubbleGraphCanvas
                  nodes={categoryNodes}
                  connections={categoryConnections}
                  layoutMode="category"
                  className="h-full"
                />
              </div>

              <div
                className={cn(
                  "absolute inset-0 transition-all duration-500 ease-out",
                  selected ? "opacity-100" : "pointer-events-none scale-95 opacity-0"
                )}
              >
                {selected && (
                  <div className="absolute inset-0 flex items-center justify-center p-4">
                    <div
                      className="relative h-[88%] w-[92%] rounded-[50%] shadow-inner"
                      style={{
                        backgroundColor: selected.color || FALLBACK_COLORS[0],
                      }}
                    >
                      <div className="absolute left-1/2 top-3 z-20 w-[55%] -translate-x-1/2 rounded-xl bg-background/85 px-3 py-2 text-center shadow-sm backdrop-blur">
                        <p className="break-keep text-sm font-bold leading-tight text-foreground/90">
                          {selected.name}
                        </p>
                        {selected.description ? (
                          <p className="mt-0.5 line-clamp-2 break-keep text-[10px] leading-snug text-muted-foreground">
                            {selected.description}
                          </p>
                        ) : null}
                      </div>

                      <BubbleGraphCanvas
                        nodes={subNodes}
                        connections={[]}
                        layoutMode="subcategory"
                        clipEllipse
                        className="h-full w-full pt-12"
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="pointer-events-none absolute bottom-4 left-4 z-20 flex items-center gap-1.5 rounded-full border bg-background/85 px-3 py-1.5 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
          <Move className="h-3.5 w-3.5" />
          {selected
            ? "バブルをドラッグして移動できます。サブカテゴリを選ぶと部屋に入れます"
            : "大カテゴリを選ぶとサブカテゴリが開きます。ドラッグ・スクロールで操作できます"}
        </div>
      </div>
    </div>
  );
}
