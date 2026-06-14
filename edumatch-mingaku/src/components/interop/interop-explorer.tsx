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
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { InteropBackdrop } from "@/components/interop/interop-backdrop";
import dynamic from "next/dynamic";
import type { InteropSatellite } from "@/components/interop/interop-puyo-bubble-map";
// 69KBの重量級マップは初期バンドルから外し、クライアントで遅延ロード（/forum遷移の体感軽量化）。
const InteropPuyoBubbleMap = dynamic(
  () => import("@/components/interop/interop-puyo-bubble-map").then((m) => m.InteropPuyoBubbleMap),
  { ssr: false },
);
import { InteropChatWidget } from "@/components/interop/interop-chat-widget";
import type { InteropCategory } from "@/components/interop/interop-category-bubble-map";
import { Mic, Newspaper, MessagesSquare } from "lucide-react";
import {
  InteropSubOrbit,
  type InteropSubCategory,
} from "@/components/interop/interop-sub-orbit";
import type { InteropActivityStats } from "@/lib/interop-activity";
import { INTEROP_PRIORITY_TOPICS, type InteropPriorityTopic } from "@/lib/interop-priority-topics";
import type { InteropThemeMode } from "@/lib/interop-settings";
import { DEFAULT_TOPIC_AXIS, type AxisConfig, type AxisPoint } from "@/lib/interop-topic-axis";

// インタロップハブ内「自由記入」コミュニティトピック
const INTEROP_HUB_COMMUNITY = [
  { id: "interop-2026-freewrite",  name: "ひとことメッセージ", emoji: "💬", color: "#9fb4e8" },
  { id: "interop-2026-ai-edu",     name: "AI×教育の体験",     emoji: "🤖", color: "#7dd4fc" },
  { id: "interop-2026-future",     name: "未来の学校像",       emoji: "🏫", color: "#86efac" },
  { id: "interop-2026-field-voice",name: "現場の声",           emoji: "📢", color: "#fca5a5" },
  { id: "interop-2026-idea",       name: "教育アイデア",       emoji: "💡", color: "#fcd34d" },
] as const;

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

/** interop_topics.axis_x/y を優先し、未設定(0,0)は interop_topic_position → 初期値へ */
function mergeTopicPositions(
  dbPositions: Record<number, AxisPoint> | undefined,
  axisPositions: Record<number, AxisPoint> | undefined,
): Record<number, AxisPoint> {
  const base = axisPositions ?? DEFAULT_TOPIC_AXIS;
  if (!dbPositions) return base;
  const merged: Record<number, AxisPoint> = { ...base };
  for (const [noStr, pt] of Object.entries(dbPositions)) {
    const no = Number(noStr);
    if (pt.x !== 0 || pt.y !== 0) merged[no] = pt;
    else if (!(no in merged)) merged[no] = pt;
  }
  return merged;
}

export function InteropExplorer({
  themeMode = "auto",
  guideText = "中央のインタロップをタップして展示情報へ · 周囲の◎トピックをタップして論点・井戸端へ",
  initialInteropActivity = null,
  initialForumActivity = null,
  showChat = true,
  embedded = false,
  showLatestNews = true,
  showSpeakerQa = true,
  showOpinionBox = true,
}: {
  themeMode?: InteropThemeMode;
  guideText?: string;
  initialInteropActivity?: ActivityPayload | null;
  initialForumActivity?: { rooms?: ForumRoomActivityPayload[] } | null;
  /** 来場者向けAIチャット(fixed配置)を出すか。井戸端会議・ホーム埋め込みでは false。 */
  showChat?: boolean;
  /** トップマップのサテライト表示（管理画面のトグルで切替）。 */
  showLatestNews?: boolean;
  showSpeakerQa?: boolean;
  showOpinionBox?: boolean;
  /** ホーム等への埋め込みプレビュー。true ならライブポーリング（activity/recent-posts）を止め、
   *  SSR初期値のみで表示する（ホーム遷移を軽くするため）。 */
  embedded?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const catParam = searchParams.get("cat");
  const topicParam = searchParams.get("topic"); // フォーラムから「論点ビュー」へ戻る（roomId）
  const hubParam = searchParams.get("hub"); // フォーラム(井戸端)から「ハブ」へ戻る
  const groupParam = searchParams.get("group"); // ミニマップから major(A〜F)で絞り込み

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
  // フォーラム等から戻ってきたとき、元のビュー（論点／ハブ）を復元する（カテゴリは下のcat復元で対応）
  useEffect(() => {
    if (topicParam) {
      const t = INTEROP_PRIORITY_TOPICS.find((x) => x.roomId === topicParam);
      if (t) { setView({ kind: "topic", topic: t }); return; }
    }
    if (hubParam) setView({ kind: "hub" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2軸（DB由来。AIが日次で座標・週次で軸を更新）
  const [axis, setAxis] = useState<{ config?: AxisConfig; positions?: Record<number, AxisPoint> }>({});
  useEffect(() => {
    fetch("/api/interop/axis")
      .then((r) => r.json())
      .then((d) => setAxis({ config: d.config ?? undefined, positions: d.positions ?? undefined }))
      .catch(() => {});
  }, []);

  // DB管理の話題玉（28玉）。空ならマップ側がハードコードのデフォルトにフォールバック。
  const [dbTopics, setDbTopics] = useState<InteropPriorityTopic[] | undefined>(undefined);
  const [dbTopicPositions, setDbTopicPositions] = useState<Record<number, AxisPoint> | undefined>(undefined);
  const [topicEdges, setTopicEdges] = useState<Array<{ a: number; b: number }>>([]);
  useEffect(() => {
    fetch("/api/interop/topics")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.topics) && d.topics.length > 0) setDbTopics(d.topics);
        if (d.positions && Object.keys(d.positions).length > 0) setDbTopicPositions(d.positions);
        if (Array.isArray(d.edges)) setTopicEdges(d.edges);
      })
      .catch(() => {});
  }, []);

  const topicPositions = useMemo(
    () => mergeTopicPositions(dbTopicPositions, axis.positions),
    [dbTopicPositions, axis.positions],
  );

  // ── 中心インタロップ直行サテライト（最新ニュース／登壇者への質問／ご意見BOX）の解決 ──
  const [allSubs, setAllSubs] = useState<InteropSubCategory[]>([]);
  useEffect(() => {
    fetch("/api/interop/sub-categories")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.subCategories)) setAllSubs(d.subCategories); })
      .catch(() => {});
  }, []);

  // ── リアルタイム投稿（オレンジ吹き出し）──
  const [livePosts, setLivePosts] = useState<Array<{ id: string; body: string; authorName: string; subId?: string }>>([]);
  const [livePostsReady, setLivePostsReady] = useState(false);
  useEffect(() => {
    // 埋め込みプレビューではライブ投稿(オレンジ吹き出し)のポーリングを行わない。
    // ready だけ立て、マップ側のサンプルコメント演出は通常通り動かす。
    if (embedded) {
      setLivePostsReady(true);
      return;
    }
    const load = () =>
      fetch("/api/interop/recent-posts")
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d.posts)) setLivePosts(d.posts);
          setLivePostsReady(true);
        })
        .catch(() => {});
    load();
    const t = window.setInterval(load, 5_000);
    return () => window.clearInterval(t);
  }, [embedded]);

  const satellites = useMemo<InteropSatellite[]>(() => {
    const defs = [
      { slug: "interop-latest-news", visible: showLatestNews, nameHints: ["最新ニュース", "ニュース"], label: "最新ニュース", place: "topLeft" as const, color: "#7dd4fc", icon: Newspaper },
      { slug: "interop-speaker-qa", visible: showSpeakerQa, nameHints: ["登壇者への質問", "登壇", "質問"], label: "登壇者への質問", place: "topRight" as const, color: "#fcd34d", icon: Mic },
      { slug: "interop-opinion-box", visible: showOpinionBox, nameHints: ["ご意見BOX", "ご意見", "意見"], label: "ご意見BOX", place: "bottom" as const, color: "#86efac", icon: MessagesSquare },
    ];
    const result: InteropSatellite[] = [];
    for (const d of defs) {
      if (!d.visible) continue; // 管理画面のトグルで非表示
      const sub =
        allSubs.find((s) => s.slug === d.slug) ??
        allSubs.find((s) => d.nameHints.some((h) => s.name.includes(h)));
      if (!sub) continue;
      result.push({
        key: d.slug,
        label: d.label,
        place: d.place,
        color: d.color,
        icon: d.icon,
        postCount: activityBySub.get(sub.id)?.postCount,
        onActivate: () => router.push(`/interop/t/${sub.id}`),
      });
    }
    return result;
  }, [allSubs, activityBySub, router, showLatestNews, showSpeakerQa, showOpinionBox]);

  // 中心ハブは is_primary 優先（DBで議員会館に付け替え可能）。後方互換で giin-kaikan / interop もフォールバック。
  const interopCat = useMemo(
    () =>
      categories.find((c) => c.isPrimary) ??
      categories.find((c) => c.slug === "giin-kaikan") ??
      categories.find((c) => c.slug === "interop") ??
      categories[0],
    [categories]
  );
  const exhibitionCats = useMemo(
    () => categories.filter((c) => c.id !== interopCat?.id),
    [categories, interopCat]
  );
  // 中心が「議員会館」のとき、ハブの中身は佐藤さん指定の3点（/kaikanと同じ）。
  // インフォメーション/AIチャンピオンシップは外部リンク（onActivateでwindow.open）、
  // ご意見・要望は既存のご意見BOX掲示板へ（書き込み可）。
  const isGiinKaikanCenter = interopCat?.slug === "giin-kaikan";
  const giinKaikanItems = useMemo(() => {
    const opinionSub =
      allSubs.find((s) => s.slug === "interop-opinion-box") ??
      allSubs.find((s) => s.name.includes("ご意見"));
    return [
      {
        id: "giin-information",
        name: "インフォメーション",
        icon: Info,
        accentColor: "#7dd4fc",
        stats: EMPTY_STATS,
        onActivate: () =>
          window.open(
            "https://prtimes.jp/main/html/rd/p/000000046.000161501.html",
            "_blank",
            "noopener,noreferrer",
          ),
      },
      {
        id: "giin-championship",
        name: "AIチャンピオンシップ",
        icon: Trophy,
        accentColor: "#fcd34d",
        stats: EMPTY_STATS,
        onActivate: () =>
          window.open(
            "https://ai-ueo.org/2026/04/01/u18-ai-championship-2026/",
            "_blank",
            "noopener,noreferrer",
          ),
      },
      {
        id: "giin-opinion",
        name: "ご意見・要望",
        icon: MessagesSquare,
        accentColor: "#86efac",
        stats: opinionSub ? activityBySub.get(opinionSub.id) ?? EMPTY_STATS : EMPTY_STATS,
        onActivate: () =>
          opinionSub ? router.push(`/interop/t/${opinionSub.id}`) : router.push("/forum"),
      },
    ];
  }, [allSubs, activityBySub, router]);

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
    // 埋め込みプレビューは SSR 初期値(initialMaps)のみで表示し、定期ポーリングしない
    // （ホームを開くたびの activity/forum-rooms 取得を止めて遷移を軽くする）。
    if (embedded) return;
    loadActivity();
    const timer = window.setInterval(loadActivity, ACTIVITY_POLL_MS);
    return () => window.clearInterval(timer);
  }, [loadActivity, embedded]);

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
          if (match)
            setView(
              match.isPrimary || match.slug === "giin-kaikan" || match.slug === "interop"
                ? { kind: "hub" }
                : { kind: "category", cat: match },
            );
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
      setView(cat.id === interopCat?.id ? { kind: "hub" } : { kind: "category", cat });
    },
    [interopCat?.id]
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
            centerLabel={isGiinKaikanCenter ? "教育AIサミット＠衆議院第一議員会館" : interopCat?.name}
            groupFilter={groupParam ?? undefined}
            activityByRoom={activityByRoom}
            axisConfig={axis.config}
            topics={dbTopics}
            topicPositions={topicPositions}
            topicEdges={topicEdges}
            satellites={satellites}
            livePosts={livePosts}
            livePostsReady={livePostsReady}
            aiBarReserved={showChat}
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
          {groupParam && (
            <button
              type="button"
              onClick={() => router.push("/forum")}
              className="absolute left-3 top-16 z-30 inline-flex items-center gap-1 rounded-full border border-white/25 bg-black/50 px-3 py-1.5 text-xs font-bold text-white/90 backdrop-blur transition-colors hover:bg-black/70 hover:text-white sm:top-20"
            >
              ← すべてのテーマ
            </button>
          )}
        </>
      ) : view.kind === "hub" ? (
        <>
          <InteropSubOrbit
            centerLabel={interopCat?.name ?? "インタロップ"}
            centerIcon={iconFor(interopCat?.slug ?? "interop")}
            centerHint={
              isGiinKaikanCenter
                ? "インフォメーション · AIチャンピオンシップ · ご意見"
                : `${exhibitionCats.length}つのエリア · タップして展示・情報へ`
            }
            accent={interopCat?.color || "#9fb4e8"}
            items={
              isGiinKaikanCenter
                ? giinKaikanItems
                : exhibitionCats.map((cat) => ({
                    id: cat.id,
                    name: cat.name,
                    icon: iconFor(cat.slug),
                    accentColor: cat.color || "#9fb4e8",
                    stats: activityByCategory.get(cat.id) ?? EMPTY_STATS,
                    onActivate: () => setView({ kind: "category", cat }),
                  }))
            }
            backLabel="マップに戻る"
            onBack={() => setView({ kind: "map" })}
          />
          {/* 自由記入コミュニティトピック（ハブ下部フローティングストリップ） */}
          <div
            className="absolute inset-x-0 bottom-5 z-30 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:bottom-7"
            style={{ scrollbarWidth: "none" }}
          >
            <span className="flex-none whitespace-nowrap text-[11px] font-semibold text-white/45 pr-0.5">自由に書く</span>
            {INTEROP_HUB_COMMUNITY.map((room) => (
              <button
                key={room.id}
                type="button"
                onClick={() => router.push(`/forum/${room.id}?from=interop`)}
                className="flex-none flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold text-white/90 transition-all hover:scale-[1.04] active:scale-95"
                style={{
                  background: `linear-gradient(135deg, rgba(14,22,52,0.68) 0%, ${room.color}20 100%)`,
                  border: `1px solid ${room.color}55`,
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  boxShadow: `0 2px 12px rgba(0,0,0,0.32), 0 0 8px ${room.color}22`,
                }}
              >
                <span aria-hidden>{room.emoji}</span>
                {room.name}
              </button>
            ))}
          </div>
        </>
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
          backLabel="マップに戻る"
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

      {/* 来場者向けAIチャット（ログイン不要・全ビュー共通）。今見ているビューを文脈として渡す。
          井戸端会議・ホーム埋め込みでは showChat=false で非表示（fixed配置のはみ出し回避）。 */}
      {showChat && (
        <InteropChatWidget
          context={
            view.kind === "category"
              ? `展示カテゴリ「${view.cat.name}」`
              : view.kind === "topic"
                ? `論点エリア「${view.topic.category}」`
                : view.kind === "hub"
                  ? `インタロップ（展示一覧）`
                  : `教育AIサミットのトップマップ`
          }
        />
      )}
    </div>
  );
}
