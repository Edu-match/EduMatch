"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Home,
  Search,
  Newspaper,
  Calendar,
  Building2,
  HelpCircle,
  Scale,
  PenSquare,
  FileText,
  ShieldCheck,
  Award,
  ListChecks,
  BookOpen,
  Bot,
  Activity,
  ArrowUpDown,
  MessageSquare,
  Video,
  Megaphone,
  MapPin,
} from "lucide-react";

/** 一般ユーザー向けメニュー（全員閲覧用）。labelKey は sideMenu namespace のキー */
const generalItems = [
  { href: "/", labelKey: "home", icon: Home },
  { href: "/services", labelKey: "services", icon: Search },
  { href: "/articles", labelKey: "articles", icon: Newspaper },
  { href: "/forum", labelKey: "forum", icon: MessageSquare },
  { href: "/videos", labelKey: "videos", icon: Video },
  { href: "/events", labelKey: "events", icon: Calendar },
  { href: "/companies", labelKey: "companies", icon: Building2 },
  { href: "/compare", labelKey: "compare", icon: Scale },
  { href: "/ai-kentei", labelKey: "aiKentei", icon: Award },
  { href: "/help", labelKey: "help", icon: HelpCircle },
];

/** 投稿・管理者向けメニュー（下段: ADMIN のみ） */
const bottomItems = [
  { href: "/articles/create", labelKey: "createArticle", icon: PenSquare, roles: ["ADMIN"] },
  { href: "/services/create", labelKey: "createService", icon: PenSquare, roles: ["ADMIN"] },
  { href: "/admin/approvals", labelKey: "approvals", icon: FileText, roles: ["ADMIN"] },
  { href: "/admin/site-updates", labelKey: "writeSiteUpdate", icon: PenSquare, roles: ["ADMIN"] },
  { href: "/admin/events", labelKey: "manageEvents", icon: Calendar, roles: ["ADMIN"] },
  { href: "/admin/forum", labelKey: "manageForum", icon: MessageSquare, roles: ["ADMIN"] },
  { href: "/admin/videos", labelKey: "manageVideos", icon: Video, roles: ["ADMIN"] },
  { href: "/admin/sponsors", labelKey: "manageSponsors", icon: Megaphone, roles: ["ADMIN"] },
  { href: "/admin/pages", labelKey: "managePages", icon: FileText, roles: ["ADMIN"] },
  { href: "/admin/interop", labelKey: "manageInterop", icon: MapPin, roles: ["ADMIN"] },
  { href: "/admin/ai-kentei/questions", labelKey: "manageAiKentei", icon: ListChecks, roles: ["ADMIN"] },
  { href: "/dashboard/admin/knowledge", labelKey: "knowledge", icon: BookOpen, roles: ["ADMIN"] },
  { href: "/admin/ai-chat", labelKey: "aiChat", icon: Bot, roles: ["ADMIN"] },
  { href: "/admin/services/display-order", labelKey: "serviceOrder", icon: ArrowUpDown, roles: ["ADMIN"] },
  { href: "/admin/activity-log", labelKey: "activityLog", icon: Activity, roles: ["ADMIN"] },
];

type MenuItem = (typeof generalItems)[number] | (typeof bottomItems)[number];

function MenuItemLink({
  item,
  hasBorder,
}: {
  item: MenuItem;
  hasBorder: boolean;
}) {
  const t = useTranslations("sideMenu");
  const Icon = item.icon;

  let tutorialAttr: string | undefined;
  if (item.href === "/forum") tutorialAttr = "side-menu-forum";
  else if (item.href === "/ai-kentei") tutorialAttr = "side-menu-ai-kentei";

  return (
    <Link
      href={item.href}
      prefetch={false}
      data-tutorial={tutorialAttr}
      className={`flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted transition-colors ${
        hasBorder ? "border-b" : ""
      }`}
    >
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <span className="hover:text-[#1d4ed8] transition-colors">{t(item.labelKey)}</span>
    </Link>
  );
}

export function SideMenu() {
  const t = useTranslations("sideMenu");
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setRole(data?.profile?.role ?? null);
      })
      .catch(() => setRole(null));
  }, []);

  const visibleBottomItems = bottomItems.filter(
    (item) => role && item.roles.includes(role)
  );

  return (
    <aside className="space-y-3" data-tutorial="side-menu">
      {/* 一般メニュー（ブロック） */}
      <div className="border rounded-lg bg-card overflow-hidden">
        <div className="p-3 border-b">
          <h2 className="text-sm font-bold">{t("menu")}</h2>
        </div>
        <nav>
          {generalItems.map((item, index) => (
            <MenuItemLink
              key={item.href}
              item={item}
              hasBorder={index < generalItems.length - 1}
            />
          ))}
        </nav>
      </div>

      {/* 投稿・管理者メニュー（ブロック）※ADMIN 向け */}
      {visibleBottomItems.length > 0 && (
        <div className="border-2 border-amber-400 rounded-lg bg-amber-50 overflow-hidden">
          <div className="px-3 py-2.5 bg-amber-400 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-amber-900 flex-shrink-0" />
            <h2 className="text-sm font-bold text-amber-900">
              {role === "ADMIN" ? t("adminMenu") : t("posterMenu")}
            </h2>
          </div>
          <nav>
            {visibleBottomItems.map((item, index) => (
              <MenuItemLink
                key={item.href}
                item={item}
                hasBorder={index < visibleBottomItems.length - 1}
              />
            ))}
          </nav>
        </div>
      )}
    </aside>
  );
}
