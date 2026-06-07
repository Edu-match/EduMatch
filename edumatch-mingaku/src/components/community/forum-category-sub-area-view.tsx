"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Calendar,
  FileText,
  MessageCircle,
  Users,
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
    blobColor: "rgba(255, 221, 232, 0.55)",
    bubbleBg: "rgba(255, 255, 255, 0.88)",
    textColor: "#b84065",
    glowColor: "rgba(255, 160, 190, 0.25)",
  },
  service: {
    label: "サービス",
    icon: Briefcase,
    blobColor: "rgba(198, 240, 218, 0.55)",
    bubbleBg: "rgba(255, 255, 255, 0.88)",
    textColor: "#237a4e",
    glowColor: "rgba(100, 210, 150, 0.25)",
  },
  media: {
    label: "動画",
    icon: Video,
    blobColor: "rgba(226, 209, 249, 0.55)",
    bubbleBg: "rgba(255, 255, 255, 0.88)",
    textColor: "#6933a8",
    glowColor: "rgba(180, 130, 245, 0.25)",
  },
  "events-info": {
    label: "イベント",
    icon: Calendar,
    blobColor: "rgba(255, 240, 190, 0.55)",
    bubbleBg: "rgba(255, 255, 255, 0.88)",
    textColor: "#8a6000",
    glowColor: "rgba(255, 205, 60, 0.25)",
  },
  community: {
    label: "コミュニティ",
    icon: MessageCircle,
    blobColor: "rgba(189, 232, 251, 0.55)",
    bubbleBg: "rgba(255, 255, 255, 0.88)",
    textColor: "#1060a0",
    glowColor: "rgba(80, 180, 240, 0.25)",
  },
};

const DEFAULT_META: AreaMeta = {
  label: "その他",
  icon: MessageCircle,
  blobColor: "rgba(232, 232, 232, 0.5)",
  bubbleBg: "rgba(255, 255, 255, 0.88)",
  textColor: "#555",
  glowColor: "rgba(160, 160, 160, 0.2)",
};

const BUBBLE_SIZE = 68;

/* ------------------------------------------------------------------ */
/* コンテンツバブル（アイコン＋短いタイトル）                             */
/* ------------------------------------------------------------------ */

function ContentBubble({
  item,
  meta,
  floatIndex,
  roomHref,
}: {
  item: CategoryContentItem;
  meta: AreaMeta;
  floatIndex: number;
  roomHref: string;
}) {
  const dur = 5 + (floatIndex % 4) * 1.1;
  const delay = floatIndex * 0.5;
  const Icon = meta.icon;
  const shortTitle = item.title.length > 10 ? item.title.slice(0, 9) + "…" : item.title;

  return (
    <Link
      href={roomHref}
      className="relative flex shrink-0 flex-col items-center justify-center gap-1 rounded-full border backdrop-blur-sm transition-transform hover:scale-105 hover:shadow-md"
      style={{
        width: BUBBLE_SIZE,
        height: BUBBLE_SIZE,
        background: meta.bubbleBg,
        borderColor: `${meta.textColor}20`,
        color: meta.textColor,
        boxShadow: `0 2px 10px ${meta.glowColor}`,
        animation: `subBubbleFloat ${dur}s ease-in-out ${delay}s infinite`,
      }}
      title={item.title}
    >
      <span
        className="flex h-7 w-7 items-center justify-center rounded-full"
        style={{ background: `${meta.textColor}14` }}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
      </span>
      <span className="line-clamp-2 w-[88%] text-center text-[8px] font-medium leading-tight">
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
  const dur = 5 + (floatIndex % 4) * 1.1;
  const delay = floatIndex * 0.5;
  const shortName = room.name.length > 10 ? room.name.slice(0, 9) + "…" : room.name;
  const hot = isForumHot({
    postCount: room.postCount,
    participantCount: room.participantCount,
    lastPostedAt: room.lastPostedAt,
  });

  return (
    <Link
      href={`/forum/${room.id}`}
      className="relative flex shrink-0 flex-col items-center justify-center gap-1 rounded-full border backdrop-blur-sm transition-transform hover:scale-105 hover:shadow-md"
      style={{
        width: BUBBLE_SIZE,
        height: BUBBLE_SIZE,
        background: meta.bubbleBg,
        borderColor: hot ? "rgba(255,120,40,0.4)" : `${meta.textColor}20`,
        color: meta.textColor,
        boxShadow: hot
          ? "0 0 14px rgba(255,120,40,0.35), 0 2px 10px rgba(80,180,240,0.2)"
          : `0 2px 10px ${meta.glowColor}`,
        animation: `subBubbleFloat ${dur}s ease-in-out ${delay}s infinite`,
      }}
      title={room.name}
    >
      {hot && (
        <span className="absolute -right-0.5 -top-0.5 z-10">
          <ForumHotFlame size="sm" />
        </span>
      )}
      <span
        className="flex h-7 w-7 items-center justify-center rounded-full"
        style={{ background: `${meta.textColor}14` }}
      >
        <Users className="h-3.5 w-3.5" strokeWidth={2.25} />
      </span>
      <span className="line-clamp-2 w-[88%] text-center text-[8px] font-medium leading-tight">
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

  const blobDur = 8 + blobIndex * 0.9;
  const blobDelay = blobIndex * 0.7;
  const nudgeY = blobIndex % 2 === 0 ? 0 : 8;

  return (
    <div
      className="relative flex w-[168px] flex-col items-center sm:w-[178px]"
      style={{ marginTop: nudgeY }}
    >
      <div
        className="relative w-full overflow-visible"
        style={{
          borderRadius: "50%",
          aspectRatio: "1 / 1",
          background: `radial-gradient(ellipse at 40% 35%, ${meta.blobColor} 0%, transparent 72%)`,
          boxShadow: blobHot
            ? "0 0 20px rgba(255, 120, 50, 0.3)"
            : "none",
          animation: `blobDrift ${blobDur}s ease-in-out ${blobDelay}s infinite`,
        }}
      >
        {/* エリアラベル（ブロブ内上部） */}
        <div
          className="absolute left-1/2 top-[10%] z-10 flex -translate-x-1/2 items-center gap-1 rounded-full px-2 py-0.5 backdrop-blur-sm"
          style={{
            background: "rgba(255,255,255,0.72)",
            color: meta.textColor,
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          <Icon className="h-3 w-3 shrink-0" />
          <span>{meta.label}</span>
          {blobHot && <ForumHotFlame size="sm" className="scale-75" />}
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center px-[10%] pt-[18%]">
          {isCommunity ? (
            loading ? (
              <span className="text-[10px] opacity-40" style={{ color: meta.textColor }}>
                …
              </span>
            ) : communityRooms.length > 0 ? (
              <div className="flex flex-wrap items-center justify-center gap-1.5">
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
                className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-semibold shadow-sm transition-transform hover:scale-105"
                style={{
                  background: meta.bubbleBg,
                  color: meta.textColor,
                  border: `1px solid ${meta.textColor}25`,
                }}
              >
                参加する
                <ArrowRight className="h-3 w-3" />
              </Link>
            )
          ) : loading ? (
            <span className="text-[10px] opacity-40" style={{ color: meta.textColor }}>
              …
            </span>
          ) : items.length === 0 ? (
            <Link
              href={roomHref}
              className="text-[10px] font-medium opacity-50 hover:opacity-80"
              style={{ color: meta.textColor }}
            >
              見る →
            </Link>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {items.map((item, i) => (
                <ContentBubble
                  key={item.id}
                  item={item}
                  meta={meta}
                  floatIndex={i + blobIndex * 4}
                  roomHref={roomHref}
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
          40%      { transform: translateY(-3px) translateX(1px); }
          70%      { transform: translateY(2px); }
        }
        @keyframes blobDrift {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-4px); }
        }
      `}</style>

      {/* 1つのキャンバスにまとめて、エリア同士が近接・重なり気味に */}
      <div className="relative mx-auto max-w-3xl px-3 py-5">
        <div
          className="pointer-events-none absolute inset-4 rounded-[40%] opacity-60"
          style={{
            background:
              "radial-gradient(ellipse at 50% 45%, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.4) 55%, transparent 80%)",
          }}
        />
        <div className="relative flex flex-wrap items-center justify-center gap-x-1 gap-y-0 sm:gap-x-2">
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
      </div>
    </>
  );
}
