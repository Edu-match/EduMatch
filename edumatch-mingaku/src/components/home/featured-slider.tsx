"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ThumbnailOrTitle } from "@/components/ui/thumbnail-or-title";

export type FeaturedItem = {
  id: string;
  href: string;
  title: string;
  category: string;
  summary: string | null;
  dateLabel: string;
  thumbnailUrl: string | null;
};

const INTERVAL_MS = 6000;

/** トップニュースの一面スライダー。自動送り（ホバー/フォーカスで停止）＋クロスフェード。 */
export function FeaturedSlider({ items }: { items: FeaturedItem[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = items.length;

  useEffect(() => {
    if (paused || count <= 1) return;
    const timer = setInterval(() => {
      setActive((a) => (a + 1) % count);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [paused, count]);

  if (count === 0) return null;
  const current = items[active];

  const go = (delta: number) => setActive((a) => (a + delta + count) % count);

  return (
    <div
      className="group/slider"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <Link href={current.href} className="group block">
        <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-muted">
          {/* 全スライドを重ねてクロスフェード */}
          {items.map((item, i) => (
            <div
              key={item.id}
              className="absolute inset-0 transition-opacity duration-700 ease-out"
              style={{ opacity: i === active ? 1 : 0 }}
              aria-hidden={i !== active}
            >
              <ThumbnailOrTitle
                src={item.thumbnailUrl}
                title={item.title}
                fill
                priority={i === 0}
                unoptimized
                className="transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              />
            </div>
          ))}

          <span className="absolute left-3 top-3 z-10 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-foreground backdrop-blur">
            {current.category}
          </span>

          {/* 前後送り（ホバー時に出現） */}
          {count > 1 && (
            <>
              <button
                type="button"
                aria-label="前のニュース"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); go(-1); }}
                className="absolute left-2.5 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white opacity-0 backdrop-blur transition-all hover:bg-black/55 group-hover/slider:opacity-100"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="次のニュース"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); go(1); }}
                className="absolute right-2.5 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white opacity-0 backdrop-blur transition-all hover:bg-black/55 group-hover/slider:opacity-100"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* インジケーター */}
          {count > 1 && (
            <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5">
              {items.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={`${i + 1}件目を表示`}
                  aria-current={i === active}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActive(i); }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === active ? "w-6 bg-white" : "w-1.5 bg-white/55 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* テキスト（key切替でフェードアップを再生） */}
        <div key={current.id} className="animate-fade-up">
          <p className="mt-4 text-xs text-muted-foreground">{current.dateLabel}</p>
          <h2 className="mt-1.5 text-xl font-bold leading-snug tracking-tight sm:text-2xl">
            <span className="link-underline">{current.title}</span>
          </h2>
          {current.summary && (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{current.summary}</p>
          )}
        </div>
      </Link>
    </div>
  );
}
