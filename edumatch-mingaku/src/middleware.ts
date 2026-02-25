import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// --- Basic認証（本番公開前テスト用）---
const BASIC_AUTH_ENABLED = process.env.NEXT_PUBLIC_IS_RELEASED !== "true";
const BASIC_AUTH_USER = process.env.BASIC_AUTH_USER ?? "preview";
const BASIC_AUTH_PASSWORD = process.env.BASIC_AUTH_PASSWORD ?? "preview2025";
const MAINTENANCE_BYPASS_COOKIE = "edumatch_maintenance_bypass";

const AUTH_REALM = "EduMatch";

function validateBasicAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Basic ")) return false;
  try {
    const base64 = authHeader.slice(6);
    const decoded = atob(base64);
    const [user, password] = decoded.split(":", 2);
    return user === BASIC_AUTH_USER && password === BASIC_AUTH_PASSWORD;
  } catch {
    return false;
  }
}

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
  const pathname = request.nextUrl.pathname;

  // NEXT_PUBLIC_IS_RELEASED が false のとき: 最初の画面は常にメンテナンス。管理者は「管理者」から Basic 認証で入場
  if (BASIC_AUTH_ENABLED) {
    if (pathname === "/maintenance") {
      return NextResponse.next();
    }
    if (pathname === "/admin-entry") {
      if (!validateBasicAuth(request)) {
        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="3;url=/maintenance"></head><body style="font-family:sans-serif;text-align:center;padding:2rem;"><p>Authentication cancelled.</p><p><a href="/maintenance">Return to maintenance page</a></p><p><small>Redirecting in 3 seconds...</small></p></body></html>`;
        return new NextResponse(html, {
          status: 401,
          headers: {
            "WWW-Authenticate": `Basic realm="${AUTH_REALM}", charset="UTF-8"`,
            "Content-Type": "text/html; charset=UTF-8",
          },
        });
      }
      const redirect = NextResponse.redirect(new URL("/", request.url));
      redirect.cookies.set(MAINTENANCE_BYPASS_COOKIE, "1", {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        // maxAge を指定せずセッションCookieに。ブラウザを閉じると消える
      });
      return redirect;
    }
    // 管理者入場用 Cookie が無い場合は常にメンテナンスへ（ルートやどのURLでもまずメンテナンス）
    const hasBypassCookie = request.cookies.get(MAINTENANCE_BYPASS_COOKIE)?.value === "1";
    if (!hasBypassCookie) {
      return NextResponse.redirect(new URL("/maintenance", request.url));
    }
  }

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
    "/",
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
