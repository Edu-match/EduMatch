"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowDownRight,
  ArrowRight,
  ArrowUpLeft,
  ArrowUpRight,
  Briefcase,
  Calendar,
  FileText,
  MessageCircle,
  Users,
  Video,
  X,
} from "lucide-react";
import type { CategoryContentItem } from "@/lib/forum-category-content";
import { isForumHot } from "@/lib/forum-hot";
import { ForumHotFlame } from "@/components/community/forum-hot-flame";
import type { ForumCategory, ForumSubCategory } from "./forum-category-explorer";

/* ------------------------------------------------------------------ */
/* 型・エリアメタ                                                        */
/* ------------------------------------------------------------------ */

type CommunityRoomItem = {
  id: string;
  name: string;
  emoji: string;
  postCount: number;
  participantCount: number;
  lastPostedAt: string;
};

type ExpandCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

type AreaMeta = {
  label: string;
  icon: typeof MessageCircle;
  solidColor: string;
  bubbleBg: string;
  textColor: string;
  glowColor: string;
};

const AREA_META: Record<string, AreaMeta> = {
  article: {
    label: "記事",
    icon: FileText,
    solidColor: "#fddbe8",
    bubbleBg: "rgba(255, 255, 255, 0.92)",
    textColor: "#b84065",
    glowColor: "rgba(255, 150, 190, 0.5)",
  },
  service: {
    label: "サービス",
    icon: Briefcase,
    solidColor: "#c8f0da",
    bubbleBg: "rgba(255, 255, 255, 0.92)",
    textColor: "#237a4e",
    glowColor: "rgba(90, 220, 150, 0.5)",
  },
  media: {
    label: "動画",
    icon: Video,
    solidColor: "#e2d1f9",
    bubbleBg: "rgba(255, 255, 255, 0.92)",
    textColor: "#6933a8",
    glowColor: "rgba(180, 130, 245, 0.5)",
  },
  "events-info": {
    label: "イベント",
    icon: Calendar,
    solidColor: "#fff0be",
    bubbleBg: "rgba(255, 255, 255, 0.92)",
    textColor: "#8a6000",
    glowColor: "rgba(255, 205, 70, 0.5)",
  },
  community: {
    label: "コミュニティ",
    icon: MessageCircle,
    solidColor: "#bde8fb",
    bubbleBg: "rgba(255, 255, 255, 0.92)",
    textColor: "#1060a0",
    glowColor: "rgba(90, 190, 255, 0.55)",
  },
};

const DEFAULT_META: AreaMeta = {
  label: "その他",
  icon: MessageCircle,
  solidColor: "#e8e8e8",
  bubbleBg: "rgba(255, 255, 255, 0.92)",
  textColor: "#555",
  glowColor: "rgba(160, 160, 160, 0.25)",
};

/** エリアの配置（動的計算）。重ならないように中央＋リング配置し、エリア数が増えても破綻しない。 */
type AreaSlot = {
  leftPct: number;
  topPct: number;
  diameterPct: number; // 直径＝コンテナ幅に対する%（aspect-square で真円）
  expandCorner: ExpandCorner;
  zIndex: number;
};

function cornerForAngle(deg: number): ExpandCorner {
  const d = ((deg % 360) + 360) % 360;
  if (d < 90) return "bottom-right";
  if (d < 180) return "bottom-left";
  if (d < 270) return "top-left";
  return "top-right";
}

/** 標準5エリア：四隅＋中央（斜めに散らし、端でクリップする地図配置） */
const MAP_SLOTS_BY_KIND: Record<string, AreaSlot> = {
  article: {
    leftPct: 8,
    topPct: 12,
    diameterPct: 48,
    expandCorner: "top-left",
    zIndex: 16,
  },
  service: {
    leftPct: 92,
    topPct: 12,
    diameterPct: 46,
    expandCorner: "top-right",
    zIndex: 16,
  },
  "events-info": {
    leftPct: 8,
    topPct: 90,
    diameterPct: 46,
    expandCorner: "bottom-left",
    zIndex: 16,
  },
  media: {
    leftPct: 92,
    topPct: 90,
    diameterPct: 48,
    expandCorner: "bottom-right",
    zIndex: 16,
  },
  community: {
    leftPct: 50,
    topPct: 50,
    diameterPct: 38,
    expandCorner: "bottom-right",
    zIndex: 24,
  },
};

/**
 * サブカテゴリ群からエリアの座標・サイズを算出する。
 * 標準5種は四隅＋中央の有機配置。それ以外は外周リングにフォールバック。
 */
function computeAreaSlots(subs: { id: string; contentKind: string }[]): Record<string, AreaSlot> {
  const slots: Record<string, AreaSlot> = {};
  const extras: { id: string; contentKind: string }[] = [];

  for (const s of subs) {
    const preset = MAP_SLOTS_BY_KIND[s.contentKind];
    if (preset) {
      slots[s.id] = { ...preset };
    } else {
      extras.push(s);
    }
  }

  if (extras.length > 0) {
    const ringD = Math.max(22, Math.min(30, Math.round(132 / extras.length)));
    extras.forEach((s, i) => {
      // 45°ずらしたリングで十字にならないよう配置
      const angle = -45 + (360 / extras.length) * i;
      const rad = (angle * Math.PI) / 180;
      slots[s.id] = {
        leftPct: 50 + 46 * Math.cos(rad),
        topPct: 50 + 42 * Math.sin(rad),
        diameterPct: ringD,
        expandCorner: cornerForAngle(angle),
        zIndex: 14,
      };
    });
  }

  return slots;
}

const PREVIEW_LIMIT = 4;
const CHIP_SIZE = 76;

const CORNER_ARROW: Record<
  ExpandCorner,
  { Icon: typeof ArrowUpLeft; position: React.CSSProperties }
> = {
  "top-left": { Icon: ArrowUpLeft, position: { top: 6, left: 6 } },
  "top-right": { Icon: ArrowUpRight, position: { top: 6, right: 6 } },
  "bottom-left": { Icon: ArrowDownLeft, position: { bottom: 6, left: 6 } },
  "bottom-right": { Icon: ArrowDownRight, position: { bottom: 6, right: 6 } },
};

/* ------------------------------------------------------------------ */
/* 小バブル                                                              */
/* ------------------------------------------------------------------ */

function ContentChip({
  item,
  meta,
  roomHref,
  floatIndex,
}: {
  item: CategoryContentItem;
  meta: AreaMeta;
  roomHref: string;
  floatIndex: number;
}) {
  const Icon = meta.icon;
  const shortTitle = item.title.length > 12 ? item.title.slice(0, 11) + "…" : item.title;
  const dur = 5 + (floatIndex % 4) * 1.2;

  return (
    <Link
      href={roomHref}
      className="flex shrink-0 flex-col items-center justify-center gap-1 rounded-full border shadow-md transition-transform hover:scale-105 pointer-events-auto"
      style={{
        width: CHIP_SIZE,
        height: CHIP_SIZE,
        background: meta.bubbleBg,
        borderColor: `${meta.textColor}28`,
        color: meta.textColor,
        animation: `subBubbleFloat ${dur}s ease-in-out ${floatIndex * 0.45}s infinite`,
      }}
      title={item.title}
    >
      <span
        className="flex h-9 w-9 items-center justify-center rounded-full"
        style={{ background: `${meta.textColor}16` }}
      >
        <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" strokeWidth={2.2} />
      </span>
      <span className="w-[88%] text-center text-[12px] font-bold leading-tight">{shortTitle}</span>
    </Link>
  );
}

function RoomChip({
  room,
  meta,
  floatIndex,
}: {
  room: CommunityRoomItem;
  meta: AreaMeta;
  floatIndex: number;
}) {
  const shortName = room.name.length > 12 ? room.name.slice(0, 11) + "…" : room.name;
  const hot = isForumHot({
    postCount: room.postCount,
    participantCount: room.participantCount,
    lastPostedAt: room.lastPostedAt,
  });
  const dur = 5 + (floatIndex % 4) * 1.2;

  return (
    <Link
      href={`/forum/${room.id}`}
      className="flex shrink-0 flex-col items-center justify-center gap-1 rounded-full border shadow-md transition-transform hover:scale-105 pointer-events-auto"
      style={{
        width: CHIP_SIZE,
        height: CHIP_SIZE,
        background: meta.bubbleBg,
        borderColor: hot ? "rgba(255,120,40,0.55)" : `${meta.textColor}28`,
        color: meta.textColor,
        boxShadow: hot ? "0 0 12px rgba(255,120,40,0.3)" : undefined,
        animation: `subBubbleFloat ${dur}s ease-in-out ${floatIndex * 0.45}s infinite`,
      }}
      title={room.name}
    >
      <span
        className="flex h-9 w-9 items-center justify-center rounded-full text-xl leading-none"
        style={{ background: `${meta.textColor}16` }}
      >
        {room.emoji?.trim() ? room.emoji.trim() : <Users className="h-[18px] w-[18px]" strokeWidth={2.2} />}
      </span>
      <span className="w-[88%] text-center text-[12px] font-bold leading-tight">{shortName}</span>
    </Link>
  );
}

function ExpandCornerButton({
  corner,
  count,
  onClick,
  color,
}: {
  corner: ExpandCorner;
  count: number;
  onClick: () => void;
  color: string;
}) {
  const { Icon, position } = CORNER_ARROW[corner];
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="absolute z-30 flex items-center gap-0.5 rounded-full border bg-white/95 px-2 py-1 text-[10px] font-bold shadow-md backdrop-blur-sm transition-transform hover:scale-105 pointer-events-auto"
      style={{ ...position, color, borderColor: `${color}30` }}
      aria-label={`${count}件をもっと見る`}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
      <span>+{count}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* 展開オーバーレイ                                                      */
/* ------------------------------------------------------------------ */

function ExpandedAreaPanel({
  meta,
  roomHref,
  isCommunity,
  items,
  rooms,
  onClose,
}: {
  meta: AreaMeta;
  roomHref: string;
  isCommunity: boolean;
  items: CategoryContentItem[];
  rooms: CommunityRoomItem[];
  onClose: () => void;
}) {
  const Icon = meta.icon;

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center p-4 sm:p-8">
      <button
        type="button"
        className="absolute inset-0 bg-background/60 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="閉じる"
      />
      <div
        className="relative z-10 flex max-h-[88%] w-full max-w-md flex-col overflow-hidden rounded-[2.5rem] shadow-2xl"
        style={{ background: meta.solidColor }}
      >
        <div className="flex items-center justify-between gap-2 border-b border-black/5 px-5 py-3">
          <div className="flex items-center gap-2 text-sm font-bold" style={{ color: meta.textColor }}>
            <Icon className="h-4 w-4" />
            {meta.label}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-black/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-wrap justify-center gap-3">
            {isCommunity
              ? rooms.map((room, i) => (
                  <RoomChip key={room.id} room={room} meta={meta} floatIndex={i} />
                ))
              : items.map((item, i) => (
                  <ContentChip key={item.id} item={item} meta={meta} roomHref={roomHref} floatIndex={i} />
                ))}
          </div>
        </div>

        <div className="border-t border-black/5 px-5 py-3">
          <Link
            href={roomHref}
            className="flex items-center justify-center gap-1 rounded-full bg-white/80 px-4 py-2 text-xs font-semibold shadow-sm transition-colors hover:bg-white"
            style={{ color: meta.textColor }}
          >
            {isCommunity ? "掲示板へ" : "一覧を見る"}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ブロブ（大きなパステル円）                                            */
/* ------------------------------------------------------------------ */

function BlobArea({
  category,
  sub,
  meta,
  blobIndex,
  slot,
  isExpanded,
  onExpand,
  onCollapse,
}: {
  category: ForumCategory;
  sub: ForumSubCategory;
  meta: AreaMeta;
  blobIndex: number;
  slot: AreaSlot;
  isExpanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
}) {
  const [items, setItems] = useState<CategoryContentItem[]>([]);
  const [communityRooms, setCommunityRooms] = useState<CommunityRoomItem[]>([]);
  const [hotOverride, setHotOverride] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const isCommunity = sub.contentKind === "community";
  const Icon = meta.icon;
  const roomHref = `/forum/${category.slug}/${sub.slug}`;

  useEffect(() => {
    let cancelled = false;

    // 面の炎マーク手動上書き（記事/サービス等もコミュニティも共通で取得）
    const faceQ = new URLSearchParams({ categorySlug: category.slug, subSlug: sub.slug });
    fetch(`/api/forum/rooms/category-content?${faceQ}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (typeof d.hotOverride === "boolean" || d.hotOverride === null) setHotOverride(d.hotOverride);
        if (!isCommunity && Array.isArray(d.items)) setItems(d.items);
      })
      .catch(console.error)
      .finally(() => { if (!cancelled && !isCommunity) setLoading(false); });

    if (isCommunity) {
      const q = new URLSearchParams({
        categoryId: category.id,
        subCategoryId: sub.id,
        categorySlug: category.slug,
        subSlug: sub.slug,
      });
      fetch(`/api/forum/rooms?${q}`, { credentials: "include" })
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled && Array.isArray(d.rooms)) setCommunityRooms(d.rooms);
        })
        .catch(console.error)
        .finally(() => { if (!cancelled) setLoading(false); });
    }
    return () => { cancelled = true; };
  }, [category.id, category.slug, sub.id, sub.slug, isCommunity]);

  const blobHot = useMemo(() => {
    if (hotOverride === true) return true;
    if (hotOverride === false) return false;
    if (!isCommunity) return false;
    return communityRooms.some((r) =>
      isForumHot({
        postCount: r.postCount,
        participantCount: r.participantCount,
        lastPostedAt: r.lastPostedAt,
      })
    );
  }, [hotOverride, isCommunity, communityRooms]);

  const totalCount = isCommunity ? communityRooms.length : items.length;
  // コミュニティ（中央・小さめ）は 2件、他は 4件まで表示
  const previewLimit = isCommunity ? 2 : PREVIEW_LIMIT;
  const previewItems = items.slice(0, previewLimit);
  const previewRooms = communityRooms.slice(0, previewLimit);
  const hiddenCount = Math.max(0, totalCount - previewLimit);

  const blobDur = 7 + blobIndex * 1.1;
  const blobDelay = blobIndex * 0.85;

  if (isExpanded) {
    return (
      <ExpandedAreaPanel
        meta={meta}
        roomHref={roomHref}
        isCommunity={isCommunity}
        items={items}
        rooms={communityRooms}
        onClose={onCollapse}
      />
    );
  }

  return (
    <div
      className="absolute aspect-square pointer-events-none -translate-x-1/2 -translate-y-1/2"
      style={{
        width: `${slot.diameterPct}%`,
        left: `${slot.leftPct}%`,
        top: `${slot.topPct}%`,
        zIndex: slot.zIndex,
      }}
    >
      <div
        className="pointer-events-auto relative h-full w-full rounded-full"
        style={{
          animation: `blobDrift ${blobDur}s ease-in-out ${blobDelay}s infinite`,
        }}
      >
      <div
        className="relative h-full w-full overflow-hidden rounded-full"
        style={{
          background: meta.solidColor,
          boxShadow: blobHot
            ? `0 0 0 1.5px rgba(255,190,130,0.6), 0 0 46px rgba(255,140,60,0.55), 0 0 24px ${meta.glowColor}, inset 0 2px 18px rgba(255,255,255,0.65)`
            : `0 0 0 1.5px rgba(255,255,255,0.42), 0 0 38px ${meta.glowColor}, 0 12px 40px rgba(20,40,110,0.30), inset 0 2px 18px rgba(255,255,255,0.65)`,
        }}
      >
        {/* ラベル（上部） */}
        <div
          className="absolute left-1/2 top-[13%] z-10 flex w-max max-w-[80%] -translate-x-1/2 items-center gap-1.5 rounded-full px-3 py-1.5 shadow"
          style={{
            background: "rgba(255,255,255,0.88)",
            color: meta.textColor,
            fontSize: 13,
            fontWeight: 800,
            whiteSpace: "nowrap",
          }}
        >
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span>{meta.label}</span>
          {blobHot && <ForumHotFlame size="sm" className="scale-[0.65]" />}
        </div>

        {/* チップグリッド（中央フレックス — はみ出しなし） */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center pt-[30%] pb-[8%]">
          <div className="flex flex-wrap items-center justify-center gap-2 px-[10%]">
            {isCommunity ? (
              loading ? (
                <span className="text-[13px] opacity-40" style={{ color: meta.textColor }}>…</span>
              ) : communityRooms.length === 0 ? (
                <Link
                  href={roomHref}
                  className="pointer-events-auto flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-bold shadow transition-transform hover:scale-105"
                  style={{
                    background: meta.bubbleBg,
                    color: meta.textColor,
                    border: `1px solid ${meta.textColor}30`,
                  }}
                >
                  参加する
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                previewRooms.map((room, i) => (
                  <RoomChip key={room.id} room={room} meta={meta} floatIndex={i + blobIndex * 4} />
                ))
              )
            ) : loading ? (
              <span className="text-[13px] opacity-40" style={{ color: meta.textColor }}>…</span>
            ) : items.length === 0 ? (
              <Link
                href={roomHref}
                className="pointer-events-auto text-[13px] font-semibold opacity-60 hover:opacity-90"
                style={{ color: meta.textColor }}
              >
                見る →
              </Link>
            ) : (
              previewItems.map((item, i) => (
                <ContentChip
                  key={item.id}
                  item={item}
                  meta={meta}
                  roomHref={roomHref}
                  floatIndex={i + blobIndex * 4}
                />
              ))
            )}
          </div>
        </div>

        {/* 展開矢印（コンテンツが PREVIEW_LIMIT を超えるとき） */}
        {hiddenCount > 0 && (
          <ExpandCornerButton
            corner={slot.expandCorner}
            count={hiddenCount}
            onClick={onExpand}
            color={meta.textColor}
          />
        )}
      </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* メインエクスポート                                                     */
/* ------------------------------------------------------------------ */

export function CategorySubAreaView({
  category,
  subCategories,
}: {
  category: ForumCategory;
  subCategories: ForumSubCategory[];
}) {
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);

  // コミュニティを最後に描画して中央で前面に
  const sorted = [
    ...subCategories.filter((s) => s.contentKind !== "community"),
    ...subCategories.filter((s) => s.contentKind === "community"),
  ];
  const slots = useMemo(
    () => computeAreaSlots(subCategories.map((s) => ({ id: s.id, contentKind: s.contentKind }))),
    [subCategories]
  );

  return (
    <>
      <style>{`
        @keyframes subBubbleFloat {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          25%      { transform: translateY(-6px) translateX(2px); }
          55%      { transform: translateY(4px) translateX(-2px); }
          80%      { transform: translateY(-3px) translateX(1px); }
        }
        @keyframes blobDrift {
          0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); }
          30%      { transform: translateY(-8px) translateX(4px) rotate(0.6deg); }
          60%      { transform: translateY(5px) translateX(-3px) rotate(-0.5deg); }
          85%      { transform: translateY(-3px) translateX(2px) rotate(0.2deg); }
        }
      `}</style>

      <div className="px-3 py-4 sm:px-5 sm:py-6">
        <div
          className="relative mx-auto aspect-[4/3] w-full max-w-6xl overflow-hidden rounded-3xl sm:aspect-[16/10]"
          style={{
            minHeight: 480,
            background: "linear-gradient(145deg, #20356d 0%, #2f57a8 48%, #4d7ed3 100%)",
            boxShadow:
              "inset 0 1px 42px rgba(9, 22, 58, 0.42), inset 0 -24px 44px rgba(8, 18, 46, 0.3)",
          }}
        >
          {/* マップの柔らかい光 */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 48%, rgba(208, 230, 255, 0.2) 0%, rgba(120, 160, 240, 0.05) 42%, transparent 72%)",
            }}
          />

          {/* 地形図っぽい等高線 */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.24]"
            style={{
              backgroundImage:
                "repeating-radial-gradient(circle at 18% 22%, rgba(255,255,255,0.22) 0 2px, transparent 2px 22px), repeating-radial-gradient(circle at 80% 28%, rgba(255,255,255,0.14) 0 2px, transparent 2px 26px), repeating-radial-gradient(circle at 52% 78%, rgba(255,255,255,0.14) 0 2px, transparent 2px 24px)",
            }}
          />

          {/* 薄い経路ライン */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.16]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(26deg, rgba(255,255,255,0.28) 0 2px, transparent 2px 34px), repeating-linear-gradient(-38deg, rgba(255,255,255,0.2) 0 1px, transparent 1px 28px)",
              maskImage: "radial-gradient(ellipse at 50% 50%, #000 18%, transparent 92%)",
              WebkitMaskImage:
                "radial-gradient(ellipse at 50% 50%, #000 18%, transparent 92%)",
            }}
          />

          {/* 霧感 */}
          <div
            className="pointer-events-none absolute inset-0 opacity-80"
            style={{
              background:
                "radial-gradient(ellipse at 14% 74%, rgba(255,255,255,0.1), transparent 55%), radial-gradient(ellipse at 86% 18%, rgba(255,255,255,0.08), transparent 52%)",
            }}
          />

          {/* 端を締めるビネット */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 50%, transparent 66%, rgba(12, 24, 56, 0.42) 100%)",
            }}
          />
          {sorted.map((sub, i) => {
            const meta = AREA_META[sub.contentKind] ?? DEFAULT_META;
            const slot = slots[sub.id];
            if (!slot) return null;
            const isThisExpanded = expandedSubId === sub.id;
            return (
              <BlobArea
                key={sub.id}
                category={category}
                sub={sub}
                meta={meta}
                blobIndex={i}
                slot={slot}
                isExpanded={isThisExpanded}
                onExpand={() => setExpandedSubId(sub.id)}
                onCollapse={() => setExpandedSubId(null)}
              />
            );
          })}
        </div>
      </div>
    </>
  );
}
