"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Award,
  Bot,
  GraduationCap,
  Hand,
  Info,
  Landmark,
  Loader2,
  MessageCircle,
  Network,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { InteropBackdrop } from "@/components/interop/interop-backdrop";
import { InteropPuyoBubbleMap } from "@/components/interop/interop-puyo-bubble-map";
import { InteropFeedbackButton } from "@/components/interop/interop-feedback-button";
import type { InteropCategory } from "@/components/interop/interop-category-bubble-map";
import {
  InteropSubOrbit,
  type InteropSubCategory,
} from "@/components/interop/interop-sub-orbit";
import type { InteropActivityStats } from "@/lib/interop-activity";
import type { InteropPriorityTopic } from "@/lib/interop-priority-topics";
import type { InteropThemeMode } from "@/lib/interop-settings";

const ICONS: Record<string, LucideIcon> = {
  information: Info,
  "giin-kaikan": Landmark,
  "ai-kentei": Award,
  interop: Network,
  edumatch: GraduationCap,
  "ai-bu": Bot,
};

function iconFor(slug: string): LucideIcon {
  return ICONS[slug] ?? Sparkles;
}

const FX_CSS = `
  @keyframes itmBob {
    0%,100% { transform: translateY(0); }
    50% { transform: translateY(4px); }
  }
`;

type ActivityPayload = {
  subs: Array<{
    subCategoryId: string;
    categoryId: string;
    postCount: number;
    participantCount: number;
    lastPostedAt: string | null;
  }>;
  categories: Array<{
    categoryId: string;
    postCount: number;
    participantCount: number;
    lastPostedAt: string | null;
  }>;
};

/**
 * 表示中の階層：
 * - map: トップ（中心インタロップ＋◎28）
 * - hub: インタロップの中（展示カテゴリ5件）
 * - category: 展示カテゴリの中（サブカテゴリ）→ /interop/t/{subId}
 * - topic: ◎の中（CSVトピック1〜3）→ /forum/{roomId}
 */
type View =
  | { kind: "map" }
  | { kind: "hub" }
  | { kind: "category"; cat: InteropCategory }
  | { kind: "topic"; topic: InteropPriorityTopic };

const ACTIVITY_POLL_MS = 45_000;
const EMPTY_STATS: InteropActivityStats = { postCount: 0, participantCount: 0 };

type ForumRoomActivityPayload = {
  id: string;
  postCount: number;
  participantCount: number;
  lastPostedAt: string;
  topicActivity?: Array<{
    topicId: string;
    postCount: number;
    participantCount: number;
    lastPostedAt: string | null;
  }>;
};

/** API レスポンス → 活動量マップ群（初期SSR値・ポーリング更新で共用） */
function buildActivityMaps(
  interop: ActivityPayload | null | undefined,
  forum: { rooms?: ForumRoomActivityPayload[] } | null | undefined
) {
  const subMap = new Map<string, InteropActivityStats>();
  for (const row of interop?.subs ?? []) {
    subMap.set(row.subCategoryId, {
      postCount: row.postCount,
      participantCount: row.participantCount,
      lastPostedAt: row.lastPostedAt,
    });
  }
  const catMap = new Map<string, InteropActivityStats>();
  for (const row of interop?.categories ?? []) {
    catMap.set(row.categoryId, {
      postCount: row.postCount,
      participantCount: row.participantCount,
      lastPostedAt: row.lastPostedAt,
    });
  }
  const roomMap = new Map<string, InteropActivityStats>();
  const topicMap = new Map<string, InteropActivityStats>();
  for (const room of forum?.rooms ?? []) {
    roomMap.set(room.id, {
      postCount: room.postCount,
      participantCount: room.participantCount,
      lastPostedAt: room.lastPostedAt,
    });
    for (const t of room.topicActivity ?? []) {
      topicMap.set(t.topicId, {
        postCount: t.postCount,
        participantCount: t.participantCount,
        lastPostedAt: t.lastPostedAt,
      });
    }
  }
  return { subMap, catMap, roomMap, topicMap };
}

export function InteropExplorer({
  themeMode = "auto",
  guideText = "中央のインタロップをタップして展示情報へ · 周囲の◎トピックをタップして論点・井戸端へ",
  initialInteropActivity = null,
  initialForumActivity = null,
}: {
  themeMode?: InteropThemeMode;
  guideText?: string;
  initialInteropActivity?: ActivityPayload | null;
  initialForumActivity?: { rooms?: ForumRoomActivityPayload[] } | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const catParam = searchParams.get("cat");

  const [categories, setCategories] = useState<InteropCategory[]>([]);
  const [subCategories, setSubCategories] = useState<InteropSubCategory[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [view, setView] = useState<View>({ kind: "map" });
  // SSR の初期活動量で初期化（初回表示から盛り上がり演出を出す＝遅延解消）
  const [initialMaps] = useState(() => buildActivityMaps(initialInteropActivity, initialForumActivity));
  const [activityBySub, setActivityBySub] = useState<Map<string, InteropActivityStats>>(initialMaps.subMap);
  const [activityByCategory, setActivityByCategory] = useState<Map<string, InteropActivityStats>>(initialMaps.catMap);
  const [activityByRoom, setActivityByRoom] = useState<Map<string, InteropActivityStats>>(initialMaps.roomMap);
  const [activityByTopic, setActivityByTopic] = useState<Map<string, InteropActivityStats>>(initialMaps.topicMap);

  const interopCat = useMemo(
    () =>
      categories.find((c) => c.slug === "interop") ??
      categories.find((c) => c.isPrimary) ??
      categories[0],
    [categories]
  );
  const exhibitionCats = useMemo(
    () => categories.filter((c) => c.id !== interopCat?.id),
    [categories, interopCat]
  );

  const loadActivity = useCallback(() => {
    Promise.all([
      fetch("/api/interop/activity").then((r) => r.json() as Promise<ActivityPayload>),
      fetch("/api/forum/rooms?communityThemes=true").then((r) => r.json() as Promise<{ rooms?: ForumRoomActivityPayload[] }>),
    ])
      .then(([interop, forum]) => {
        const m = buildActivityMaps(interop, forum);
        setActivityBySub(m.subMap);
        setActivityByCategory(m.catMap);
        setActivityByRoom(m.roomMap);
        setActivityByTopic(m.topicMap);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    loadActivity();
    const timer = window.setInterval(loadActivity, ACTIVITY_POLL_MS);
    return () => window.clearInterval(timer);
  }, [loadActivity]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/interop/categories")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !Array.isArray(d.categories)) return;
        setCategories(d.categories);
        // booth ページからの戻り（/?cat=xxx）で該当階層を復元
        if (catParam) {
          const match = d.categories.find((c: InteropCategory) => c.id === catParam);
          if (match) setView(match.slug === "interop" ? { kind: "hub" } : { kind: "category", cat: match });
        }
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoadingCats(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeCategoryId = view.kind === "category" ? view.cat.id : null;

  useEffect(() => {
    if (!activeCategoryId) {
      setSubCategories([]);
      return;
    }
    let cancelled = false;
    setLoadingSubs(true);
    fetch(`/api/interop/sub-categories?categoryId=${activeCategoryId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && Array.isArray(d.subCategories)) setSubCategories(d.subCategories);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoadingSubs(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeCategoryId]);

  // トップマップで選べるのは中心のインタロップのみ → ハブへ。念のため他カテゴリはカテゴリ表示にフォールバック。
  const handleSelectFromMap = useCallback(
    (cat: InteropCategory) => {
      setView(cat.slug === "interop" ? { kind: "hub" } : { kind: "category", cat });
    },
    []
  );

  const handleSelectTopic = useCallback(
    (topic: InteropPriorityTopic) => {
      setView({ kind: "topic", topic });
    },
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden">
      <style>{FX_CSS}</style>

      {/* 常に時刻連動の背景を表示（mapビューでも有効） */}
      <InteropBackdrop themeMode={themeMode} />

      {loadingCats ? (
        <div className="absolute inset-0 grid place-items-center text-white/60">
          <span className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" /> マップを起動中…
          </span>
        </div>
      ) : categories.length === 0 ? (
        <div className="absolute inset-0 grid place-items-center px-8 text-center text-sm text-white/60">
          まだカテゴリがありません。管理画面（/admin/interop）から追加してください。
        </div>
      ) : view.kind === "map" ? (
        <>
          <InteropPuyoBubbleMap
            interopCat={interopCat}
            activityByRoom={activityByRoom}
            iconFor={iconFor}
            onSelectCategory={handleSelectFromMap}
            onSelectTopic={handleSelectTopic}
          />
          <div className="pointer-events-none absolute inset-x-0 top-16 z-20 hidden justify-center px-4 sm:top-20 sm:flex">
            <div
              className="flex items-center gap-2 rounded-full px-4 py-2 text-center text-[12px] font-medium text-white/90 sm:text-sm"
              style={{
                background: "rgba(8,11,32,0.45)",
                border: "1px solid rgba(255,255,255,0.2)",
                backdropFilter: "blur(8px)",
              }}
            >
              <Hand
                className="h-4 w-4 shrink-0 text-white/70"
                style={{ animation: "itmBob 1.6s ease-in-out infinite" }}
              />
              {guideText}
            </div>
          </div>
          <InteropFeedbackButton />
        </>
      ) : view.kind === "hub" ? (
        <InteropSubOrbit
          centerLabel={interopCat?.name ?? "インタロップ"}
          centerIcon={iconFor(interopCat?.slug ?? "interop")}
          centerHint={`${exhibitionCats.length}つのエリア · タップして展示・情報へ`}
          accent={interopCat?.color || "#9fb4e8"}
          items={exhibitionCats.map((cat) => ({
            id: cat.id,
            name: cat.name,
            icon: iconFor(cat.slug),
            accentColor: cat.color || "#9fb4e8",
            stats: activityByCategory.get(cat.id) ?? EMPTY_STATS,
            onActivate: () => setView({ kind: "category", cat }),
          }))}
          backLabel="トップに戻る"
          onBack={() => setView({ kind: "map" })}
        />
      ) : view.kind === "topic" ? (
        <InteropSubOrbit
          centerLabel={view.topic.category}
          centerIcon={MessageCircle}
          centerHint={`${view.topic.topics.length}つの論点 · タップで井戸端へ`}
          accent={view.topic.color}
          items={view.topic.topics.map((t, idx) => {
            const topicId = `${view.topic.roomId}-t${idx + 1}`;
            return {
              id: topicId,
              name: t,
              icon: MessageCircle,
              accentColor: view.topic.color,
              stats:
                activityByTopic.get(topicId) ??
                activityByRoom.get(view.topic.roomId) ??
                EMPTY_STATS,
              onActivate: () =>
                router.push(`/forum/${view.topic.roomId}?from=interop&topic=${encodeURIComponent(topicId)}`),
            };
          })}
          backLabel="トップに戻る"
          onBack={() => setView({ kind: "map" })}
        />
      ) : loadingSubs ? (
        <div className="absolute inset-0 grid place-items-center text-white/60">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <InteropSubOrbit
          centerLabel={view.cat.name}
          centerIcon={iconFor(view.cat.slug)}
          accent={view.cat.color || "#9fb4e8"}
          items={subCategories.map((sub) => ({
            id: sub.id,
            name: sub.name,
            icon: MessageCircle,
            accentColor: view.cat.color || "#9fb4e8",
            stats: activityBySub.get(sub.id) ?? EMPTY_STATS,
            onActivate: () => router.push(`/interop/t/${sub.id}`),
          }))}
          backLabel="インタロップに戻る"
          onBack={() => setView({ kind: "hub" })}
        />
      )}
    </div>
  );
}
