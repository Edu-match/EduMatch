"use client";

import { useEffect, useState } from "react";
import { ExternalLink, ImageIcon, Sparkles } from "lucide-react";
import type { InteropContentItem } from "@/lib/interop-content";

/** サブカテゴリの関連コンテンツ（本体エデュマッチ）をサムネ付きカードで横スクロール表示 */
export function InteropContentCarousel({ subId, accent }: { subId: string; accent: string }) {
  const [items, setItems] = useState<InteropContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/interop/content?subCategoryId=${subId}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled && Array.isArray(d.items)) setItems(d.items); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [subId]);

  // 読み込み中で何もない場合や0件のときはセクションごと非表示
  if (!loading && items.length === 0) return null;

  return (
    <section className="mt-5">
      <div className="mb-2 flex items-center gap-1.5">
        <Sparkles className="h-4 w-4" style={{ color: accent }} />
        <h2 className="text-sm font-bold text-white/80">関連コンテンツ</h2>
      </div>

      {loading ? (
        <div className="flex gap-3 overflow-hidden">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-44 w-60 shrink-0 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]" />
          ))}
        </div>
      ) : (
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:px-6">
          {items.map((it) => (
            <a
              key={it.id}
              href={it.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex w-60 shrink-0 flex-col overflow-hidden rounded-2xl border bg-white/[0.04] transition hover:-translate-y-0.5"
              style={{ borderColor: it.pinned ? `${accent}66` : "rgba(255,255,255,0.1)" }}
            >
              {/* サムネ */}
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#0d1130]">
                {it.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={it.thumbnailUrl}
                    alt={it.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-white/20">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
                <span
                  className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow"
                  style={{ background: `${accent}cc` }}
                >
                  {it.kindLabel}
                </span>
                {it.pinned && (
                  <span className="absolute right-2 top-2 rounded-full bg-amber-400/90 px-2 py-0.5 text-[10px] font-bold text-amber-950 shadow">
                    注目
                  </span>
                )}
              </div>
              {/* 本文 */}
              <div className="flex flex-1 flex-col p-3">
                <p className="line-clamp-2 text-sm font-bold leading-snug text-white/90">{it.title}</p>
                {it.meta && <p className="mt-1 truncate text-[11px] text-white/45">{it.meta}</p>}
                {it.description && (
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/55">{it.description}</p>
                )}
                <span className="mt-auto inline-flex items-center gap-1 pt-2 text-[11px] font-bold text-white/55 group-hover:text-white/80">
                  <ExternalLink className="h-3 w-3" /> エデュマッチで見る
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
