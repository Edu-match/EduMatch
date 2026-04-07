"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
} from "lucide-react";

/** 一般ユーザー向けメニュー（全員閲覧用） */
const generalItems = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/services", label: "サービス一覧", icon: Search },
  { href: "/articles", label: "記事一覧", icon: Newspaper },
  { href: "/events", label: "セミナー・イベント情報", icon: Calendar },
  { href: "/companies", label: "掲載企業一覧", icon: Building2 },
  { href: "/compare", label: "サービス比較", icon: Scale },
  { href: "/ai-kentei", label: "AI検定", icon: Award },
  { href: "/help", label: "ヘルプ", icon: HelpCircle },
];

/** 投稿・管理者向けメニュー（下段: PROVIDER/ADMIN 向け投稿 + ADMIN 専用） */
const bottomItems = [
  { href: "/articles/create", label: "記事を投稿", icon: PenSquare, roles: ["PROVIDER", "ADMIN"] },
  { href: "/services/create", label: "サービスを投稿", icon: PenSquare, roles: ["PROVIDER", "ADMIN"] },
  { href: "/admin/approvals", label: "承認キュー", icon: FileText, roles: ["ADMIN"] },
  { href: "/admin/site-updates", label: "運営記事を書く", icon: PenSquare, roles: ["ADMIN"] },
  { href: "/admin/events", label: "セミナー・イベントを管理", icon: Calendar, roles: ["ADMIN"] },
  { href: "/admin/pages", label: "固定ページ・表示設定", icon: FileText, roles: ["ADMIN"] },
];

type MenuItem = (typeof generalItems)[number] | (typeof bottomItems)[number];

function MenuItemLink({
  item,
  hasBorder,
}: {
  item: MenuItem;
  hasBorder: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      prefetch={false}
      className={`flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted transition-colors ${
        hasBorder ? "border-b" : ""
      }`}
    >
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <span className="hover:text-[#1d4ed8] transition-colors">{item.label}</span>
    </Link>
  );
}

export function SideMenu() {
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
    <aside className="space-y-3">
      {/* 一般メニュー（ブロック） */}
      <div className="border rounded-lg bg-card overflow-hidden">
        <div className="p-3 border-b">
          <h2 className="text-sm font-bold">メニュー</h2>
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

      {/* 投稿・管理者メニュー（ブロック）※PROVIDER/ADMIN 向け */}
      {visibleBottomItems.length > 0 && (
        <div className="border-2 border-amber-400 rounded-lg bg-amber-50 overflow-hidden">
          <div className="px-3 py-2.5 bg-amber-400 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-amber-900 flex-shrink-0" />
            <h2 className="text-sm font-bold text-amber-900">
              {role === "ADMIN" ? "管理者メニュー" : "投稿者メニュー"}
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
