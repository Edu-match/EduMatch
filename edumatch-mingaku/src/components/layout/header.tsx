"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { 
  Menu, LogOut, User, LayoutDashboard, Settings, 
  ChevronDown, UserPlus, LogIn, FileText, Bell,
  CheckCircle, Calendar, Newspaper, BookOpen, Bot, Activity, Flag, ArrowUpDown,
  MessageSquare, CircleHelp, Pencil
} from "lucide-react";
import { useRequestList } from "@/components/request-list/request-list-context";
import { useTextEdit } from "@/components/text-edit/text-edit-context";
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
import {
  getTutorialPage,
  getTutorialPageIdFromPathname,
} from "@/components/tutorial/tutorial-steps";
import { useTutorial } from "@/components/tutorial/use-tutorial";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { count: requestListCount } = useRequestList();
  const { startTutorial } = useTutorial();
  const { editMode, setEditMode } = useTextEdit();
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        } catch {
          setUserRole(null);
        }

        try {
          // 汎用通知を取得（承認申請だけでなく様々な種類に対応）
          const notifRes = await fetch("/api/notifications", { credentials: "include" });
          const notif = await notifRes.json().catch(() => ({ notifications: [], unreadCount: 0 }));
          setNotifications({
            list: Array.isArray(notif.notifications) ? notif.notifications : [],
            unreadCount: notif.unreadCount ?? 0,
          });
        } catch {
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
    { href: "/services", label: "サービス一覧" },
    { href: "/events", label: "セミナー・イベント情報" },
    { href: "/forum", label: "井戸端会議" },
    { href: "/companies", label: "掲載企業" },
  ];

  const displayName = userName || (userEmail ? userEmail.split("@")[0] : "ユーザー");

  const handleStartTutorial = () => {
    const pageId = getTutorialPageIdFromPathname(pathname) ?? "home";
    const targetPage = getTutorialPage(pageId);

    setMobileMenuOpen(false);
    startTutorial(pageId, { force: true });

    if (pathname !== targetPage.pathname) {
      router.push(targetPage.pathname);
    }
  };

  const tutorialButton = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="shrink-0 gap-1.5 px-2 text-foreground/70 hover:text-foreground"
      onClick={handleStartTutorial}
      title="チュートリアルを見る"
      aria-label="チュートリアルを見る"
      data-tutorial="header-tutorial"
    >
      <CircleHelp className="h-4 w-4 shrink-0" />
      <span className="hidden xl:inline text-sm font-medium">チュートリアル</span>
    </Button>
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center gap-2 md:gap-3">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center hover:opacity-80 transition-opacity">
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
        <nav
          className="hidden md:flex min-w-0 flex-1 items-center justify-end gap-1.5 lg:gap-2.5"
          data-tutorial="header-nav"
        >
          <div className="flex min-w-0 items-center gap-1.5 overflow-hidden lg:gap-2.5">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="shrink-0 whitespace-nowrap text-sm font-medium text-foreground/60 transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/request-info/list"
            className="relative flex shrink-0 items-center gap-1 whitespace-nowrap text-sm font-medium text-foreground/60 transition-colors hover:text-foreground"
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span className="hidden lg:inline">サービスのお気に入り</span>
            <span className="lg:hidden">お気に入り</span>
            {requestListCount > 0 && (
              <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold px-1">
                {requestListCount > 99 ? "99+" : requestListCount}
              </span>
            )}
          </Link>
          </div>

          {tutorialButton}

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
                <Button variant="ghost" size="icon" className="relative shrink-0" aria-label="通知">
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
          
          <div className="flex shrink-0 items-center gap-1">
          {isLoading ? (
            <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
          ) : isAuthenticated ? (
            /* ログイン時: ユーザーメニュー */
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="max-w-[140px] gap-1.5 px-2"
                  data-tutorial="header-user-menu-trigger"
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="hidden min-w-0 truncate sm:inline">{displayName}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
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
                {userRole === "ADMIN" && (
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onSelect={() => router.push("/provider-dashboard")}
                  >
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    管理者ダッシュボード
                  </DropdownMenuItem>
                )}
                {userRole === "ADMIN" && (
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onSelect={() => setEditMode(!editMode)}
                  >
                    <Pencil className="mr-2 h-4 w-4 text-orange-600" />
                    {editMode ? "テキスト編集モードを終了" : "テキスト編集モード"}
                  </DropdownMenuItem>
                )}
                {userRole === "ADMIN" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 py-1">
                      管理メニュー
                    </DropdownMenuLabel>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onSelect={() => router.push("/admin/approvals")}
                    >
                      <CheckCircle className="mr-2 h-4 w-4 text-amber-600" />
                      承認キュー
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onSelect={() => router.push("/admin/events")}
                    >
                      <Calendar className="mr-2 h-4 w-4 text-emerald-600" />
                      イベント管理
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onSelect={() => router.push("/admin/forum")}
                    >
                      <MessageSquare className="mr-2 h-4 w-4 text-blue-600" />
                      井戸端会議管理
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onSelect={() => router.push("/admin/site-updates")}
                    >
                      <Newspaper className="mr-2 h-4 w-4 text-slate-600" />
                      運営記事管理
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onSelect={() => router.push("/dashboard/admin/knowledge")}
                    >
                      <BookOpen className="mr-2 h-4 w-4 text-indigo-600" />
                      ナレッジ文書管理
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onSelect={() => router.push("/admin/ai-chat")}
                    >
                      <Bot className="mr-2 h-4 w-4 text-violet-600" />
                      AIチャット管理
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onSelect={() => router.push("/admin/services/display-order")}
                    >
                      <ArrowUpDown className="mr-2 h-4 w-4 text-cyan-600" />
                      サービス表示順管理
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onSelect={() => router.push("/admin/activity-log")}
                    >
                      <Activity className="mr-2 h-4 w-4 text-orange-600" />
                      操作ログ
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onSelect={() => router.push("/admin/user-reports")}
                    >
                      <Flag className="mr-2 h-4 w-4 text-rose-600" />
                      ユーザー報告
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem 
                  className="cursor-pointer"
                  onSelect={() => router.push("/profile/register")}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  アカウント設定
                </DropdownMenuItem>
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
          </div>
        </nav>

        {/* Mobile Navigation */}
        <div className="flex shrink-0 items-center gap-1 md:hidden">
          {tutorialButton}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              data-tutorial="header-mobile-menu-trigger"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">メニューを開く</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[85vw] sm:w-[350px] overflow-y-auto p-0">
            <SheetHeader className="px-4 py-4 border-b">
              <SheetTitle>メニュー</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col px-4 pb-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center py-3 text-sm font-medium text-foreground/60 transition-colors hover:text-foreground border-b"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/request-info/list"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 py-3 text-sm font-medium text-foreground/60 hover:text-foreground border-b"
              >
                <FileText className="h-4 w-4 flex-shrink-0" />
                サービスのお気に入り
                {requestListCount > 0 && (
                  <span className="rounded-full bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5">
                    {requestListCount}
                  </span>
                )}
              </Link>
              <Link
                href="/notifications"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 py-3 text-sm font-medium text-foreground/60 hover:text-foreground border-b"
              >
                <Bell className="h-4 w-4 flex-shrink-0" />
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
                  <div>
                    <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg mb-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
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
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 py-3 text-sm font-medium text-foreground/60 hover:text-foreground border-b"
                    >
                      <User className="h-4 w-4 flex-shrink-0" />
                      マイページ
                    </Link>
                    {userRole === "ADMIN" && (
                      <Link
                        href="/provider-dashboard"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-2 py-3 text-sm font-medium text-foreground/60 hover:text-foreground border-b"
                      >
                        <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
                        管理者ダッシュボード
                      </Link>
                    )}
                    {userRole === "ADMIN" && (
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setEditMode(!editMode);
                        }}
                        className="flex w-full items-center gap-2 py-3 text-left text-sm font-medium text-foreground/60 hover:text-foreground border-b"
                      >
                        <Pencil className="h-4 w-4 flex-shrink-0 text-orange-600" />
                        {editMode ? "テキスト編集モードを終了" : "テキスト編集モード"}
                      </button>
                    )}
                    {userRole === "ADMIN" && (
                      <div className="border-t pt-3 mt-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pb-1">管理メニュー</p>
                        <Link href="/admin/approvals" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 py-3 text-sm font-medium text-foreground/60 hover:text-foreground border-b">
                          <CheckCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />承認キュー
                        </Link>
                        <Link href="/admin/events" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 py-3 text-sm font-medium text-foreground/60 hover:text-foreground border-b">
                          <Calendar className="h-4 w-4 text-emerald-600 flex-shrink-0" />イベント管理
                        </Link>
                        <Link href="/admin/forum" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 py-3 text-sm font-medium text-foreground/60 hover:text-foreground border-b">
                          <MessageSquare className="h-4 w-4 text-blue-600 flex-shrink-0" />井戸端会議管理
                        </Link>
                        <Link href="/admin/site-updates" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 py-3 text-sm font-medium text-foreground/60 hover:text-foreground border-b">
                          <Newspaper className="h-4 w-4 text-slate-600 flex-shrink-0" />運営記事管理
                        </Link>
                        <Link href="/dashboard/admin/knowledge" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 py-3 text-sm font-medium text-foreground/60 hover:text-foreground border-b">
                          <BookOpen className="h-4 w-4 text-indigo-600 flex-shrink-0" />ナレッジ文書管理
                        </Link>
                        <Link href="/admin/ai-chat" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 py-3 text-sm font-medium text-foreground/60 hover:text-foreground border-b">
                          <Bot className="h-4 w-4 text-violet-600 flex-shrink-0" />AIチャット管理
                        </Link>
                        <Link href="/admin/services/display-order" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 py-3 text-sm font-medium text-foreground/60 hover:text-foreground border-b">
                          <ArrowUpDown className="h-4 w-4 text-cyan-600 flex-shrink-0" />サービス表示順管理
                        </Link>
                        <Link href="/admin/activity-log" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 py-3 text-sm font-medium text-foreground/60 hover:text-foreground border-b">
                          <Activity className="h-4 w-4 text-orange-600 flex-shrink-0" />操作ログ
                        </Link>
                        <Link href="/admin/user-reports" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 py-3 text-sm font-medium text-foreground/60 hover:text-foreground border-b">
                          <Flag className="h-4 w-4 text-rose-600 flex-shrink-0" />ユーザー報告
                        </Link>
                      </div>
                    )}
                    <Link
                      href="/profile/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 py-3 text-sm font-medium text-foreground/60 hover:text-foreground border-b"
                    >
                      <Settings className="h-4 w-4 flex-shrink-0" />
                      アカウント設定
                    </Link>
                    <Button
                      variant="outline"
                      className="w-full h-11 text-red-600 border-red-200 hover:bg-red-50 mt-3"
                      onClick={() => { setMobileMenuOpen(false); void handleLogout(); }}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      ログアウト
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                        <LogIn className="h-4 w-4 mr-2" />
                        ログイン
                      </Link>
                    </Button>
                    <Button asChild className="w-full">
                      <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
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
      </div>
    </header>
  );
}
