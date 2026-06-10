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
  name: string;
  description?: string | null;
  postCount: number;
  participantCount: number;
  lastPostedAt: string;
};

/** CSV ◎ テーマルーム（room-{大カテゴリ}--community--{テーマ}） */
const COMMUNITY_THEME_ROOM_RE = /^room-.+--community--/;

const IDOBATA_MAJOR_SLUG_ORDER = [
  "ai-technology",
  "evaluation-curriculum",
  "children-rights-discipline",
  "diversity-inclusion",
  "teacher-school-system",
  "subject-teaching",
] as const;

function isCommunityThemeRoomId(roomId: string): boolean {
  return COMMUNITY_THEME_ROOM_RE.test(roomId);
}

function majorSlugFromCommunityRoomId(roomId: string): string {
  const m = roomId.match(/^room-(.+?)--community--/);
  return m?.[1] ?? "";
}

function sortCommunityThemeRooms(rooms: RoomActivity[]): RoomActivity[] {
  return [...rooms].sort((a, b) => {
    const ma = IDOBATA_MAJOR_SLUG_ORDER.indexOf(
      majorSlugFromCommunityRoomId(a.id) as (typeof IDOBATA_MAJOR_SLUG_ORDER)[number]
    );
    const mb = IDOBATA_MAJOR_SLUG_ORDER.indexOf(
      majorSlugFromCommunityRoomId(b.id) as (typeof IDOBATA_MAJOR_SLUG_ORDER)[number]
    );
    const ai = ma === -1 ? IDOBATA_MAJOR_SLUG_ORDER.length : ma;
    const bi = mb === -1 ? IDOBATA_MAJOR_SLUG_ORDER.length : mb;
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name, "ja");
  });
}

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

    async function load() {
      try {
        const [catRes, subRes, themeRes] = await Promise.all([
          fetch("/api/forum/categories"),
          fetch("/api/forum/sub-categories"),
          fetch("/api/forum/rooms?communityThemes=true", { credentials: "include" }),
        ]);
        const [cat, sub, themeRooms] = await Promise.all([
          catRes.json(),
          subRes.json(),
          themeRes.json(),
        ]);
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

        const themes = Array.isArray(themeRooms.rooms) ? themeRooms.rooms : [];
        if (themes.length > 0) {
          setRoomActivity(themes);
          return;
        }

        const allRes = await fetch("/api/forum/rooms", { credentials: "include" });
        const allRooms = await allRes.json();
        if (cancelled) return;
        if (Array.isArray(allRooms.rooms)) setRoomActivity(allRooms.rooms);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const communityThemeRooms = useMemo(
    () => sortCommunityThemeRooms(roomActivity.filter((r) => isCommunityThemeRoomId(r.id))),
    [roomActivity]
  );

  const themeMapMode = communityThemeRooms.length > 0;

  const categoryColorBySlug = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.slug, c.color])),
    [categories]
  );

  useEffect(() => {
    if (!themeMapMode && categories.length === 0) return;
    if (themeMapMode) {
      setSelected(null);
      return;
    }
    const querySlug = searchParams.get("cat") ?? undefined;
    const savedSlug =
      typeof window !== "undefined"
        ? window.localStorage.getItem("forum_selected_category_slug") ?? undefined
        : undefined;
    const targetSlug = initialCategorySlug ?? querySlug ?? savedSlug;
    if (!targetSlug) return;
    const cat = categories.find((c) => c.slug === targetSlug);
    if (cat) setSelected(cat);
  }, [initialCategorySlug, categories, searchParams, themeMapMode]);

  const handleSelectCategory = useCallback(
    (cat: ForumCategory) => {
      setSelected(cat);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("forum_selected_category_slug", cat.slug);
      }
      // 埋め込み（特設LP等）ではページ遷移せず、その場でサブエリアへ展開して回遊を保つ
      if (!embedded) {
        router.push(`/forum?cat=${encodeURIComponent(cat.slug)}`, { scroll: false });
      }
    },
    [router, embedded]
  );

  const handleBack = useCallback(() => {
    setSelected(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("forum_selected_category_slug");
    }
    if (!embedded) {
      router.push("/forum", { scroll: false });
    }
  }, [router, embedded]);

  const handleOpenThemeRoom = useCallback(
    (roomId: string) => {
      router.push(`/forum/${roomId}`);
    },
    [router]
  );

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

  const mapNodeCount = themeMapMode ? communityThemeRooms.length : categories.length;

  const categoryDiameter = useMemo(
    () => computeBubbleDiameter(mapNodeCount),
    [mapNodeCount]
  );

  const themeRoomConnections = useMemo(() => {
    const byMajor = new Map<string, string[]>();
    for (const room of communityThemeRooms) {
      const slug = majorSlugFromCommunityRoomId(room.id);
      const list = byMajor.get(slug) ?? [];
      list.push(room.id);
      byMajor.set(slug, list);
    }
    const edges: { from: string; to: string; weight: number }[] = [];
    for (const ids of byMajor.values()) {
      for (let i = 0; i < ids.length - 1; i++) {
        edges.push({ from: ids[i], to: ids[i + 1], weight: 1 });
      }
    }
    return edges;
  }, [communityThemeRooms]);

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

  const legacyCategoryNodes: BubbleGraphNode[] = useMemo(
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

  const themeRoomNodes: BubbleGraphNode[] = useMemo(
    () =>
      communityThemeRooms.map((room, i) => {
        const majorSlug = majorSlugFromCommunityRoomId(room.id);
        const majorCat = categories.find((c) => c.slug === majorSlug);
        return {
          id: room.id,
          label: room.name,
          sublabel: majorCat?.name || undefined,
          diameter: categoryDiameter.default,
          backgroundColor:
            categoryColorBySlug[majorSlug] || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
          isHot: true,
          onActivate: () => handleOpenThemeRoom(room.id),
        };
      }),
    [
      communityThemeRooms,
      categories,
      categoryColorBySlug,
      categoryDiameter.default,
      handleOpenThemeRoom,
    ]
  );

  const mapNodes = themeMapMode ? themeRoomNodes : legacyCategoryNodes;
  const mapConnections = themeMapMode ? themeRoomConnections : categoryConnections;

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
            {themeMapMode
              ? "議論したいテーマを、マップから選ぶ"
              : "話題のつながりを、マップで探索する"}
          </h2>
          {themeMapMode ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {communityThemeRooms.length} テーマ
            </p>
          ) : null}
        </div>
      )}

      {/* ===== カテゴリマップビュー ===== */}
      {!selected && (
        <div
          className="relative overflow-hidden rounded-3xl border border-white/15 shadow-sm"
          style={{
            background: "linear-gradient(135deg, #33529e 0%, #4a78d8 52%, #7aa3f0 100%)",
            minHeight: themeMapMode ? (embedded ? 480 : 580) : embedded ? 420 : 520,
          }}
        >
          {/* 中央の発光（サブカテゴリ地図と統一） */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 44%, rgba(225,238,255,0.28) 0%, rgba(120,160,240,0.10) 40%, transparent 70%)",
            }}
          />
          {/* サイバーなグリッド（うっすら） */}
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
          {/* 端のビネット（軽め） */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 50%, transparent 60%, rgba(28,48,120,0.30) 100%)",
            }}
          />
          <div
            className={
              embedded
                ? "relative aspect-[16/10] w-full"
                : themeMapMode
                  ? "relative aspect-[4/3] w-full"
                  : "relative aspect-[16/9] w-full"
            }
          >
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : mapNodes.length === 0 ? (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
                まだ大カテゴリが登録されていません。管理画面から追加してください。
              </div>
            ) : (
              <BubbleGraphCanvas
                nodes={mapNodes}
                connections={mapConnections}
                layoutMode="category"
                className="h-full"
              />
            )}
          </div>

          <div className="pointer-events-none absolute bottom-4 left-4 z-20 flex items-center gap-1.5 rounded-full border bg-background/85 px-3 py-1.5 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
            <Move className="h-3.5 w-3.5" />
            {themeMapMode
              ? "ドラッグでマップを移動。タップで議論ルームへ。右下のボタンで拡大・縮小"
              : "ドラッグでマップを移動。タップで大カテゴリを選択。右下のボタンで拡大・縮小"}
          </div>
        </div>
      )}

      {/* ===== サブカテゴリエリアビュー（テーママップモードでは未使用） ===== */}
      {selected && !themeMapMode && (
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
