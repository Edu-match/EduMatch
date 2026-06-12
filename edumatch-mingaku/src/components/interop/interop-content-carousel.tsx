"use client";

import { useEffect, useState } from "react";
import { ExternalLink, ImageIcon, Sparkles, X } from "lucide-react";
import type { InteropContentItem } from "@/lib/interop-content";

/** サブカテゴリ／トピックの関連コンテンツ（本体エデュマッチから検索）をサムネ付きカードで横スクロール表示 */
export function InteropContentCarousel({ subId, topicId, accent }: { subId: string; topicId?: string; accent: string }) {
  const [items, setItems] = useState<InteropContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<InteropContentItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/interop/content?subCategoryId=${subId}${topicId ? `&topicId=${topicId}` : ""}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled && Array.isArray(d.items)) setItems(d.items); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [subId, topicId]);

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
            <button
              key={it.id}
              type="button"
              onClick={() => setActive(it)}
              className="group flex w-60 shrink-0 flex-col overflow-hidden rounded-2xl border bg-white/[0.04] text-left transition hover:-translate-y-0.5"
              style={{ borderColor: it.pinned ? `${accent}66` : "rgba(255,255,255,0.1)" }}
            >
              {/* サムネ（16:9） */}
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
                  要約を見る
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 要約ポップアップ → 「記事全文を見る（外部サイトへ）」 */}
      {active && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: "rgba(4,6,18,0.72)", backdropFilter: "blur(6px)" }}
          onClick={() => setActive(null)}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/12 bg-[#0a0f28] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActive(null)}
              className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-black/40 text-white/70 transition hover:bg-black/60 hover:text-white"
              aria-label="閉じる"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#0d1130]">
              {active.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={active.thumbnailUrl} alt={active.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-white/20">
                  <ImageIcon className="h-10 w-10" />
                </div>
              )}
              <span
                className="absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white shadow"
                style={{ background: `${accent}cc` }}
              >
                {active.kindLabel}
              </span>
            </div>

            <div className="max-h-[50vh] overflow-y-auto p-4">
              <h3 className="text-base font-bold leading-snug text-white">{active.title}</h3>
              {active.meta && <p className="mt-1 text-xs text-white/45">{active.meta}</p>}
              {active.description ? (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-white/75">{active.description}</p>
              ) : (
                <p className="mt-3 text-sm text-white/45">このコンテンツの要約は準備中です。</p>
              )}
            </div>

            <div className="border-t border-white/10 p-3">
              <a
                href={active.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
                style={{ background: accent }}
              >
                <ExternalLink className="h-4 w-4" />
                {active.href.includes("edu-match.com") ? "記事全文を見る（エデュマッチへ）" : "記事全文を見る（外部サイトへ）"}
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
