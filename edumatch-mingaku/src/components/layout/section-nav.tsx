"use client";

import { useEffect, useRef } from "react";
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

/** セグメント境界での前方一致（/help が /help-center で誤点灯しないように） */
function matchesPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export function SectionNav() {
  const pathname = usePathname();
  const t = useTranslations("sideMenu");
  const listRef = useRef<HTMLUListElement>(null);

  // モバイルでアクティブタブが横スクロールの画面外に隠れないよう、可視位置までスクロール
  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [pathname]);

  return (
    <>
      {/* 固定ヘッダー(--header-h)分のスペーサー */}
      <div className="h-[var(--header-h)] shrink-0" aria-hidden />
      <nav
        data-tutorial="header-nav"
        aria-label={t("menu")}
        className="sticky top-[var(--header-h)] z-30 h-[var(--sectionnav-h)] border-b border-border/60 bg-background/80 backdrop-blur-xl"
      >
        {/* 全タブが収まる幅(約1140px)までは端をフェードさせ「続きがある」ことを示す
            （md〜lg のタブレット幅でもオーバーフローするためフェードを維持する） */}
        <div className="container h-full [mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%-24px),transparent)] min-[1140px]:[mask-image:none]">
          <ul
            ref={listRef}
            className="flex h-full snap-x snap-proximity items-center gap-0.5 overflow-x-auto [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: "none" }}
          >
            {ITEMS.map((item) => {
              // forum タブは IDOBATA_NAV の設定に関わらず /forum・/idobata の両ルートで点灯させる
              const active = item.exact
                ? pathname === item.href
                : item.key === "forum"
                  ? matchesPath(pathname, "/forum") || matchesPath(pathname, "/idobata")
                  : matchesPath(pathname, item.href);
              return (
                <li key={item.href} className="shrink-0 snap-start">
                  <Link
                    href={item.href}
                    prefetch={false}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex h-11 items-center whitespace-nowrap rounded-lg px-3 text-[13px] font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset",
                      active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t(item.key)}
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-x-3 bottom-0 h-0.5 origin-center rounded-full bg-primary transition-all duration-300",
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
