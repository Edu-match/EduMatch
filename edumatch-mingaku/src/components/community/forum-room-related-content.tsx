"use client";

import { useEffect, useState } from "react";
import { ExternalLink, ImageIcon, Sparkles } from "lucide-react";

type Item = {
  id: string;
  sourceType: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  href: string;
  meta: string | null;
};

const kindLabel = (t: string) => (t === "service" ? "サービス" : "記事");

/**
 * 部屋ページ上部に表示する「関連コンテンツ」（管理者が紐付けた記事・サービス）。
 * 0件のときはセクションごと非表示。
 */
export function ForumRoomRelatedContent({ roomId }: { roomId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/forum/rooms/${roomId}/related-content`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled && Array.isArray(d.items)) setItems(d.items); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [roomId]);

  if (loading || items.length === 0) return null;

  return (
    <section className="mb-4">
      <div className="mb-2 flex items-center gap-1.5">
        <Sparkles className="h-4 w-4 text-indigo-300" />
        <h2 className="text-sm font-bold text-white/80">関連コンテンツ</h2>
      </div>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:px-6">
        {items.map((it) => (
          <a
            key={it.id}
            href={it.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex w-56 shrink-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] text-left transition hover:-translate-y-0.5 hover:border-white/20"
          >
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#0d1130]">
              {it.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.thumbnailUrl} alt={it.title} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-white/20"><ImageIcon className="h-8 w-8" /></div>
              )}
              <span className="absolute left-2 top-2 rounded-full bg-indigo-500/80 px-2 py-0.5 text-[10px] font-bold text-white shadow">{kindLabel(it.sourceType)}</span>
            </div>
            <div className="flex flex-1 flex-col p-3">
              <p className="line-clamp-2 text-sm font-bold leading-snug text-white/90">{it.title}</p>
              {it.meta && <p className="mt-1 truncate text-[11px] text-white/45">{it.meta}</p>}
              <span className="mt-auto inline-flex items-center gap-1 pt-2 text-[11px] font-bold text-white/55 group-hover:text-white/80">
                <ExternalLink className="h-3 w-3" />開く
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
