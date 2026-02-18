"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HomeSliderItem } from "@/app/_actions/home";

const PLACEHOLDER = "https://placehold.co/1200x500/e0f2fe/0369a1?text=No+Image";
const INTERVAL_MS = 5000;

type Props = { items: HomeSliderItem[] };

export function HeroSlider({ items }: Props) {
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
    if (len <= 1) return;
    const id = setInterval(() => go(1), INTERVAL_MS);
    return () => clearInterval(id);
  }, [len, go]);

  if (items.length === 0) {
    return (
      <section className="rounded-xl overflow-hidden bg-muted border mb-6 min-h-[200px] flex items-center justify-center">
        <p className="text-muted-foreground">表示するコンテンツがありません</p>
      </section>
    );
  }

  if (items.length === 1) {
    const item = items[0];
    return (
      <section className="rounded-xl overflow-hidden border mb-6">
        <Link href={item.url} className="block relative w-full aspect-[1200/500] max-h-[320px] bg-muted">
          <Image
            src={item.thumbnailUrl || PLACEHOLDER}
            alt={item.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 80vw"
            priority
            unoptimized
          />
          <div className="absolute inset-0 bg-black/30 flex items-end p-6">
            <div>
              <span className="text-xs font-medium text-white/90 bg-primary/80 px-2 py-0.5 rounded">
                {item.type === "article" ? "記事" : "サービス"}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white mt-2 line-clamp-2">{item.title}</h2>
            </div>
          </div>
        </Link>
      </section>
    );
  }

  const current = items[index];

  return (
    <section className="rounded-xl overflow-hidden border mb-6 relative group">
      <div className="relative w-full aspect-[1200/500] max-h-[320px] bg-muted">
        {items.map((item, i) => (
          <Link
            key={`${item.type}-${item.id}`}
            href={item.url}
            className={`absolute inset-0 block transition-opacity duration-500 ${
              i === index ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
            }`}
            aria-hidden={i !== index}
          >
            <Image
              src={item.thumbnailUrl || PLACEHOLDER}
              alt={item.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 80vw"
              priority={i === 0}
              unoptimized
            />
            <div className="absolute inset-0 bg-black/35 flex items-end p-6">
              <div>
                <span className="text-xs font-medium text-white/90 bg-primary/80 px-2 py-0.5 rounded">
                  {item.type === "article" ? "記事" : "サービス"}
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-white mt-2 line-clamp-2">{item.title}</h2>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* 矢印 */}
      <button
        type="button"
        onClick={() => go(-1)}
        className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
        aria-label="前へ"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        type="button"
        onClick={() => go(1)}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
        aria-label="次へ"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* ドット */}
      <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center gap-1.5">
        {items.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === index ? "bg-white scale-125" : "bg-white/60 hover:bg-white/80"
            }`}
            aria-label={`スライド ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
