"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { 
  Menu, LogOut, User, LayoutDashboard, Settings, 
  ChevronDown, UserPlus, LogIn, FileText, Bell
} from "lucide-react";
import { useRequestList } from "@/components/request-list/request-list-context";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { markInAppNotificationRead } from "@/app/_actions/in-app-notifications";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { count: requestListCount } = useRequestList();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<{
    list: {
      id: string;
      type: string;
      category?: string;
      title: string;
      body?: string;
      href?: string;
      inAppNotificationId?: string;
      read?: boolean;
    }[];
    unreadCount: number;
  }>({ list: [], unreadCount: 0 });

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      setUserEmail(user?.email || null);
      setUserName(user?.user_metadata?.name || null);

      // ユーザーのroleを取得（API経由でPrismaから取得。Supabase RLSの影響を受けない）
      if (user) {
        try {
          const res = await fetch("/api/auth/me", { credentials: "include" });
          const data = await res.json();
          setUserRole(data?.profile?.role || null);
          if (data?.profile?.name) setUserName(data.profile.name);
          // 汎用通知を取得（承認申請だけでなく様々な種類に対応）
          const notifRes = await fetch("/api/notifications", { credentials: "include" });
          const notif = await notifRes.json().catch(() => ({ notifications: [], unreadCount: 0 }));
          setNotifications({
            list: Array.isArray(notif.notifications) ? notif.notifications : [],
            unreadCount: notif.unreadCount ?? 0,
          });
        } catch {
          setUserRole(null);
          setNotifications({ list: [], unreadCount: 0 });
        }
      } else {
        setUserRole(null);
        setNotifications({ list: [], unreadCount: 0 });
      }

      setIsLoading(false);
    };

    checkAuth();

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      checkAuth();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname]);

  const handleLogout = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const navLinks = [
    { href: "/articles", label: "記事一覧" },
    { href: "/forum", label: "井戸端会議" },
    { href: "/services", label: "サービス一覧" },
    { href: "/events", label: "セミナー・イベント情報" },
    { href: "/companies", label: "掲載企業" },
  ];

  const displayName = userName || (userEmail ? userEmail.split("@")[0] : "ユーザー");

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between gap-2 overflow-hidden">
        {/* Logo */}
        <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
          <Image
            src="/logo.png"
            alt="エデュマッチ"
            width={180}
            height={44}
            className="h-9 w-auto object-contain"
            priority
            unoptimized
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-3 lg:gap-5 flex-wrap min-w-0">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-foreground/60 transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/request-info/list"
            className="relative flex items-center gap-1.5 text-sm font-medium text-foreground/60 transition-colors hover:text-foreground"
          >
            <FileText className="h-4 w-4" />
            サービスのお気に入り
            {requestListCount > 0 && (
              <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold px-1">
                {requestListCount > 99 ? "99+" : requestListCount}
              </span>
            )}
          </Link>

          {/* 通知ベル（全ログインユーザー・汎用） */}
          {isAuthenticated && (
            <DropdownMenu
              onOpenChange={(open) => {
                if (!open) return;
                void fetch("/api/notifications", { credentials: "include" })
                  .then((r) => r.json())
                  .then((notif) => {
                    setNotifications({
                      list: Array.isArray(notif.notifications) ? notif.notifications : [],
                      unreadCount: notif.unreadCount ?? 0,
                    });
                  })
                  .catch(() => {});
              }}
            >
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label="通知">
                  <Bell className="h-5 w-5 text-foreground/70" />
                  {notifications.unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                      {notifications.unreadCount > 99 ? "99+" : notifications.unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[360px] p-0 overflow-hidden">
                <div className="border-b px-4 py-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">通知</h3>
                    {notifications.list.length > 0 && (
                      <Link
                        href="/notifications"
                        className="text-xs text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        すべて見る
                      </Link>
                    )}
                  </div>
                </div>
                <div className="max-h-[min(60vh,400px)] overflow-y-auto">
                  {notifications.list.length === 0 ? (
                    <div className="py-12 text-center">
                      <Bell className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">通知はありません</p>
                    </div>
                  ) : (
                    <ul className="divide-y">
                      {notifications.list.map((n) => (
                        <li key={n.id}>
                          <Link
                            href={n.href ?? "/notifications"}
                            className="block px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                            onClick={(e) => {
                              e.stopPropagation();
                              const target = n.href ?? "/notifications";
                              if (
                                n.inAppNotificationId &&
                                n.read !== true
                              ) {
                                e.preventDefault();
                                void (async () => {
                                  await markInAppNotificationRead(
                                    n.inAppNotificationId!
                                  );
                                  setNotifications((prev) => ({
                                    list: prev.list.map((item) =>
                                      item.id === n.id
                                        ? { ...item, read: true }
                                        : item
                                    ),
                                    unreadCount: Math.max(0, prev.unreadCount - 1),
                                  }));
                                  if (
                                    target.startsWith("http://") ||
                                    target.startsWith("https://")
                                  ) {
                                    window.open(
                                      target,
                                      "_blank",
                                      "noopener,noreferrer"
                                    );
                                  } else {
                                    router.push(target);
                                  }
                                })();
                              }
                            }}
                          >
                            {n.category && (
                              <p className="text-xs font-medium text-primary/90 mb-0.5">
                                【{n.category}】
                              </p>
                            )}
                            <p className="text-sm font-medium line-clamp-1">
                              {n.title}
                            </p>
                            {n.body && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {n.body}
                              </p>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {isLoading ? (
            <div className="w-24 h-9 bg-muted animate-pulse rounded-md" />
          ) : isAuthenticated ? (
            /* ログイン時: ユーザーメニュー */
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="max-w-[100px] truncate">{displayName}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{displayName}</p>
                    {userEmail && (
                      <p className="text-xs text-muted-foreground truncate">
                        {userEmail}
                      </p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="cursor-pointer"
                  onSelect={() => router.push("/mypage")}
                >
                  <User className="mr-2 h-4 w-4" />
                  マイページ
                </DropdownMenuItem>
                {(userRole === "PROVIDER" || userRole === "ADMIN") && (
                  <DropdownMenuItem 
                    className="cursor-pointer"
                    onSelect={() => router.push("/provider-dashboard")}
                  >
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    {userRole === "ADMIN" ? "管理者ダッシュボード" : "投稿者ダッシュボード"}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  className="cursor-pointer"
                  onSelect={() => router.push("/profile/register")}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  アカウント設定
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="cursor-pointer text-red-600 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  ログアウト
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            /* 未ログイン時: ログイン/新規登録ボタン */
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">
                  <LogIn className="h-4 w-4 mr-2" />
                  ログイン
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/login">
                  <UserPlus className="h-4 w-4 mr-2" />
                  新規登録
                </Link>
              </Button>
            </div>
          )}
        </nav>

        {/* Mobile Navigation */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">メニューを開く</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[85vw] sm:w-[350px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>メニュー</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col space-y-4 mt-6 pb-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-foreground/60 transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
<Link
                      href="/request-info/list"
                      className="flex items-center gap-2 text-sm font-medium text-foreground/60 hover:text-foreground"
                    >
                      <FileText className="h-4 w-4" />
                      サービスのお気に入り
                      {requestListCount > 0 && (
                        <span className="rounded-full bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5">
                          {requestListCount}
                        </span>
                      )}
                    </Link>
                    <Link
                      href="/notifications"
                      className="flex items-center gap-2 text-sm font-medium text-foreground/60 hover:text-foreground"
                    >
                      <Bell className="h-4 w-4" />
                      通知
                      {notifications.unreadCount > 0 && (
                        <span className="rounded-full bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5">
                          {notifications.unreadCount}
                        </span>
                      )}
                    </Link>
              
              <div className="border-t pt-4 mt-4">
                {isLoading ? (
                  <div className="text-sm text-muted-foreground">読み込み中...</div>
                ) : isAuthenticated ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{displayName}</p>
                        {userEmail && (
                          <p className="text-xs text-muted-foreground truncate">
                            {userEmail}
                          </p>
                        )}
                      </div>
                    </div>
                    <Link
                      href="/mypage"
                      className="flex items-center gap-2 text-sm font-medium text-foreground/60 hover:text-foreground"
                    >
                      <User className="h-4 w-4" />
                      マイページ
                    </Link>
                    {(userRole === "PROVIDER" || userRole === "ADMIN") && (
                      <Link
                        href="/provider-dashboard"
                        className="flex items-center gap-2 text-sm font-medium text-foreground/60 hover:text-foreground"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        投稿者ダッシュボード
                      </Link>
                    )}
                    <Link
                      href="/profile/register"
                      className="flex items-center gap-2 text-sm font-medium text-foreground/60 hover:text-foreground"
                    >
                      <Settings className="h-4 w-4" />
                      アカウント設定
                    </Link>
                    <Button 
                      variant="outline" 
                      className="w-full text-red-600 border-red-200 hover:bg-red-50" 
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      ログアウト
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/login">
                        <LogIn className="h-4 w-4 mr-2" />
                        ログイン
                      </Link>
                    </Button>
                    <Button asChild className="w-full">
                      <Link href="/login">
                        <UserPlus className="h-4 w-4 mr-2" />
                        新規登録
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
