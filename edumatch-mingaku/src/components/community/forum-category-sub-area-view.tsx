"use client";

import { useEffect, useState } from "react";
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
import type { ForumCategory, ForumSubCategory } from "./forum-category-explorer";

/* ------------------------------------------------------------------ */
/* エリアメタ定義                                                        */
/* ------------------------------------------------------------------ */

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
/* 個別コンテンツバブル（真円・タイトル短縮）                             */
/* ------------------------------------------------------------------ */

function SmallBubble({
  item,
  meta,
  floatIndex,
}: {
  item: CategoryContentItem;
  meta: AreaMeta;
  floatIndex: number;
}) {
  const dur = 4.5 + (floatIndex % 4) * 1.2;
  const delay = floatIndex * 0.55;
  const isExternal = /^https?:\/\//.test(item.href);

  const style: React.CSSProperties = {
    background: meta.bubbleBg,
    borderColor: `${meta.textColor}28`,
    color: meta.textColor,
    boxShadow: `0 3px 14px ${meta.glowColor}`,
    animation: `subBubbleFloat ${dur}s ease-in-out ${delay}s infinite`,
    width: 72,
    height: 72,
  };
  const cls =
    "flex shrink-0 items-center justify-center rounded-full border " +
    "text-center text-[10px] font-semibold leading-tight backdrop-blur-sm " +
    "transition-transform hover:scale-110 hover:shadow-lg cursor-pointer overflow-hidden p-1.5";

  const inner = (
    <span className="line-clamp-3 w-full text-center">{item.title}</span>
  );

  if (isExternal) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" className={cls} style={style}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={item.href} className={cls} style={style}>
      {inner}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* ブロブ本体                                                            */
/* ------------------------------------------------------------------ */

function BlobArea({
  sub,
  categorySlug,
  meta,
  blobIndex,
}: {
  sub: ForumSubCategory;
  categorySlug: string;
  meta: AreaMeta;
  blobIndex: number;
}) {
  const [items, setItems] = useState<CategoryContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const isCommunity = sub.contentKind === "community";
  const Icon = meta.icon;
  const roomHref = `/forum/${categorySlug}/${sub.slug}`;

  useEffect(() => {
    if (isCommunity) { setLoading(false); return; }
    let cancelled = false;
    const q = new URLSearchParams({ categorySlug, subSlug: sub.slug });
    fetch(`/api/forum/rooms/category-content?${q}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled && Array.isArray(d.items)) setItems(d.items); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [categorySlug, sub.slug, isCommunity]);

  const blobDur = 7 + blobIndex * 1.2;
  const blobDelay = blobIndex * 0.85;

  return (
    <div className="flex w-[260px] flex-col items-center gap-3 sm:w-[290px] md:w-[320px]">
      {/* ── タイトル（ブロブの外、常に表示） ── */}
      <div className="flex items-center gap-1.5">
        <Icon className="h-4 w-4 shrink-0" style={{ color: meta.textColor }} />
        <span className="text-sm font-bold" style={{ color: meta.textColor }}>
          {meta.label}
        </span>
      </div>

      {/* ── 楕円ブロブ ── */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          borderRadius: "50%",
          aspectRatio: "1 / 1",
          background: `radial-gradient(ellipse at 38% 32%, ${meta.blobColor} 0%, ${meta.blobColor}bb 55%, ${meta.blobColor}66 100%)`,
          boxShadow: `0 8px 32px ${meta.glowColor}, inset 0 1px 2px rgba(255,255,255,0.75)`,
          animation: `blobDrift ${blobDur}s ease-in-out ${blobDelay}s infinite`,
        }}
      >
        {/* ハイライト */}
        <div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at 32% 26%, rgba(255,255,255,0.6) 0%, transparent 55%)",
          }}
        />

        {/* コンテンツ */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-[8%] py-[8%]">
          {isCommunity ? (
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
  // community を最後に
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

      {/* flex-wrap + justify-center で5個が自然にまとまる */}
      <div className="flex flex-wrap justify-center gap-8 p-8">
        {sorted.map((sub, i) => {
          const meta = AREA_META[sub.contentKind] ?? DEFAULT_META;
          return (
            <BlobArea
              key={sub.id}
              sub={sub}
              categorySlug={category.slug}
              meta={meta}
              blobIndex={i}
            />
          );
        })}
      </div>
    </>
  );
}
