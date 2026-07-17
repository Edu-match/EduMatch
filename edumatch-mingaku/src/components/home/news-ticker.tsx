"use client";

import Link from "next/link";

export type TickerItem = {
  id: string;
  title: string;
  href: string;
};

/** ヘッドラインの無限ループティッカー。ホバーで一時停止（CSSアニメーション）。 */
export function NewsTicker({ items }: { items: TickerItem[] }) {
  if (items.length === 0) return null;
  // 途切れなくループさせるため2周分並べ、-50%移動でシームレスに繋ぐ
  const loop = [...items, ...items];
  const duration = Math.max(30, items.length * 7);

  return (
    <div className="ticker-wrap sticky top-[6.75rem] z-20 overflow-hidden border-b border-violet-200/40 bg-violet-100/60 backdrop-blur-md">
      <div className="container flex items-center gap-3 py-2">
        <span className="live-dot flex shrink-0 items-center gap-1.5 text-xs font-bold tracking-wide text-foreground">
          {" "}HEADLINES
        </span>
        <div className="relative min-w-0 flex-1 overflow-hidden">
          <div
            className="ticker-track items-center gap-10"
            style={{ "--ticker-duration": `${duration}s` } as React.CSSProperties}
          >
            {loop.map((item, i) => (
              <Link
                key={`${item.id}-${i}`}
                href={item.href}
                className="shrink-0 whitespace-nowrap text-xs text-muted-foreground transition-colors hover:text-primary"
                tabIndex={i >= items.length ? -1 : undefined}
                aria-hidden={i >= items.length || undefined}
              >
                {item.title}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
