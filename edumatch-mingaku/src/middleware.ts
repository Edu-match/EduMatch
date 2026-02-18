import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// 認証が必要なパス（これらのパス配下は全て保護される）
const protectedPaths = [
  "/dashboard",
  "/provider-dashboard",
  "/mypage",
  "/history",
  "/favorites",
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
  "/request-info",
  "/admin", // /admin 配下はログイン必須。ADMIN 判定は各ページで DB の Profile.role を使用
];

// 認証済みユーザーがアクセスすべきでないパス
const authPaths = ["/login", "/auth/login"];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // 環境変数のチェック
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase environment variables");
    // 環境変数が設定されていない場合は認証チェックをスキップ
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
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

  // 認証が必要なパスへのアクセスをチェック（/request-info/list は未ログインでも閲覧可）
  const isRequestListPage = pathname === "/request-info/list";
  const isProtectedPath =
    !isRequestListPage &&
    protectedPaths.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    );

  if (isProtectedPath && !user) {
    // 未認証ユーザーはログインページにリダイレクト
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect_to", pathname);
    redirectUrl.searchParams.set("message", "この機能を利用するにはログインが必要です");
    return NextResponse.redirect(redirectUrl);
  }

  // /admin 配下の ADMIN 判定は各ページで DB の Profile.role にて実施（メニュー表示と統一）

  // 認証済みユーザーがログインページにアクセスした場合
  const isAuthPath = authPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (isAuthPath && user) {
    // 認証済みユーザーはトップページにリダイレクト
    return NextResponse.redirect(new URL("/", request.url));
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
