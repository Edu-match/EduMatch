"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * 全ページ共通のセクションナビ（ニュースサイトのカテゴリタブ方式）。
 * 左メニューを持たない代わりに、ヘッダー直下に常時スティッキー表示して
 * どのページからでも主要コンテンツへ1クリックで移動できるようにする。
 * 教育のひろば等の没入ビューでも消さず、サイト共通のchromeとして維持する。
 */
const IDOBATA_NAV = process.env.NEXT_PUBLIC_IDOBATA_NAV === "1";

const ITEMS: { href: string; key: string; exact?: boolean }[] = [
  { href: "/", key: "home", exact: true },
  { href: "/services", key: "services" },
  { href: "/articles", key: "articles" },
  { href: IDOBATA_NAV ? "/idobata" : "/forum", key: "forum" },
  { href: "/videos", key: "videos" },
  { href: "/events", key: "events" },
  { href: "/companies", key: "companies" },
  { href: "/matching", key: "matching" },
  { href: "/compare", key: "compare" },
  { href: "/ai-kentei", key: "aiKentei" },
  { href: "/help", key: "help" },
];

export function SectionNav() {
  const pathname = usePathname();
  const t = useTranslations("sideMenu");

  return (
    <>
      {/* 固定ヘッダー(h-16)分のスペーサー */}
      <div className="h-16 shrink-0" aria-hidden />
      <nav
        data-tutorial="header-nav"
        aria-label="セクション"
        className="sticky top-16 z-30 h-11 border-b border-border/60 bg-white/85 backdrop-blur-xl"
      >
        <div className="container h-full">
          <ul
            className="flex h-full items-center gap-0.5 overflow-x-auto [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: "none" }}
          >
            {ITEMS.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <li key={item.href} className="shrink-0">
                  <Link
                    href={item.href}
                    prefetch={false}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex h-11 items-center whitespace-nowrap px-3 text-[13px] font-medium transition-colors",
                      active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t(item.key)}
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-x-3 bottom-0 h-[2.5px] origin-center rounded-full bg-primary transition-all duration-300",
                        active ? "scale-x-100 opacity-100" : "scale-x-50 opacity-0"
                      )}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </>
  );
}
