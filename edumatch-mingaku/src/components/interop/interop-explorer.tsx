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
import { interopBoardPath } from "@/lib/interop-paths";
import { InteropBackdrop } from "@/components/interop/interop-backdrop";
import dynamic from "next/dynamic";
import type { InteropSatellite } from "@/components/interop/interop-puyo-bubble-map";
// 69KBの重量級マップは初期バンドルから外し、クライアントで遅延ロード（/forum遷移の体感軽量化）。
const InteropPuyoBubbleMap = dynamic(
  () => import("@/components/interop/interop-puyo-bubble-map").then((m) => m.InteropPuyoBubbleMap),
  { ssr: false },
);
// 3Dマップ（トップマップのみ）。重いので遅延ロード。ドリルダウンは2Dと共有。
const ForumGalaxy3D = dynamic(() => import("@/components/interop/forum-galaxy-3d"), { ssr: false });
import { InteropChatWidget } from "@/components/interop/interop-chat-widget";
import type { InteropCategory } from "@/components/interop/interop-category-bubble-map";
import { Mic, Newspaper, MessagesSquare, ExternalLink, Ticket } from "lucide-react";
import {
  InteropSubOrbit,
  type InteropSubCategory,
} from "@/components/interop/interop-sub-orbit";
import { InteropCategoryList } from "@/components/interop/interop-category-list";
import type { InteropActivityStats } from "@/lib/interop-activity";
import { INTEROP_PRIORITY_TOPICS, type InteropPriorityTopic } from "@/lib/interop-priority-topics";
import type { InteropThemeMode, CenterHubItem } from "@/lib/interop-settings";
import { ensureExternalUrl } from "@/lib/interop-settings";
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
  guideText = "中央のインタロップをタップして展示情報へ · 周囲の◎トピックをタップして論点・ひろばへ",
  initialInteropActivity = null,
  initialForumActivity = null,
  showChat = true,
  embedded = false,
  showLatestNews = true,
  showSpeakerQa = true,
  showOpinionBox = true,
  initialScale,
  centerLabel: centerLabelOverride,
  centerHubItems,
  mapMode = "2d",
}: {
  themeMode?: InteropThemeMode;
  /** トップマップの表示モード。"3d" のときマップ層だけ3D。ドリルダウンは2D共有。 */
  mapMode?: "2d" | "3d";
  guideText?: string;
  /** 中心ハブの表示名（管理画面の表示設定で編集）。未指定なら従来のロジック。 */
  centerLabel?: string;
  /** 中心ハブの項目（管理画面で編集）。空/未指定なら既定の3項目。 */
  centerHubItems?: CenterHubItem[];
  initialInteropActivity?: ActivityPayload | null;
  initialForumActivity?: { rooms?: ForumRoomActivityPayload[] } | null;
  /** 来場者向けAIチャット(fixed配置)を出すか。教育のひろば・ホーム埋め込みでは false。 */
  showChat?: boolean;
  /** トップマップのサテライト表示（管理画面のトグルで切替）。 */
  showLatestNews?: boolean;
  showSpeakerQa?: boolean;
  showOpinionBox?: boolean;
  /** 埋め込み時の初期ズーム倍率（ミニマップで拡大＆ドラッグ可動域を確保）。 */
  initialScale?: number;
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

  // サブカテゴリのタップ遷移。
  // ・ミニマップ（embedded）：常に該当の教育のひろばボードへ直行（トップ以降のリンク/外部遷移は紐付けない）。
  // ・フル表示：link_url があれば外部リンク、無ければ掲示板へ（ノード毎のリンク/掲示板選択を尊重）。
  const openSubCategory = useCallback(
    (sub: { id: string; linkUrl?: string }) => {
      if (embedded) { router.push(interopBoardPath(sub.id)); return; }
      const link = sub.linkUrl?.trim();
      if (link) window.open(ensureExternalUrl(link, link), "_blank", "noopener,noreferrer");
      else router.push(interopBoardPath(sub.id));
    },
    [router, embedded],
  );

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
    // サテライト（最新ニュース／登壇者への質問／ご意見BOX）は、議員会館中心でも表示する。
    // 表示可否は管理画面のトグル(showLatestNews等)＋サブの有効状態で制御する。
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
        onActivate: () => openSubCategory(sub),
      });
    }
    return result;
  }, [allSubs, activityBySub, openSubCategory, showLatestNews, showSpeakerQa, showOpinionBox]);

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
  // ご意見・要望は議員会館専用の掲示板(giin-opinion)へ（サテライトのご意見BOXとは独立）。
  const isGiinKaikanCenter = interopCat?.slug === "giin-kaikan";
  const giinKaikanItems = useMemo(() => {
    // 先頭に「コンテンツ」（電子チケット申込）。2D/3Dで共通表示。
    const contentsItem = {
      id: "kaikan-contents",
      name: "コンテンツ",
      icon: Ticket,
      accentColor: "#7dd4fc",
      stats: EMPTY_STATS,
      // 井戸端風オービットではなく、一般的な一覧ページ（複数選択申込）へ遷移
      onActivate: () => router.push("/forum/kaikan"),
    };
    const opinionSub =
      allSubs.find((s) => s.slug === "giin-opinion") ??
      allSubs.find((s) => s.slug === "interop-opinion-box");

    // 管理画面で設定された項目があればそれを使う（リンク or 掲示板）。
    if (centerHubItems && centerHubItems.length > 0) {
      const palette = ["#7dd4fc", "#fcd34d", "#86efac", "#c4b5fd", "#fca5a5", "#93c5fd"];
      return [contentsItem, ...centerHubItems
        .filter((it) => it.name?.trim())
        .map((it, i) => ({
          id: it.id,
          name: it.name,
          icon: it.kind === "board" ? MessagesSquare : ExternalLink,
          accentColor: palette[i % palette.length],
          stats: it.kind === "board" && it.subId ? activityBySub.get(it.subId) ?? EMPTY_STATS : EMPTY_STATS,
          onActivate: () => {
            if (it.kind === "board" && it.subId) router.push(interopBoardPath(it.subId));
            else if (it.url) window.open(ensureExternalUrl(it.url), "_blank", "noopener,noreferrer");
          },
        }))];
    }

    // 既定（後方互換）
    return [
      contentsItem,
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
          opinionSub ? router.push(interopBoardPath(opinionSub.id)) : router.push("/forum"),
      },
    ];
  }, [allSubs, activityBySub, router, centerHubItems]);

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
  // ミニマップ(embedded)では内部ビューに潜らず、本井戸端(/forum)へリダイレクト（移動=パンは維持）。
  const handleSelectFromMap = useCallback(
    (cat: InteropCategory) => {
      if (embedded) { router.push("/forum"); return; }
      setView(cat.id === interopCat?.id ? { kind: "hub" } : { kind: "category", cat });
    },
    [interopCat?.id, embedded, router]
  );

  const handleSelectTopic = useCallback(
    (topic: InteropPriorityTopic) => {
      // ミニマップからは該当トピックの井戸端ボードへ直行。
      if (embedded) { router.push(topic.roomId ? `/forum/${topic.roomId}?from=interop` : "/forum"); return; }
      setView({ kind: "topic", topic });
    },
    [embedded, router]
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
          {mapMode === "3d" ? (
            <ForumGalaxy3D
              centerLabel={centerLabelOverride?.trim() || (isGiinKaikanCenter ? "教育AIサミット＠衆議院第一議員会館" : interopCat?.name)}
              onSelectCenter={() => { if (interopCat) handleSelectFromMap(interopCat); }}
              onSelectTopic={handleSelectTopic}
            />
          ) : (
          <InteropPuyoBubbleMap
            interopCat={interopCat}
            centerLabel={centerLabelOverride?.trim() || (isGiinKaikanCenter ? "教育AIサミット＠衆議院第一議員会館" : interopCat?.name)}
            groupFilter={groupParam ?? undefined}
            initialScale={initialScale}
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
          )}
          {/* 3D ギャラクシーは独自の操作ヒント＋凡例を持つため、汎用の上部案内ピルは 2D 時のみ表示 */}
          {mapMode !== "3d" && (
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
          )}
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
            className="absolute inset-x-0 bottom-2 z-40 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:bottom-3"
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
          centerHint={`${view.topic.topics.length}つの論点 · タップでひろばへ`}
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
        // 一般カテゴリ：アイコン中心の周回ではなく一覧表示。行タップで掲示板/論点（または外部リンク）へ。
        <InteropCategoryList
          title={view.cat.name}
          accent={view.cat.color || "#9fb4e8"}
          items={subCategories.map((sub) => {
            const stats = activityBySub.get(sub.id) ?? EMPTY_STATS;
            return {
              id: sub.id,
              name: sub.name,
              description: sub.description,
              postCount: stats.postCount,
              participantCount: stats.participantCount,
              isLink: !!sub.linkUrl?.trim(),
            };
          })}
          onSelect={(item) => {
            const sub = subCategories.find((s) => s.id === item.id);
            if (sub) openSubCategory(sub);
          }}
          backLabel="インタロップに戻る"
          onBack={() => setView({ kind: "hub" })}
        />
      )}

      {/* 来場者向けAIチャット（ログイン不要・全ビュー共通）。今見ているビューを文脈として渡す。
          教育のひろば・ホーム埋め込みでは showChat=false で非表示（fixed配置のはみ出し回避）。 */}
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
