"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Menu, LogOut, User, LayoutDashboard, Settings, 
  ChevronDown, UserPlus, LogIn, FileText
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

export function Header() {
  const router = useRouter();
  const { count: requestListCount } = useRequestList();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      } else {
        setUserRole(null);
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
  }, []); // onAuthStateChange で認証変化を監視するため、pathname 依存は不要

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
    { href: "/companies", label: "掲載企業" },
  ];

  const displayName = userName || (userEmail ? userEmail.split("@")[0] : "ユーザー");

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
          <span className="text-2xl font-bold text-primary">Edumatch</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4 lg:gap-6 flex-wrap">
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
            資料請求リスト
            {requestListCount > 0 && (
              <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold px-1">
                {requestListCount > 99 ? "99+" : requestListCount}
              </span>
            )}
          </Link>
          
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
                  onSelect={() => router.push("/dashboard")}
                >
                  <User className="mr-2 h-4 w-4" />
                  マイページ
                </DropdownMenuItem>
                {userRole === "PROVIDER" && (
                  <DropdownMenuItem 
                    className="cursor-pointer"
                    onSelect={() => router.push("/provider-dashboard")}
                  >
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    投稿者ダッシュボード
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  className="cursor-pointer"
                  onSelect={() => router.push("/profile/register")}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  プロフィール編集
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
                資料請求リスト
                {requestListCount > 0 && (
                  <span className="rounded-full bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5">
                    {requestListCount}
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
                      href="/dashboard"
                      className="flex items-center gap-2 text-sm font-medium text-foreground/60 hover:text-foreground"
                    >
                      <User className="h-4 w-4" />
                      マイページ
                    </Link>
                    {userRole === "PROVIDER" && (
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
                      プロフィール編集
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
