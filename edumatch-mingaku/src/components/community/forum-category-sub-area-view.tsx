"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Calendar,
  FileText,
  MessageCircle,
  Video,
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
  postCount: number;
  participantCount: number;
  lastPostedAt: string;
};

type AreaMeta = {
  label: string;
  icon: typeof MessageCircle;
  blobColor: string;
  bubbleBg: string;
  textColor: string;
  glowColor: string;
};

const AREA_META: Record<string, AreaMeta> = {
  article: {
    label: "記事",
    icon: FileText,
    blobColor: "#FFDDE8",
    bubbleBg: "rgba(255,255,255,0.92)",
    textColor: "#b84065",
    glowColor: "rgba(255,160,190,0.4)",
  },
  service: {
    label: "サービス",
    icon: Briefcase,
    blobColor: "#C6F0DA",
    bubbleBg: "rgba(255,255,255,0.92)",
    textColor: "#237a4e",
    glowColor: "rgba(100,210,150,0.4)",
  },
  media: {
    label: "動画・メディア",
    icon: Video,
    blobColor: "#E2D1F9",
    bubbleBg: "rgba(255,255,255,0.92)",
    textColor: "#6933a8",
    glowColor: "rgba(180,130,245,0.4)",
  },
  "events-info": {
    label: "イベント情報",
    icon: Calendar,
    blobColor: "#FFF0BE",
    bubbleBg: "rgba(255,255,255,0.92)",
    textColor: "#8a6000",
    glowColor: "rgba(255,205,60,0.4)",
  },
  community: {
    label: "コミュニティ",
    icon: MessageCircle,
    blobColor: "#BDE8FB",
    bubbleBg: "rgba(255,255,255,0.92)",
    textColor: "#1060a0",
    glowColor: "rgba(80,180,240,0.4)",
  },
};

const DEFAULT_META: AreaMeta = {
  label: "その他",
  icon: MessageCircle,
  blobColor: "#E8E8E8",
  bubbleBg: "rgba(255,255,255,0.9)",
  textColor: "#555",
  glowColor: "rgba(160,160,160,0.3)",
};

/* ------------------------------------------------------------------ */
/* コンテンツバブル                                                      */
/* ------------------------------------------------------------------ */

function SmallBubble({
  item,
  meta,
  floatIndex,
  roomHref,
  index,
}: {
  item: CategoryContentItem;
  meta: AreaMeta;
  floatIndex: number;
  roomHref: string;
  index: number;
}) {
  const dur = 4.5 + (floatIndex % 4) * 1.2;
  const delay = floatIndex * 0.55;
  const shortTitle = item.title.length > 8 ? item.title.slice(0, 7) + "…" : item.title;

  const style: React.CSSProperties = {
    background: meta.bubbleBg,
    borderColor: `${meta.textColor}22`,
    color: meta.textColor,
    boxShadow: `0 4px 16px ${meta.glowColor}`,
    animation: `subBubbleFloat ${dur}s ease-in-out ${delay}s infinite`,
    width: 76,
    height: 76,
  };

  return (
    <Link
      href={roomHref}
      className="relative flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-full border backdrop-blur-sm transition-transform hover:scale-110 hover:shadow-lg cursor-pointer overflow-hidden"
      style={style}
      title={item.title}
    >
      <span
        className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold"
        style={{ background: `${meta.textColor}18` }}
      >
        {index + 1}
      </span>
      <span className="w-[90%] text-center text-[9px] font-semibold leading-tight">
        {shortTitle}
      </span>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* コミュニティルームバブル                                              */
/* ------------------------------------------------------------------ */

function RoomBubble({
  room,
  meta,
  floatIndex,
}: {
  room: CommunityRoomItem;
  meta: AreaMeta;
  floatIndex: number;
}) {
  const dur = 4.5 + (floatIndex % 4) * 1.2;
  const delay = floatIndex * 0.55;
  const shortName = room.name.length > 8 ? room.name.slice(0, 7) + "…" : room.name;
  const hot = isForumHot({
    postCount: room.postCount,
    participantCount: room.participantCount,
    lastPostedAt: room.lastPostedAt,
  });

  const style: React.CSSProperties = {
    background: meta.bubbleBg,
    borderColor: hot ? "rgba(255,120,40,0.45)" : `${meta.textColor}22`,
    color: meta.textColor,
    boxShadow: hot
      ? "0 0 18px rgba(255,120,40,0.4), 0 4px 16px rgba(80,180,240,0.25)"
      : `0 4px 16px ${meta.glowColor}`,
    animation: `subBubbleFloat ${dur}s ease-in-out ${delay}s infinite`,
    width: 76,
    height: 76,
  };

  return (
    <Link
      href={`/forum/${room.id}`}
      className="relative flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-full border backdrop-blur-sm transition-transform hover:scale-110 hover:shadow-lg cursor-pointer overflow-visible px-1"
      style={style}
      title={room.name}
    >
      {hot && (
        <span className="absolute -right-1 -top-1 z-10">
          <ForumHotFlame size="sm" />
        </span>
      )}
      <MessageCircle className="h-4 w-4 opacity-70" />
      <span className="w-full text-center text-[9px] font-semibold leading-tight">
        {shortName}
      </span>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* ブロブ本体                                                            */
/* ------------------------------------------------------------------ */

function BlobArea({
  category,
  sub,
  meta,
  blobIndex,
}: {
  category: ForumCategory;
  sub: ForumSubCategory;
  meta: AreaMeta;
  blobIndex: number;
}) {
  const [items, setItems] = useState<CategoryContentItem[]>([]);
  const [communityRooms, setCommunityRooms] = useState<CommunityRoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const isCommunity = sub.contentKind === "community";
  const Icon = meta.icon;
  const roomHref = `/forum/${category.slug}/${sub.slug}`;

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
          if (!cancelled && Array.isArray(d.rooms)) {
            setCommunityRooms(d.rooms);
          }
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

  const blobDur = 7 + blobIndex * 1.2;
  const blobDelay = blobIndex * 0.85;

  return (
    <div className="flex w-[260px] flex-col items-center gap-3 sm:w-[290px] md:w-[320px]">
      <div className="flex items-center gap-1.5">
        <Icon className="h-4 w-4 shrink-0" style={{ color: meta.textColor }} />
        <span className="text-sm font-bold" style={{ color: meta.textColor }}>
          {meta.label}
        </span>
        {blobHot && <ForumHotFlame size="sm" />}
      </div>

      <div
        className="relative w-full overflow-hidden"
        style={{
          borderRadius: "50%",
          aspectRatio: "1 / 1",
          background: `radial-gradient(ellipse at 38% 32%, ${meta.blobColor} 0%, ${meta.blobColor}bb 55%, ${meta.blobColor}66 100%)`,
          boxShadow: blobHot
            ? `0 0 36px rgba(255, 120, 50, 0.45), 0 8px 32px ${meta.glowColor}, inset 0 1px 2px rgba(255,255,255,0.75)`
            : `0 8px 32px ${meta.glowColor}, inset 0 1px 2px rgba(255,255,255,0.75)`,
          animation: `blobDrift ${blobDur}s ease-in-out ${blobDelay}s infinite`,
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at 32% 26%, rgba(255,255,255,0.6) 0%, transparent 55%)",
          }}
        />

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-[8%] py-[8%]">
          {isCommunity ? (
            loading ? (
              <span className="text-[11px] opacity-50" style={{ color: meta.textColor }}>
                読み込み中…
              </span>
            ) : communityRooms.length > 0 ? (
              <div className="flex flex-wrap items-center justify-center gap-2">
                {communityRooms.map((room, i) => (
                  <RoomBubble
                    key={room.id}
                    room={room}
                    meta={meta}
                    floatIndex={i + blobIndex * 4}
                  />
                ))}
              </div>
            ) : (
              <Link
                href={roomHref}
                className="flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold shadow-md transition-transform hover:scale-105"
                style={{
                  background: meta.bubbleBg,
                  color: meta.textColor,
                  border: `1.5px solid ${meta.textColor}35`,
                  boxShadow: `0 4px 16px ${meta.glowColor}`,
                }}
              >
                掲示板に参加する
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )
          ) : loading ? (
            <span className="text-[11px] opacity-50" style={{ color: meta.textColor }}>
              読み込み中…
            </span>
          ) : items.length === 0 ? (
            <Link
              href={roomHref}
              className="text-[11px] font-medium opacity-60 hover:opacity-90 transition-opacity"
              style={{ color: meta.textColor }}
            >
              ルームを見る →
            </Link>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {items.map((item, i) => (
                <SmallBubble
                  key={item.id}
                  item={item}
                  meta={meta}
                  floatIndex={i + blobIndex * 4}
                  roomHref={roomHref}
                  index={i}
                />
              ))}
            </div>
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
  const sorted = [
    ...subCategories.filter((s) => s.contentKind !== "community"),
    ...subCategories.filter((s) => s.contentKind === "community"),
  ];

  return (
    <>
      <style>{`
        @keyframes subBubbleFloat {
          0%,100% { transform: translateY(0px); }
          35%      { transform: translateY(-5px) translateX(1.5px); }
          65%      { transform: translateY(3px)  translateX(-1px); }
        }
        @keyframes blobDrift {
          0%,100% { transform: translateY(0px) scale(1); }
          40%      { transform: translateY(-8px) scale(1.015); }
          70%      { transform: translateY(4px)  scale(0.988); }
        }
      `}</style>

      <div className="flex flex-wrap justify-center gap-8 p-8">
        {sorted.map((sub, i) => {
          const meta = AREA_META[sub.contentKind] ?? DEFAULT_META;
          return (
            <BlobArea
              key={sub.id}
              category={category}
              sub={sub}
              meta={meta}
              blobIndex={i}
            />
          );
        })}
      </div>
    </>
  );
}
