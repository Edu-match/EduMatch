"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Calendar,
  FileText,
  Loader2,
  MessageCircle,
  Video,
} from "lucide-react";
import type { CategoryContentItem } from "@/lib/forum-category-content";
import type { ForumCategory, ForumSubCategory } from "./forum-category-explorer";

/* ------------------------------------------------------------------ */
/* エリアのスタイル定義                                                   */
/* ------------------------------------------------------------------ */

type AreaStyle = {
  label: string;
  icon: typeof MessageCircle;
  areaBg: string;
  areaBorder: string;
  bubbleBg: string;
  labelColor: string;
  accentColor: string;
};

const AREA_STYLES: Record<string, AreaStyle> = {
  article: {
    label: "記事",
    icon: FileText,
    areaBg: "bg-rose-50/80",
    areaBorder: "border-rose-200/70",
    bubbleBg: "bg-white hover:bg-rose-50 border-rose-200/80 text-rose-900",
    labelColor: "text-rose-600",
    accentColor: "bg-rose-100 text-rose-700",
  },
  service: {
    label: "サービス",
    icon: Briefcase,
    areaBg: "bg-emerald-50/80",
    areaBorder: "border-emerald-200/70",
    bubbleBg: "bg-white hover:bg-emerald-50 border-emerald-200/80 text-emerald-900",
    labelColor: "text-emerald-600",
    accentColor: "bg-emerald-100 text-emerald-700",
  },
  media: {
    label: "動画・メディア",
    icon: Video,
    areaBg: "bg-purple-50/80",
    areaBorder: "border-purple-200/70",
    bubbleBg: "bg-white hover:bg-purple-50 border-purple-200/80 text-purple-900",
    labelColor: "text-purple-600",
    accentColor: "bg-purple-100 text-purple-700",
  },
  "events-info": {
    label: "イベント情報",
    icon: Calendar,
    areaBg: "bg-amber-50/80",
    areaBorder: "border-amber-200/70",
    bubbleBg: "bg-white hover:bg-amber-50 border-amber-200/80 text-amber-900",
    labelColor: "text-amber-600",
    accentColor: "bg-amber-100 text-amber-700",
  },
  community: {
    label: "コミュニティ",
    icon: MessageCircle,
    areaBg: "bg-sky-50/80",
    areaBorder: "border-sky-200/70",
    bubbleBg: "bg-white hover:bg-sky-50 border-sky-200/80 text-sky-900",
    labelColor: "text-sky-600",
    accentColor: "bg-sky-100 text-sky-700",
  },
};

const DEFAULT_AREA_STYLE: AreaStyle = {
  label: "その他",
  icon: MessageCircle,
  areaBg: "bg-muted/40",
  areaBorder: "border-border/60",
  bubbleBg: "bg-white hover:bg-muted border-border/80 text-foreground",
  labelColor: "text-muted-foreground",
  accentColor: "bg-muted text-muted-foreground",
};

const MAX_BUBBLES = 5;

/* ------------------------------------------------------------------ */
/* 個別コンテンツバブル                                                   */
/* ------------------------------------------------------------------ */

function ContentBubble({
  item,
  style,
}: {
  item: CategoryContentItem;
  style: AreaStyle;
}) {
  const isExternal = /^https?:\/\//.test(item.href);
  const className =
    `group flex w-full items-start gap-2 rounded-2xl border p-2.5 text-left text-xs font-medium ` +
    `shadow-sm transition-all hover:shadow-md ${style.bubbleBg}`;

  const inner = (
    <>
      {item.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.thumbnailUrl}
          alt=""
          className="h-10 w-14 shrink-0 rounded-lg object-cover"
        />
      ) : null}
      <span className="line-clamp-2 min-w-0 flex-1 leading-snug">{item.title}</span>
      <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 opacity-40 transition-transform group-hover:translate-x-0.5 group-hover:opacity-70" />
    </>
  );

  if (isExternal) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" className={className}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={item.href} className={className}>
      {inner}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* コンテンツエリア（非コミュニティ）                                     */
/* ------------------------------------------------------------------ */

function ContentArea({
  sub,
  categorySlug,
  style,
}: {
  sub: ForumSubCategory;
  categorySlug: string;
  style: AreaStyle;
}) {
  const [items, setItems] = useState<CategoryContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const q = new URLSearchParams({
      categorySlug,
      subSlug: sub.slug,
    });
    fetch(`/api/forum/rooms/category-content?${q}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && Array.isArray(d.items)) setItems(d.items);
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [categorySlug, sub.slug]);

  const Icon = style.icon;
  const roomHref = `/forum/${categorySlug}/${sub.slug}`;
  const displayed = items.slice(0, MAX_BUBBLES);
  const remaining = items.length - displayed.length;

  return (
    <div
      className={`flex flex-col gap-3 rounded-3xl border-2 p-4 ${style.areaBg} ${style.areaBorder}`}
    >
      {/* ヘッダー */}
      <div className="flex items-center gap-2">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${style.accentColor}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className={`text-sm font-bold ${style.labelColor}`}>{style.label}</span>
      </div>

      {/* コンテンツバブル */}
      <div className="flex flex-col gap-2">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/60" />
          </div>
        ) : displayed.length === 0 ? (
          <p className="py-2 text-center text-[11px] text-muted-foreground/70">
            コンテンツを準備中です
          </p>
        ) : (
          displayed.map((item) => (
            <ContentBubble key={item.id} item={item} style={style} />
          ))
        )}
      </div>

      {/* ルームへのリンク */}
      {!loading && (
        <Link
          href={roomHref}
          className="mt-auto flex items-center justify-end gap-1 text-[11px] font-semibold text-muted-foreground/70 hover:text-foreground transition-colors"
        >
          {remaining > 0 ? `他 ${remaining} 件・` : ""}
          ルームで話す
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* コミュニティエリア                                                     */
/* ------------------------------------------------------------------ */

function CommunityArea({
  sub,
  category,
  style,
}: {
  sub: ForumSubCategory;
  category: ForumCategory;
  style: AreaStyle;
}) {
  const roomHref = `/forum/${category.slug}/${sub.slug}`;

  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 rounded-3xl border-2 p-6 text-center ${style.areaBg} ${style.areaBorder}`}
    >
      <div className="flex flex-col items-center gap-2">
        <span className={`flex h-12 w-12 items-center justify-center rounded-full ${style.accentColor}`}>
          <MessageCircle className="h-6 w-6" />
        </span>
        <p className={`text-base font-bold ${style.labelColor}`}>コミュニティ掲示板</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          「{category.name}」について<br />
          みんなで自由に語り合える場所
        </p>
      </div>
      <Link
        href={roomHref}
        className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold shadow-sm transition-all hover:shadow-md ${style.accentColor} hover:opacity-90`}
      >
        掲示板に参加する
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* メイン: CategorySubAreaView                                           */
/* ------------------------------------------------------------------ */

export function CategorySubAreaView({
  category,
  subCategories,
}: {
  category: ForumCategory;
  subCategories: ForumSubCategory[];
}) {
  // community を最後に並べて他を前に
  const sorted = [
    ...subCategories.filter((s) => s.contentKind !== "community"),
    ...subCategories.filter((s) => s.contentKind === "community"),
  ];

  return (
    <div className="p-4">
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        }}
      >
        {sorted.map((sub) => {
          const style = AREA_STYLES[sub.contentKind] ?? DEFAULT_AREA_STYLE;
          if (sub.contentKind === "community") {
            return (
              <CommunityArea
                key={sub.id}
                sub={sub}
                category={category}
                style={style}
              />
            );
          }
          return (
            <ContentArea
              key={sub.id}
              sub={sub}
              categorySlug={category.slug}
              style={style}
            />
          );
        })}
      </div>
    </div>
  );
}
