import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteOrigin } from "@/lib/site-url";

export const dynamic = "force-dynamic";

/**
 * パスワードリセット用の token_hash を検証し、セッションを確立してから
 * 新しいパスワード設定ページへリダイレクトする。
 * generateLink の action_link は PKCE 非互換のため、独自リンクでこのルートを経由する。
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const origin = getSiteOrigin(new URL(request.url).origin);
  const resetPage = new URL("/auth/password-reset-new", origin);

  if (!tokenHash) {
    return NextResponse.redirect(
      new URL("/auth/password-reset?error=invalid_link", origin)
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "recovery",
  });

  if (error) {
    console.error("Password reset verifyOtp error:", error.message);
    return NextResponse.redirect(
      new URL("/auth/password-reset?error=expired", origin)
    );
  }

  return NextResponse.redirect(resetPage);
}
