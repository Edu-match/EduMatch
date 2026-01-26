"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Home,
  Search,
  Newspaper,
  Building2,
  HelpCircle,
  Briefcase,
  Scale,
  Users,
  FileBadge2,
  PenSquare,
} from "lucide-react";
import { getCurrentUserRole } from "@/app/_actions/user";

const items = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/services", label: "サービスを探す", icon: Search },
  { href: "/articles", label: "記事一覧", icon: Newspaper },
  { href: "/articles/create", label: "記事を投稿", icon: PenSquare, roles: ["PROVIDER", "ADMIN"] },
  { href: "/services/create", label: "サービスを投稿", icon: PenSquare, roles: ["PROVIDER", "ADMIN"] },
  { href: "/companies", label: "掲載企業一覧", icon: Building2 },
  { href: "/compare", label: "サービス比較", icon: Scale },
  { href: "/request-info", label: "資料請求", icon: FileBadge2 },
  { href: "/help", label: "ヘルプ", icon: HelpCircle },
];

export function SideMenu() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      try {
        const r = await getCurrentUserRole();
        setRole(r);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchRole();
  }, []);

  return (
    <aside className="border rounded-lg bg-card overflow-hidden">
      <div className="p-3 border-b">
        <h2 className="text-sm font-bold">メニュー</h2>
      </div>
      <nav>
        {items.map((item, index) => {
          // ロール制限がある場合、権限がなければ表示しない
          if (item.roles && (!role || !item.roles.includes(role))) {
            return null;
          }

          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted transition-colors ${
                index !== items.length - 1 ? "border-b" : ""
              }`}
            >
              <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="hover:text-[#1d4ed8] transition-colors">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
