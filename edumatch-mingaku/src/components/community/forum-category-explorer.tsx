"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Move,
} from "lucide-react";
import { computeCategoryConnectionsFromTags } from "@/lib/forum-category-tags";
import { isForumHot } from "@/lib/forum-hot";
import { ForumHotFlame } from "@/components/community/forum-hot-flame";
import { BubbleGraphCanvas } from "@/components/community/forum-bubble-graph/BubbleGraphCanvas";
import { computeBubbleDiameter } from "@/components/community/forum-bubble-graph/layout";
import type { BubbleGraphNode } from "@/components/community/forum-bubble-graph/types";
import { CategorySubAreaView } from "@/components/community/forum-category-sub-area-view";

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

type RoomActivity = {
  id: string;
  postCount: number;
  participantCount: number;
  lastPostedAt: string;
};

function roomBelongsToCategory(roomId: string, categorySlug: string): boolean {
  return (
    roomId.startsWith(`cat-${categorySlug}--`) ||
    roomId.startsWith(`room-${categorySlug}--`)
  );
}

const FALLBACK_COLORS = [
  "#FBC9D4",
  "#C9D4F6",
  "#C7EFC0",
  "#F6EBB0",
  "#E7CCF4",
  "#FFD9B8",
];

export function ForumCategoryExplorer({
  initialCategorySlug,
  embedded = false,
}: {
  initialCategorySlug?: string;
  /** トップページ等に埋め込むときは見出しを省略 */
  embedded?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [subCategories, setSubCategories] = useState<ForumSubCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ForumCategory | null>(null);
  const [roomActivity, setRoomActivity] = useState<RoomActivity[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/forum/categories").then((r) => r.json()),
      fetch("/api/forum/sub-categories").then((r) => r.json()),
      fetch("/api/forum/rooms", { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([cat, sub, rooms]) => {
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
        if (Array.isArray(rooms.rooms)) setRoomActivity(rooms.rooms);
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
    if (categories.length === 0) return;
    const querySlug = searchParams.get("cat") ?? undefined;
    const savedSlug =
      typeof window !== "undefined"
        ? window.localStorage.getItem("forum_selected_category_slug") ?? undefined
        : undefined;
    const targetSlug = initialCategorySlug ?? querySlug ?? savedSlug;
    if (!targetSlug) return;
    const cat = categories.find((c) => c.slug === targetSlug);
    if (cat) setSelected(cat);
  }, [initialCategorySlug, categories, searchParams]);

  const handleSelectCategory = useCallback(
    (cat: ForumCategory) => {
      setSelected(cat);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("forum_selected_category_slug", cat.slug);
      }
      router.push(`/forum?cat=${encodeURIComponent(cat.slug)}`, { scroll: false });
    },
    [router]
  );

  const handleBack = useCallback(() => {
    setSelected(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("forum_selected_category_slug");
    }
    router.push("/forum", { scroll: false });
  }, [router]);

  const categoryConnections = useMemo(
    () =>
      computeCategoryConnectionsFromTags(
        categories.map((c) => ({
          id: c.id,
          tags: c.tags,
          sortOrder: c.sortOrder,
        }))
      ).map((e) => ({
        from: e.from,
        to: e.to,
        weight: e.sharedCount > 0 ? e.sharedCount : 1,
      })),
    [categories]
  );

  const categoryDiameter = useMemo(
    () => computeBubbleDiameter(categories.length),
    [categories.length]
  );

  const hotCategoryIds = useMemo(() => {
    const hot = new Set<string>();
    for (const cat of categories) {
      const related = roomActivity.filter((r) => roomBelongsToCategory(r.id, cat.slug));
      const totalPosts = related.reduce((s, r) => s + r.postCount, 0);
      const totalParticipants = related.reduce((s, r) => s + r.participantCount, 0);
      const latest = related
        .map((r) => r.lastPostedAt)
        .sort()
        .at(-1);
      if (isForumHot({ postCount: totalPosts, participantCount: totalParticipants, lastPostedAt: latest })) {
        hot.add(cat.id);
      }
    }
    return hot;
  }, [categories, roomActivity]);

  const categoryNodes: BubbleGraphNode[] = useMemo(
    () =>
      categories.map((cat, i) => ({
        id: cat.id,
        label: cat.name,
        sublabel: cat.description || undefined,
        diameter: categoryDiameter.default,
        backgroundColor: cat.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
        isHot: hotCategoryIds.has(cat.id),
        onActivate: () => handleSelectCategory(cat),
      })),
    [categories, categoryDiameter.default, handleSelectCategory, hotCategoryIds]
  );

  const selectedIsHot = selected ? hotCategoryIds.has(selected.id) : false;

  useEffect(() => {
    if (!selected) return;
    for (const sub of subCategories) {
      router.prefetch(`/forum/${selected.slug}/${sub.slug}`);
    }
  }, [selected, subCategories, router]);

  return (
    <div>
      {!embedded && (
        <div className="mb-4 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground/70">
            Room Map
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
            話題のつながりを、マップで探索する
          </h2>
        </div>
      )}

      {/* ===== カテゴリマップビュー ===== */}
      {!selected && (
        <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-b from-muted/30 to-background shadow-sm">
          <div className={embedded ? "relative aspect-[16/10] w-full" : "relative aspect-[16/9] w-full"}>
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : categories.length === 0 ? (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
                まだ大カテゴリが登録されていません。管理画面から追加してください。
              </div>
            ) : (
              <BubbleGraphCanvas
                nodes={categoryNodes}
                connections={categoryConnections}
                layoutMode="category"
                className="h-full"
              />
            )}
          </div>

          <div className="pointer-events-none absolute bottom-4 left-4 z-20 flex items-center gap-1.5 rounded-full border bg-background/85 px-3 py-1.5 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
            <Move className="h-3.5 w-3.5" />
            ドラッグでマップを移動。タップで大カテゴリを選択。右下のボタンで拡大・縮小
          </div>
        </div>
      )}

      {/* ===== サブカテゴリエリアビュー ===== */}
      {selected && (
        <div className="overflow-hidden rounded-3xl border bg-gradient-to-b from-muted/20 to-background shadow-sm">
          {/* ヘッダー */}
          <div
            className="relative border-b px-4 py-3 sm:px-5 sm:py-4"
          >
            <button
              type="button"
              onClick={handleBack}
              className="absolute left-4 top-1/2 z-10 flex -translate-y-1/2 items-center gap-1.5 rounded-full border bg-background/95 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm backdrop-blur transition-colors hover:bg-muted sm:left-5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">大カテゴリ一覧に戻る</span>
              <span className="sm:hidden">戻る</span>
            </button>

            <div className="mx-auto max-w-lg px-24 text-center sm:px-36">
              <p className="flex items-center justify-center gap-1.5 text-sm font-bold text-foreground">
                {selectedIsHot && <ForumHotFlame size="sm" className="scale-75" />}
                {selected.name}
              </p>
              {selected.description ? (
                <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">
                  {selected.description}
                </p>
              ) : null}
            </div>
          </div>

          {/* サブカテゴリエリアグリッド */}
          <CategorySubAreaView
            category={selected}
            subCategories={subCategories}
          />
        </div>
      )}
    </div>
  );
}
