import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// 認証が必要なパス（これらのパス配下は全て保護される）
const protectedPaths = [
  "/dashboard",
  "/keep-list",
  "/notifications",
  "/profile/register",
  "/profile/edit",
  "/user",
  "/company",
  "/reviews/write",
  "/articles/new",
  "/articles/create",
  "/services/new",
  "/services/create",
  "/payment",
];

// 認証済みユーザーがアクセスすべきでないパス
const authPaths = ["/login", "/auth/login"];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // 認証が必要なパスへのアクセスをチェック
  const isProtectedPath = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (isProtectedPath && !user) {
    // 未認証ユーザーはログインページにリダイレクト
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect_to", pathname);
    redirectUrl.searchParams.set("message", "この機能を利用するにはログインが必要です");
    return NextResponse.redirect(redirectUrl);
  }

  // /admin 配下は ADMIN のみ許可（メタデータroleで判定）
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const role = (user?.user_metadata as { role?: string } | null | undefined)?.role;
    if (!user || role !== "ADMIN") {
      const redirectUrl = new URL("/dashboard", request.url);
      redirectUrl.searchParams.set("message", "管理者権限が必要です");
      return NextResponse.redirect(redirectUrl);
    }
  }

  // 認証済みユーザーがログインページにアクセスした場合
  const isAuthPath = authPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (isAuthPath && user) {
    // 認証済みユーザーはダッシュボードにリダイレクト
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (let them handle their own auth)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
