import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { timingSafeCompare } from "@/lib/security";

// --- Basic認証（本番公開前テスト用）---
const BASIC_AUTH_ENABLED = process.env.NEXT_PUBLIC_IS_RELEASED !== "true";
/** Vercel Preview（PR・ブランチURL）は環境変数未設定でもサイトを確認できるようにメンテ強制を外す */
const SKIP_MAINTENANCE_FOR_VERCEL_PREVIEW =
  process.env.VERCEL_ENV === "preview";
// 資格情報は環境変数必須。未設定時はデフォルト値にフォールバックせず常に認証拒否する
const BASIC_AUTH_USER = process.env.BASIC_AUTH_USER;
const BASIC_AUTH_PASSWORD = process.env.BASIC_AUTH_PASSWORD;
const MAINTENANCE_BYPASS_COOKIE = "edumatch_maintenance_bypass";

const AUTH_REALM = "AIUEO BASE";

function validateBasicAuth(request: NextRequest): boolean {
  // 資格情報が未設定の場合は常に拒否
  if (!BASIC_AUTH_USER || !BASIC_AUTH_PASSWORD) return false;
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Basic ")) return false;
  try {
    const base64 = authHeader.slice(6);
    const decoded = atob(base64);
    const [user, password] = decoded.split(":", 2);
    // 定数時間比較（タイミング攻撃対策）。両方を必ず評価する
    const userOk = timingSafeCompare(user ?? "", BASIC_AUTH_USER);
    const passOk = timingSafeCompare(password ?? "", BASIC_AUTH_PASSWORD);
    return userOk && passOk;
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

function isNextSoftNavigation(request: NextRequest): boolean {
  return (
    request.headers.get("RSC") === "1" ||
    request.headers.get("Next-Router-Prefetch") === "1" ||
    request.headers.get("x-middleware-prefetch") === "1"
  );
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 掲示板の正規URL /t/... → 実体 /interop/t/...（全ホスト共通）
  if (pathname === "/t" || pathname.startsWith("/t/")) {
    const url = request.nextUrl.clone();
    url.pathname = `/interop${pathname}`;
    return NextResponse.rewrite(url);
  }

  // 特設サブドメイン（special.*）は常に総合案内所(/interop)を表示する。
  // 来場者向けの公開ページなので Basic認証/メンテナンスゲートはバイパスする。
  const host = request.headers.get("host") ?? "";
  if (host.startsWith("special.")) {
    // URL を special.edu-match.com 側に寄せる：/interop と /interop/... へ来た来場者は
    // プレフィックスを取り除いた正規URLへ 308 リダイレクト（重複ページの混乱を解消）。
    // ただし管理画面 /interop/admin は実体パスのまま表示する（rewrite で内部表示）。
    // App Router のクライアント遷移(RSC)では 308 だと 404 になりやすいため rewrite のまま通す。
    if (pathname === "/interop" || pathname.startsWith("/interop/")) {
      if (pathname === "/interop/admin" || pathname.startsWith("/interop/admin/")) {
        return NextResponse.next();
      }
      if (!isNextSoftNavigation(request)) {
        const stripped = pathname.slice("/interop".length) || "/";
        const url = request.nextUrl.clone();
        url.pathname = stripped;
        return NextResponse.redirect(url, 308);
      }
      return NextResponse.next();
    }
    if (
      pathname.startsWith("/_next") ||
      pathname.startsWith("/api") ||
      pathname.startsWith("/forum") || // ◎トピック→実ルーム。/interopへrewriteせず本物のフォーラムルームを表示
      /\.[a-zA-Z0-9]+$/.test(pathname)
    ) {
      return NextResponse.next();
    }
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? "/interop" : `/interop${pathname}`;
    return NextResponse.rewrite(url);
  }

  // 教育のひろば 常設ルート（/idobata）：実体は /interop と同一コンポーネント（並行ルート）。
  // 段階移行のため /interop はそのまま残し、こちらは内部 rewrite のみ（URLは /idobata を維持）。
  if (pathname === "/idobata" || pathname.startsWith("/idobata/")) {
    const url = request.nextUrl.clone();
    url.pathname = `/interop${pathname.slice("/idobata".length)}` || "/interop";
    return NextResponse.rewrite(url);
  }

  // NEXT_PUBLIC_IS_RELEASED が false のとき: 最初の画面は常にメンテナンス。管理者は「管理者」から Basic 認証で入場
  // （Vercel の Preview デプロイでは PR 確認のためメンテに閉じない）
  if (BASIC_AUTH_ENABLED && !SKIP_MAINTENANCE_FOR_VERCEL_PREVIEW) {
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
    // （戻り先パラメータは他ページの /login?next= 慣例に統一）
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", pathname);
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
