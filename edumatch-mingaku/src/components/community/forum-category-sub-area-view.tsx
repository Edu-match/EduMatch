"use client";

import { useEffect, useState, useRef } from "react";
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
/* エリア定義                                                            */
/* ------------------------------------------------------------------ */

type AreaMeta = {
  label: string;
  icon: typeof MessageCircle;
  blobColor: string;    // 楕円の背景色
  bubbleBg: string;     // 中のバブル色
  textColor: string;
  glowColor: string;    // shadow glow
};

const AREA_META: Record<string, AreaMeta> = {
  article: {
    label: "記事",
    icon: FileText,
    blobColor: "#FFDDE8",
    bubbleBg: "rgba(255,255,255,0.88)",
    textColor: "#c0526f",
    glowColor: "rgba(255,180,200,0.35)",
  },
  service: {
    label: "サービス",
    icon: Briefcase,
    blobColor: "#C9F0DC",
    bubbleBg: "rgba(255,255,255,0.88)",
    textColor: "#2d7a52",
    glowColor: "rgba(120,220,170,0.35)",
  },
  media: {
    label: "動画・メディア",
    icon: Video,
    blobColor: "#E3D4F8",
    bubbleBg: "rgba(255,255,255,0.88)",
    textColor: "#6b3fa0",
    glowColor: "rgba(190,150,240,0.35)",
  },
  "events-info": {
    label: "イベント情報",
    icon: Calendar,
    blobColor: "#FFF0C2",
    bubbleBg: "rgba(255,255,255,0.88)",
    textColor: "#9a6e00",
    glowColor: "rgba(255,210,80,0.35)",
  },
  community: {
    label: "コミュニティ",
    icon: MessageCircle,
    blobColor: "#C7E8FB",
    bubbleBg: "rgba(255,255,255,0.88)",
    textColor: "#1e6fa0",
    glowColor: "rgba(100,190,240,0.35)",
  },
};

const DEFAULT_META: AreaMeta = {
  label: "その他",
  icon: MessageCircle,
  blobColor: "#E8E8E8",
  bubbleBg: "rgba(255,255,255,0.88)",
  textColor: "#555",
  glowColor: "rgba(180,180,180,0.3)",
};

/* ------------------------------------------------------------------ */
/* 浮遊アニメーション用 hook                                             */
/* ------------------------------------------------------------------ */

function useFloatStyle(index: number) {
  const duration = 5 + (index % 3) * 1.5;
  const delay = index * 0.6;
  return {
    animation: `floatBubble ${duration}s ease-in-out ${delay}s infinite`,
  };
}

/* ------------------------------------------------------------------ */
/* コンテンツバブル（小さい浮遊バブル）                                  */
/* ------------------------------------------------------------------ */

function SmallBubble({
  item,
  meta,
  index,
}: {
  item: CategoryContentItem;
  meta: AreaMeta;
  index: number;
}) {
  const floatStyle = useFloatStyle(index);
  const isExternal = /^https?:\/\//.test(item.href);
  const commonClass =
    "block max-w-[90%] rounded-full border px-3 py-1.5 text-[11px] font-semibold leading-snug shadow-md " +
    "transition-transform hover:scale-105 hover:shadow-lg cursor-pointer text-center line-clamp-1 " +
    "backdrop-blur-sm";
  const commonStyle = {
    background: meta.bubbleBg,
    borderColor: `${meta.textColor}30`,
    color: meta.textColor,
    boxShadow: `0 3px 12px ${meta.glowColor}`,
    ...floatStyle,
  };

  if (isExternal) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" className={commonClass} style={commonStyle}>
        {item.title}
      </a>
    );
  }
  return (
    <Link href={item.href} className={commonClass} style={commonStyle}>
      {item.title}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* 楕円ブロブ（エリア本体）                                              */
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
      .then((d) => { if (!cancelled && Array.isArray(d.items)) setItems(d.items.slice(0, 4)); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [categorySlug, sub.slug, isCommunity]);

  // 楕円の浮遊アニメーション（ブロブ自体も少し動く）
  const blobFloatDuration = 7 + blobIndex * 1.3;
  const blobFloatDelay = blobIndex * 0.9;

  return (
    <div
      className="relative flex flex-col items-center justify-center overflow-hidden"
      style={{
        borderRadius: "50%",
        aspectRatio: "5 / 4",
        background: `radial-gradient(ellipse at 35% 35%, ${meta.blobColor}ff 0%, ${meta.blobColor}cc 60%, ${meta.blobColor}88 100%)`,
        boxShadow: `0 6px 30px ${meta.glowColor}, inset 0 1px 1px rgba(255,255,255,0.7)`,
        animation: `floatBlob ${blobFloatDuration}s ease-in-out ${blobFloatDelay}s infinite`,
      }}
    >
      {/* ハイライト */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(ellipse at 30% 25%, rgba(255,255,255,0.55) 0%, transparent 60%)",
        }}
      />

      {/* コンテンツ */}
      <div className="relative flex w-full flex-col items-center gap-2 px-[12%] py-[10%]">
        {/* エリアラベル */}
        <div className="flex items-center gap-1.5 mb-1">
          <Icon className="h-4 w-4 shrink-0" style={{ color: meta.textColor }} />
          <span className="text-sm font-bold" style={{ color: meta.textColor }}>
            {meta.label}
          </span>
        </div>

        {/* コンテンツバブルまたはコミュニティCTA */}
        {isCommunity ? (
          <Link
            href={roomHref}
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold shadow-md transition-transform hover:scale-105 hover:shadow-lg"
            style={{
              background: meta.bubbleBg,
              color: meta.textColor,
              border: `1.5px solid ${meta.textColor}40`,
              boxShadow: `0 4px 16px ${meta.glowColor}`,
            }}
          >
            掲示板に参加する
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : loading ? (
          <span className="text-[10px] opacity-50" style={{ color: meta.textColor }}>
            読み込み中…
          </span>
        ) : items.length === 0 ? (
          <Link
            href={roomHref}
            className="text-[10px] font-medium opacity-60 hover:opacity-90 transition-opacity"
            style={{ color: meta.textColor }}
          >
            ルームを見る →
          </Link>
        ) : (
          <>
            {items.map((item, i) => (
              <SmallBubble key={item.id} item={item} meta={meta} index={i + blobIndex * 4} />
            ))}
            <Link
              href={roomHref}
              className="mt-1 flex items-center gap-0.5 text-[10px] font-medium opacity-50 hover:opacity-80 transition-opacity"
              style={{ color: meta.textColor }}
            >
              もっと見る
              <ArrowRight className="h-2.5 w-2.5" />
            </Link>
          </>
        )}
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
      {/* CSS アニメーション定義 */}
      <style>{`
        @keyframes floatBubble {
          0%, 100% { transform: translateY(0px); }
          33%       { transform: translateY(-4px) translateX(1.5px); }
          66%       { transform: translateY(2px)  translateX(-1px); }
        }
        @keyframes floatBlob {
          0%, 100% { transform: translateY(0px) scale(1); }
          40%       { transform: translateY(-6px) scale(1.012); }
          70%       { transform: translateY(3px)  scale(0.99); }
        }
      `}</style>

      <div
        className="grid gap-5 p-6"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
      >
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
