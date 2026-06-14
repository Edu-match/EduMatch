"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Briefcase,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Video,
} from "lucide-react";
import type { CategoryContentItem } from "@/lib/forum-category-content";

const PLACEHOLDER = "https://placehold.co/1200x500/e0f2fe/0369a1?text=No+Image";
const SLIDE_INTERVAL_MS = 6000;

const KIND_META: Record<
  string,
  { label: string; icon: typeof FileText; accent: string; badge: string }
> = {
  article: {
    label: "関連する記事",
    icon: FileText,
    accent: "text-sky-600",
    badge: "記事",
  },
  service: {
    label: "関連するサービス",
    icon: Briefcase,
    accent: "text-emerald-600",
    badge: "サービス",
  },
  media: {
    label: "関連するメディア",
    icon: Video,
    accent: "text-rose-600",
    badge: "メディア",
  },
  "events-info": {
    label: "関連するイベント情報",
    icon: Calendar,
    accent: "text-amber-600",
    badge: "イベント",
  },
};

function isExternalHref(href: string) {
  return /^https?:\/\//.test(href);
}

function CategoryContentSlide({
  item,
  badge,
  isActive,
}: {
  item: CategoryContentItem;
  badge: string;
  isActive: boolean;
}) {
  const external = isExternalHref(item.href);
  const inner = (
    <>
      <Image
        src={item.thumbnailUrl || PLACEHOLDER}
        alt=""
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 900px"
        unoptimized
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 p-5 sm:p-7">
        <span className="w-fit rounded bg-primary/90 px-2 py-0.5 text-xs font-semibold text-primary-foreground">
          {badge}
        </span>
        <h3 className="text-lg font-bold leading-snug text-white sm:text-2xl line-clamp-2">
          {item.title}
        </h3>
        {item.description ? (
          <p className="line-clamp-2 text-sm text-white/85 sm:text-base">{item.description}</p>
        ) : null}
        {item.meta ? (
          <p className="truncate text-xs text-white/70">{item.meta}</p>
        ) : null}
        <span className="inline-flex w-fit items-center gap-1 text-xs font-medium text-white/90">
          詳細を見る
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </>
  );

  const slideClass = `absolute inset-0 block transition-opacity duration-700 ${
    isActive ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0"
  }`;

  if (external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={slideClass}
        aria-hidden={!isActive}
      >
        {inner}
      </a>
    );
  }

  return (
    <Link href={item.href} className={slideClass} aria-hidden={!isActive}>
      {inner}
    </Link>
  );
}

function CategoryContentSlider({
  items,
  badge,
}: {
  items: CategoryContentItem[];
  badge: string;
}) {
  const [index, setIndex] = useState(0);
  const len = items.length;

  const go = useCallback(
    (delta: number) => {
      if (len <= 0) return;
      setIndex((i) => (i + delta + len) % len);
    },
    [len]
  );

  useEffect(() => {
    setIndex(0);
  }, [items]);

  useEffect(() => {
    if (len <= 1) return;
    const id = setInterval(() => go(1), SLIDE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [len, go]);

  if (len === 1) {
    return (
      <section className="relative overflow-hidden rounded-xl border bg-muted">
        <div className="relative aspect-[1200/500] max-h-[300px] w-full overflow-hidden">
          <CategoryContentSlide item={items[0]} badge={badge} isActive={true} />
        </div>
      </section>
    );
  }

  return (
    <section className="group relative overflow-hidden rounded-xl border bg-muted">
      <div className="relative aspect-[1200/500] max-h-[300px] w-full overflow-hidden">
        {items.map((item, i) => (
          <CategoryContentSlide
            key={item.id}
            item={item}
            badge={badge}
            isActive={i === index}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => go(-1)}
        className="absolute left-2 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-opacity hover:bg-black/70 md:opacity-0 md:group-hover:opacity-100"
        aria-label="前のコンテンツ"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => go(1)}
        className="absolute right-2 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-opacity hover:bg-black/70 md:opacity-0 md:group-hover:opacity-100"
        aria-label="次のコンテンツ"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center gap-1.5">
        {items.map((item, i) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setIndex(i)}
            className={`h-2 w-2 rounded-full transition-colors ${
              i === index ? "scale-125 bg-white" : "bg-white/60 hover:bg-white/80"
            }`}
            aria-label={`スライド ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}

export function ForumCategoryContentPanel({
  items: initialItems,
  contentKind,
  categorySlug,
  subCategorySlug,
}: {
  items: CategoryContentItem[];
  contentKind: string;
  categorySlug?: string;
  subCategorySlug?: string;
}) {
  const meta = KIND_META[contentKind];
  const [items, setItems] = useState(initialItems);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    if (initialItems.length > 0 || !categorySlug || !subCategorySlug || !meta) return;

    let cancelled = false;
    setLoadingMore(true);
    const q = new URLSearchParams({ categorySlug, subSlug: subCategorySlug });
    fetch(`/api/forum/rooms/category-content?${q}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data.items) && data.items.length > 0) {
          setItems(data.items);
        }
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoadingMore(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initialItems.length, categorySlug, subCategorySlug, meta]);

  if (!meta) return null;
  if (items.length === 0 && !loadingMore) return null;

  const Icon = meta.icon;

  return (
    <div className="border-b bg-muted/20">
      <div className="container py-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4 flex items-center gap-2">
            <Icon className={`h-4 w-4 ${meta.accent}`} />
            <h2 className="text-sm font-bold">{meta.label}</h2>
            <span className="text-[11px] text-muted-foreground">
              このテーマに紐づくコンテンツ
            </span>
            {loadingMore && (
              <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
          </div>

          {items.length > 0 ? (
            <CategoryContentSlider items={items} badge={meta.badge} />
          ) : (
            <div className="flex min-h-[200px] items-center justify-center rounded-xl border bg-muted/50">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
