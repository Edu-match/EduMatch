"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export type TickerItem = {
  id: string;
  title: string;
  href: string;
};

/** ヘッドラインの無限ループティッカー。ホバー/フォーカス/タッチで一時停止（CSSアニメーション）。 */
export function NewsTicker({ items }: { items: TickerItem[] }) {
  const t = useTranslations("home");
  if (items.length === 0) return null;
  // 途切れなくループさせるため2周分並べ、-50%移動でシームレスに繋ぐ
  const loop = [...items, ...items];
  const duration = Math.max(30, items.length * 7);

  return (
    <div className="ticker-wrap sticky top-[calc(var(--header-h)+var(--sectionnav-h))] z-20 overflow-hidden border-b border-border/40 bg-secondary/95 backdrop-blur-md">
      <div className="container flex items-center gap-3">
        <span className="live-dot flex shrink-0 items-center gap-1.5 text-xs font-bold tracking-wide text-foreground">
          {" "}{t("headlines")}
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
                className="shrink-0 whitespace-nowrap py-3 text-xs text-muted-foreground transition-colors hover:text-primary"
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
