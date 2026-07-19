"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { 
  Menu, LogOut, User, LayoutDashboard, Settings,
  ChevronDown, UserPlus, LogIn, FileText, Bell,
  CheckCircle, Calendar, Newspaper, BookOpen, Bot, Activity, Flag, ArrowUpDown,
  MessageSquare, CircleHelp, Pencil, QrCode, Sparkles, FilePlus, Briefcase
} from "lucide-react";
import { useRequestList } from "@/components/request-list/request-list-context";
import { useTextEdit } from "@/components/text-edit/text-edit-context";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
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

/* ヘッダー通知バッジの共通スタイル
   （数値バッジは赤が慣習。紫ヘッダー上でも顕著性を保ち、ring で下地から浮かせる） */
const headerBadgeClass =
  "absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground ring-2 ring-background";

/* モバイルシート内の行内バッジ（未読数）。
   ヘッダー数値バッジ(headerBadgeClass)と同じ円形トークンに寄せ、
   絶対配置(-top/-right)と ring だけ外した派生版で形状を統一する。 */
const mobileBadgeClass =
  "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold leading-none text-destructive-foreground";

/* モバイルシートメニューの行スタイル
   （罫線の羅列でなく行ホバー＋グループ余白で区切る。グループ境界は border-t のみ） */
const mobileMenuLinkClass =
  "flex items-center gap-2 rounded-lg px-2 py-2.5 text-sm font-medium text-foreground/75 transition-colors hover:bg-accent/50 hover:text-foreground active:bg-accent/70 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset";

export function Header() {
  const t = useTranslations("header");
  const tc = useTranslations("common");
  const tsm = useTranslations("sideMenu");
  const router = useRouter();
  const pathname = usePathname();
  // ログイン後は元いたページへ戻れるよう、現在のパスを next として付与する。
  // /login 自体からの遷移でループしないよう、login 系パスは付与しない。
  const loginHref =
    pathname && pathname.startsWith("/") && !pathname.startsWith("/login")
      ? `/login?next=${encodeURIComponent(pathname)}`
      : "/login";
  const { count: requestListCount } = useRequestList();
  const { startTutorial } = useTutorial();
  const { editMode, setEditMode } = useTextEdit();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
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
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      setUserEmail(user?.email || null);

      if (user) {
        try {
          const res = await fetch("/api/auth/me", { credentials: "include" });
          const data = await res.json();
          setUserRole(data?.profile?.role || null);
          setUserName(data?.profile?.name || user?.user_metadata?.name || null);
        } catch {
          setUserRole(null);
          setUserName(user?.user_metadata?.name || null);
        } finally {
          setIsProfileLoading(false);
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
        setUserName(null);
        setUserRole(null);
        setIsProfileLoading(false);
        setNotifications({ list: [], unreadCount: 0 });
      }

      setIsLoading(false);
    };

    checkAuth();

    // 認証状態の変更を監視（INITIAL_SESSION は上の checkAuth() と重複するためスキップ）
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "INITIAL_SESSION") return;
      checkAuth();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  // 教育のひろばの段階移行フラグ：1 でナビの向き先を常設マップ版（/idobata）へ切替
  const idobataNav = process.env.NEXT_PUBLIC_IDOBATA_NAV === "1";

  // モバイルメニューは PC のサイドメニューと同じ一般項目を表示（PC版と揃える）。
  const mobileNavLinks = [
    { href: "/", label: tsm("home") },
    { href: "/services", label: tsm("services") },
    { href: "/articles", label: tsm("articles") },
    { href: idobataNav ? "/idobata" : "/forum", label: tsm("forum") },
    { href: "/videos", label: tsm("videos") },
    { href: "/events", label: tsm("events") },
    { href: "/companies", label: tsm("companies") },
    { href: "/matching", label: tsm("matching") },
    { href: "/compare", label: tsm("compare") },
    { href: "/ai-kentei", label: tsm("aiKentei") },
    { href: "/help", label: tsm("help") },
  ];

  // 管理者リンク（PCドロップダウン／モバイルシート共通の項目定義）
  const adminLinks = [
    { href: "/admin/kaikan?tab=checkin", icon: QrCode, label: t("kaikanCheckin") },
    { href: "/admin/persona", icon: Sparkles, label: t("aiPersona") },
    { href: "/admin/approvals", icon: CheckCircle, label: t("approvals") },
    { href: "/admin/events", icon: Calendar, label: t("eventsAdmin") },
    { href: "/admin/forum", icon: MessageSquare, label: t("forumAdmin") },
    { href: "/admin/site-updates", icon: Newspaper, label: t("siteUpdatesAdmin") },
    { href: "/dashboard/admin/knowledge", icon: BookOpen, label: t("knowledgeAdmin") },
    { href: "/admin/ai-chat", icon: Bot, label: t("aiChatAdmin") },
    { href: "/admin/services/display-order", icon: ArrowUpDown, label: t("serviceOrderAdmin") },
    { href: "/admin/activity-log", icon: Activity, label: t("activityLog") },
    { href: "/admin/user-reports", icon: Flag, label: t("userReports") },
  ];

  const displayName = userName || (userEmail ? userEmail.split("@")[0] : tc("user"));

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
      className="shrink-0 gap-1.5 px-2 text-foreground/70 hover:text-foreground pointer-coarse:min-h-11 pointer-coarse:min-w-11"
      onClick={handleStartTutorial}
      title={t("tutorialTitle")}
      aria-label={t("tutorialTitle")}
      data-tutorial="header-tutorial"
    >
      <CircleHelp className="h-4 w-4 shrink-0" />
      <span className="hidden xl:inline text-sm font-medium">{t("tutorial")}</span>
    </Button>
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl after:absolute after:inset-x-0 after:top-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-primary/40 after:to-transparent">
      <div className="container flex h-16 items-center gap-2 md:gap-3">
        {/* Logo（AIUEO BASE 公式ロゴ・背景透過PNG） */}
        <Link href="/" className="flex shrink-0 items-center hover:opacity-80 transition-opacity" aria-label={tc("siteName")}>
          <Image
            src="/aiueo-base-logo.png"
            alt={tc("siteName")}
            width={1096}
            height={99}
            priority
            className="h-5 w-auto sm:h-6"
          />
        </Link>

        {/* Desktop Navigation（セクション移動は SectionNav タブに集約。ここは機能系のみ） */}
        <nav className="hidden md:flex min-w-0 flex-1 items-center justify-end gap-1.5 lg:gap-2.5">
          <div className="flex min-w-0 items-center gap-1.5 lg:gap-2.5">
          <Link
            href="/request-info/list"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "relative px-2.5 text-foreground/75 hover:text-foreground"
            )}
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span className="hidden lg:inline">{t("favoritesFull")}</span>
            <span className="lg:hidden">{t("favoritesShort")}</span>
            {requestListCount > 0 && (
              <span className={headerBadgeClass}>
                {requestListCount > 99 ? "99+" : requestListCount}
              </span>
            )}
          </Link>
          </div>

          {tutorialButton}

          <LanguageSwitcher />

          {/* 通知ベル（全ログインユーザー・汎用） */}
          {isAuthenticated && (
            <DropdownMenu
              open={notifOpen}
              onOpenChange={(open) => {
                setNotifOpen(open);
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative shrink-0"
                  aria-label={
                    notifications.unreadCount > 0
                      ? t("notificationsWithUnread", {
                          count: notifications.unreadCount,
                        })
                      : t("notifications")
                  }
                >
                  <Bell className="h-5 w-5 text-foreground/70" />
                  {notifications.unreadCount > 0 && (
                    <span className={headerBadgeClass}>
                      {notifications.unreadCount > 99 ? "99+" : notifications.unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[360px] p-0 overflow-hidden">
                <div className="border-b px-4 py-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">{t("notifications")}</h3>
                    {notifications.list.length > 0 && (
                      <Link
                        href="/notifications"
                        className="text-xs text-primary hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setNotifOpen(false);
                        }}
                      >
                        {t("viewAll")}
                      </Link>
                    )}
                  </div>
                </div>
                <div className="max-h-[min(60vh,400px)] overflow-y-auto">
                  {notifications.list.length === 0 ? (
                    <div className="py-12 text-center">
                      <Bell className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">{t("noNotifications")}</p>
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
                              setNotifOpen(false);
                              const target = n.href ?? "/notifications";
                              const isExternal =
                                target.startsWith("http://") ||
                                target.startsWith("https://");
                              if (
                                n.inAppNotificationId &&
                                n.read !== true
                              ) {
                                // 既読化は fire-and-forget（失敗しても遷移は妨げない）
                                void markInAppNotificationRead(
                                  n.inAppNotificationId
                                ).catch(() => {});
                                setNotifications((prev) => ({
                                  list: prev.list.map((item) =>
                                    item.id === n.id
                                      ? { ...item, read: true }
                                      : item
                                  ),
                                  unreadCount: Math.max(0, prev.unreadCount - 1),
                                }));
                              }
                              // 外部URLは既読/未読に関わらず常に新規タブで開く
                              if (isExternal) {
                                e.preventDefault();
                                window.open(
                                  target,
                                  "_blank",
                                  "noopener,noreferrer"
                                );
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
          {(isLoading || isProfileLoading) ? (
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
                  {t("mypage")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-2 py-1">
                  {t("post")}
                </DropdownMenuLabel>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onSelect={() => router.push("/articles/create")}
                >
                  <FilePlus className="mr-2 h-4 w-4" />
                  {tsm("createArticle")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onSelect={() => router.push("/services/create")}
                >
                  <Briefcase className="mr-2 h-4 w-4" />
                  {tsm("createService")}
                </DropdownMenuItem>
                {userRole === "ADMIN" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onSelect={() => router.push("/provider-dashboard")}
                    >
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      {t("adminDashboard")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onSelect={() => setEditMode(!editMode)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      {editMode ? t("editModeOff") : t("editModeOn")}
                    </DropdownMenuItem>
                  </>
                )}
                {userRole === "ADMIN" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-2 py-1">
                      {t("adminMenu")}
                    </DropdownMenuLabel>
                    {adminLinks.map((link) => (
                      <DropdownMenuItem
                        key={link.href}
                        className="cursor-pointer"
                        onSelect={() => router.push(link.href)}
                      >
                        <link.icon className="mr-2 h-4 w-4" />
                        {link.label}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem 
                  className="cursor-pointer"
                  onSelect={() => router.push("/profile/register")}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  {t("accountSettings")}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            /* 未ログイン時: ログイン/新規登録ボタン */
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href={loginHref}>{t("login")}</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/login?tab=signup">{t("register")}</Link>
              </Button>
            </div>
          )}
          </div>
        </nav>

        {/* Mobile Navigation */}
        <div className="ml-auto flex shrink-0 items-center gap-1 md:hidden">
          {tutorialButton}
          <LanguageSwitcher />
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("openMenu")}
              data-tutorial="header-mobile-menu-trigger"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">{t("openMenu")}</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[85vw] sm:w-[350px] overflow-y-auto p-0">
            <SheetHeader className="px-4 py-4 border-b">
              <SheetTitle>{t("menu")}</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col px-4 pb-6">
              {mobileNavLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileMenuLinkClass}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/request-info/list"
                onClick={() => setMobileMenuOpen(false)}
                className={mobileMenuLinkClass}
              >
                <FileText className="h-4 w-4 flex-shrink-0" />
                {t("favoritesFull")}
                {requestListCount > 0 && (
                  <span className={mobileBadgeClass}>
                    {requestListCount}
                  </span>
                )}
              </Link>
              {/* 通知はログイン時のみ表示（デスクトップの通知ベルと挙動を揃える） */}
              {isAuthenticated && (
                <Link
                  href="/notifications"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label={
                    notifications.unreadCount > 0
                      ? t("notificationsWithUnread", {
                          count: notifications.unreadCount,
                        })
                      : t("notifications")
                  }
                  className={mobileMenuLinkClass}
                >
                  <Bell className="h-4 w-4 flex-shrink-0" />
                  {t("notifications")}
                  {notifications.unreadCount > 0 && (
                    <span className={mobileBadgeClass}>
                      {notifications.unreadCount}
                    </span>
                  )}
                </Link>
              )}

              <div className="border-t pt-4 mt-4">
                {(isLoading || isProfileLoading) ? (
                  <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg mb-3">
                    <div className="w-10 h-10 rounded-full bg-muted animate-pulse flex-shrink-0" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                      <div className="h-3 w-32 bg-muted animate-pulse rounded" />
                    </div>
                  </div>
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
                      className={mobileMenuLinkClass}
                    >
                      <User className="h-4 w-4 flex-shrink-0" />
                      {t("mypage")}
                    </Link>
                    {userRole === "ADMIN" && (
                      <Link
                        href="/provider-dashboard"
                        onClick={() => setMobileMenuOpen(false)}
                        className={mobileMenuLinkClass}
                      >
                        <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
                        {t("adminDashboard")}
                      </Link>
                    )}
                    {userRole === "ADMIN" && (
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setEditMode(!editMode);
                        }}
                        className={cn(mobileMenuLinkClass, "w-full text-left")}
                      >
                        <Pencil className="h-4 w-4 flex-shrink-0" />
                        {editMode ? t("editModeOff") : t("editModeOn")}
                      </button>
                    )}
                    {userRole === "ADMIN" && (
                      <div className="border-t pt-3 mt-2">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground pb-1">{t("adminMenu")}</p>
                        {adminLinks.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={mobileMenuLinkClass}
                          >
                            <link.icon className="h-4 w-4 flex-shrink-0" />
                            {link.label}
                          </Link>
                        ))}
                      </div>
                    )}
                    <Link
                      href="/profile/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className={mobileMenuLinkClass}
                    >
                      <Settings className="h-4 w-4 flex-shrink-0" />
                      {t("accountSettings")}
                    </Link>
                    <Button
                      variant="outline"
                      className="w-full h-11 mt-3 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/20"
                      onClick={() => { setMobileMenuOpen(false); void handleLogout(); }}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      {t("logout")}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button asChild variant="outline" className="w-full">
                      <Link href={loginHref} onClick={() => setMobileMenuOpen(false)}>
                        <LogIn className="h-4 w-4 mr-2" />
                        {t("login")}
                      </Link>
                    </Button>
                    <Button asChild className="w-full">
                      <Link href="/login?tab=signup" onClick={() => setMobileMenuOpen(false)}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        {t("register")}
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
