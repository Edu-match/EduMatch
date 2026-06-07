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

/** 添付イメージに合わせた有機的配置（中央＋四隅、端でクリップ） */
const BLOB_SLOTS: Record<
  string,
  {
    style: React.CSSProperties;
    expandCorner: ExpandCorner;
    diameter: string;
    zIndex: number;
  }
> = {
  article: {
    style: { top: "-8%", left: "-7%" },
    expandCorner: "top-left",
    diameter: "46%",
    zIndex: 20,
  },
  service: {
    style: { top: "-7%", right: "-6%" },
    expandCorner: "top-right",
    diameter: "45%",
    zIndex: 20,
  },
  media: {
    style: { bottom: "-7%", right: "-7%" },
    expandCorner: "bottom-right",
    diameter: "45%",
    zIndex: 20,
  },
  "events-info": {
    style: { bottom: "-8%", left: "-6%" },
    expandCorner: "bottom-left",
    diameter: "45%",
    zIndex: 20,
  },
  community: {
    style: { top: "50%", left: "50%" },
    expandCorner: "bottom-right",
    diameter: "50%",
    zIndex: 10,
  },
};

/** プレビュー用：バブル内のゆるい座標（大きめチップが重ならない配置） */
const PREVIEW_SPOTS = [
  { top: "30%", left: "24%" },
  { top: "44%", left: "60%" },
  { top: "66%", left: "34%" },
];

const PREVIEW_LIMIT = 3;
const CHIP_SIZE = 80;

const CORNER_ARROW: Record<
  ExpandCorner,
  { Icon: typeof ArrowUpLeft; position: React.CSSProperties }
> = {
  "top-left": { Icon: ArrowUpLeft, position: { top: 2, left: 2 } },
  "top-right": { Icon: ArrowUpRight, position: { top: 2, right: 2 } },
  "bottom-left": { Icon: ArrowDownLeft, position: { bottom: 2, left: 2 } },
  "bottom-right": { Icon: ArrowDownRight, position: { bottom: 2, right: 2 } },
};

/* ------------------------------------------------------------------ */
/* 小バブル                                                              */
/* ------------------------------------------------------------------ */

function ContentChip({
  item,
  meta,
  roomHref,
  floatIndex,
  style,
  staticLayout = false,
}: {
  item: CategoryContentItem;
  meta: AreaMeta;
  roomHref: string;
  floatIndex: number;
  style?: React.CSSProperties;
  staticLayout?: boolean;
}) {
  const Icon = meta.icon;
  const shortTitle = item.title.length > 9 ? item.title.slice(0, 8) + "…" : item.title;
  const dur = 4.5 + (floatIndex % 4) * 1.3;

  return (
    <Link
      href={roomHref}
      className={
        staticLayout
          ? "flex flex-col items-center justify-center gap-0.5 rounded-full border shadow-sm transition-transform hover:scale-110 pointer-events-auto"
          : "absolute flex flex-col items-center justify-center gap-0.5 rounded-full border shadow-sm transition-transform hover:scale-110 pointer-events-auto"
      }
      style={{
        width: CHIP_SIZE,
        height: CHIP_SIZE,
        background: meta.bubbleBg,
        borderColor: `${meta.textColor}22`,
        color: meta.textColor,
        animation: `subBubbleFloat ${dur}s ease-in-out ${floatIndex * 0.4}s infinite`,
        ...style,
      }}
      title={item.title}
    >
      <span
        className="flex h-8 w-8 items-center justify-center rounded-full"
        style={{ background: `${meta.textColor}14` }}
      >
        <Icon className="h-4 w-4" strokeWidth={2.25} />
      </span>
      <span className="w-[90%] text-center text-[10px] font-semibold leading-tight">{shortTitle}</span>
    </Link>
  );
}

function RoomChip({
  room,
  meta,
  floatIndex,
  style,
  staticLayout = false,
}: {
  room: CommunityRoomItem;
  meta: AreaMeta;
  floatIndex: number;
  style?: React.CSSProperties;
  staticLayout?: boolean;
}) {
  const shortName = room.name.length > 9 ? room.name.slice(0, 8) + "…" : room.name;
  const hot = isForumHot({
    postCount: room.postCount,
    participantCount: room.participantCount,
    lastPostedAt: room.lastPostedAt,
  });
  const dur = 4.5 + (floatIndex % 4) * 1.3;

  return (
    <Link
      href={`/forum/${room.id}`}
      className={
        staticLayout
          ? "flex flex-col items-center justify-center gap-0.5 rounded-full border shadow-sm transition-transform hover:scale-110 pointer-events-auto"
          : "absolute flex flex-col items-center justify-center gap-0.5 rounded-full border shadow-sm transition-transform hover:scale-110 pointer-events-auto"
      }
      style={{
        width: CHIP_SIZE,
        height: CHIP_SIZE,
        background: meta.bubbleBg,
        borderColor: hot ? "rgba(255,120,40,0.5)" : `${meta.textColor}22`,
        color: meta.textColor,
        boxShadow: hot ? "0 0 10px rgba(255,120,40,0.25)" : undefined,
        animation: `subBubbleFloat ${dur}s ease-in-out ${floatIndex * 0.4}s infinite`,
        ...style,
      }}
      title={room.name}
    >
      <span
        className="flex h-8 w-8 items-center justify-center rounded-full text-lg leading-none"
        style={{ background: `${meta.textColor}14` }}
      >
        {room.emoji?.trim() ? room.emoji.trim() : <Users className="h-4 w-4" strokeWidth={2.25} />}
      </span>
      <span className="w-[90%] text-center text-[10px] font-semibold leading-tight">{shortName}</span>
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
                  <RoomChip key={room.id} room={room} meta={meta} floatIndex={i} staticLayout />
                ))
              : items.map((item, i) => (
                  <ContentChip
                    key={item.id}
                    item={item}
                    meta={meta}
                    roomHref={roomHref}
                    floatIndex={i}
                    staticLayout
                  />
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
  isExpanded,
  onExpand,
  onCollapse,
}: {
  category: ForumCategory;
  sub: ForumSubCategory;
  meta: AreaMeta;
  blobIndex: number;
  isExpanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
}) {
  const [items, setItems] = useState<CategoryContentItem[]>([]);
  const [communityRooms, setCommunityRooms] = useState<CommunityRoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const isCommunity = sub.contentKind === "community";
  const Icon = meta.icon;
  const roomHref = `/forum/${category.slug}/${sub.slug}`;
  const slot = BLOB_SLOTS[sub.contentKind] ?? {
    style: { top: "20%", left: "20%" },
    expandCorner: "bottom-right" as ExpandCorner,
    diameter: "38%",
    zIndex: 15,
  };

  useEffect(() => {
    let cancelled = false;

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
      return () => { cancelled = true; };
    }

    const q = new URLSearchParams({ categorySlug: category.slug, subSlug: sub.slug });
    fetch(`/api/forum/rooms/category-content?${q}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled && Array.isArray(d.items)) setItems(d.items); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [category.id, category.slug, sub.id, sub.slug, isCommunity]);

  const blobHot = useMemo(() => {
    if (!isCommunity) return false;
    return communityRooms.some((r) =>
      isForumHot({
        postCount: r.postCount,
        participantCount: r.participantCount,
        lastPostedAt: r.lastPostedAt,
      })
    );
  }, [isCommunity, communityRooms]);

  const totalCount = isCommunity ? communityRooms.length : items.length;
  const previewItems = items.slice(0, PREVIEW_LIMIT);
  const previewRooms = communityRooms.slice(0, PREVIEW_LIMIT);
  const hiddenCount = Math.max(0, totalCount - PREVIEW_LIMIT);
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
      className="absolute pointer-events-none"
      style={{
        width: slot.diameter,
        height: slot.diameter,
        zIndex: slot.zIndex,
        ...slot.style,
        ...(sub.contentKind === "community"
          ? { transform: "translate(-50%, -50%)" }
          : undefined),
      }}
    >
      <div
        className="pointer-events-auto relative h-full w-full rounded-full"
        style={{
          animation: `blobDrift ${blobDur}s ease-in-out ${blobDelay}s infinite`,
        }}
      >
      <div
        className="relative h-full w-full rounded-full"
        style={{
          background: meta.solidColor,
          boxShadow: blobHot
            ? `0 0 40px rgba(255,140,60,0.5), 0 0 24px ${meta.glowColor}, inset 0 2px 16px rgba(255,255,255,0.6)`
            : `0 0 32px ${meta.glowColor}, 0 12px 38px rgba(2,3,60,0.38), inset 0 2px 16px rgba(255,255,255,0.6)`,
        }}
      >
        {/* ラベル */}
        <div
          className="absolute left-1/2 top-[18%] z-10 flex -translate-x-1/2 items-center gap-1 rounded-full px-2.5 py-0.5 shadow-sm"
          style={{
            background: "rgba(255,255,255,0.78)",
            color: meta.textColor,
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          <Icon className="h-3 w-3 shrink-0" />
          <span>{meta.label}</span>
          {blobHot && <ForumHotFlame size="sm" className="scale-[0.6]" />}
        </div>

        {/* プレビューチップ（有機配置） */}
        <div className="pointer-events-none absolute inset-0">
          {isCommunity ? (
            loading ? (
              <span
                className="absolute left-1/2 top-[52%] -translate-x-1/2 text-[10px] opacity-40"
                style={{ color: meta.textColor }}
              >
                …
              </span>
            ) : communityRooms.length === 0 ? (
              <Link
                href={roomHref}
                className="pointer-events-auto absolute left-1/2 top-[48%] flex -translate-x-1/2 items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-semibold shadow-sm transition-transform hover:scale-105"
                style={{
                  background: meta.bubbleBg,
                  color: meta.textColor,
                  border: `1px solid ${meta.textColor}25`,
                }}
              >
                参加する
                <ArrowRight className="h-3 w-3" />
              </Link>
            ) : (
              previewRooms.map((room, i) => (
                <RoomChip
                  key={room.id}
                  room={room}
                  meta={meta}
                  floatIndex={i + blobIndex * 3}
                  style={PREVIEW_SPOTS[i]}
                />
              ))
            )
          ) : loading ? (
            <span
              className="absolute left-1/2 top-[52%] -translate-x-1/2 text-[10px] opacity-40"
              style={{ color: meta.textColor }}
            >
              …
            </span>
          ) : items.length === 0 ? (
            <Link
              href={roomHref}
              className="pointer-events-auto absolute left-1/2 top-[48%] -translate-x-1/2 text-[10px] font-medium opacity-50 hover:opacity-80"
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
                floatIndex={i + blobIndex * 3}
                style={PREVIEW_SPOTS[i]}
              />
            ))
          )}
        </div>

        {/* 隅の展開矢印 */}
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

  const sorted = [
    ...subCategories.filter((s) => s.contentKind !== "community"),
    ...subCategories.filter((s) => s.contentKind === "community"),
  ];

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
          30%      { transform: translateY(-10px) translateX(5px) rotate(0.8deg); }
          60%      { transform: translateY(6px) translateX(-4px) rotate(-0.6deg); }
          85%      { transform: translateY(-4px) translateX(2px) rotate(0.3deg); }
        }
      `}</style>

      <div className="px-3 py-4 sm:px-5 sm:py-6">
        <div
          className="relative mx-auto aspect-[4/3] w-full max-w-3xl overflow-hidden rounded-3xl sm:aspect-[16/10]"
          style={{
            minHeight: 360,
            background: "linear-gradient(135deg, #020381 0%, #0b2bb0 52%, #2874fc 100%)",
            boxShadow: "inset 0 1px 40px rgba(0,0,0,0.30)",
          }}
        >
          {/* 中央の発光（Interopのホームページ背景に寄せた青グラデに馴染ませる） */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 44%, rgba(125,185,255,0.30) 0%, rgba(40,116,252,0.10) 38%, transparent 68%)",
            }}
          />
          {/* 端を締めるビネット */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 50%, transparent 56%, rgba(2,3,60,0.42) 100%)",
            }}
          />
          {sorted.map((sub, i) => {
            const meta = AREA_META[sub.contentKind] ?? DEFAULT_META;
            const isThisExpanded = expandedSubId === sub.id;
            return (
              <BlobArea
                key={sub.id}
                category={category}
                sub={sub}
                meta={meta}
                blobIndex={i}
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
