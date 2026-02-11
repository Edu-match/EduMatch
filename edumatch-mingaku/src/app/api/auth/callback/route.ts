import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { getSiteOrigin } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const redirectTo = searchParams.get("redirect_to") || "/";
    const userType = searchParams.get("userType") || "viewer"; // viewer or provider

    if (!code) {
      const origin = getSiteOrigin(new URL(request.url).origin);
      return NextResponse.redirect(new URL("/login?error=oauth_error", origin));
    }

    const supabase = await createClient();

    // OAuthコードをセッションに交換
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      const origin = getSiteOrigin(new URL(request.url).origin);
      return NextResponse.redirect(new URL("/login?error=oauth_error", origin));
    }

    // Profileテーブルにレコードが存在するか確認
    let existingProfile = null;
    try {
      existingProfile = await prisma.profile.findUnique({
        where: { id: data.user.id },
      });
    } catch (dbError) {
      console.error("Profile lookup error:", dbError);
      // DB接続エラーでも続行（Profileなしとして扱う）
    }

    // ロールを決定
    const expectedRole = userType === "provider" ? "PROVIDER" : "VIEWER";

    // 本番ではNEXT_PUBLIC_SITE_URLを使用（localhostへ飛ばないようにする）
    const origin = getSiteOrigin(new URL(request.url).origin);

    // Profileが存在しない場合は作成し、初回は必ずプロフィール設定（住所など）へ
    if (!existingProfile) {
      const userMetadata = data.user.user_metadata || {};
      const name = userMetadata.name || userMetadata.full_name || data.user.email?.split("@")[0] || "ユーザー";

      try {
        existingProfile = await prisma.profile.create({
          data: {
            id: data.user.id,
            name,
            email: data.user.email || "",
            role: expectedRole,
            subscription_status: "INACTIVE",
            avatar_url: userMetadata.avatar_url || userMetadata.picture || null,
          },
        });
      } catch (profileError) {
        console.error("Profile creation error:", profileError);
        return NextResponse.redirect(
          new URL("/auth/login?error=profile_creation_failed", origin)
        );
      }

      // 初回登録（Google・メール問わず）は必ずプロフィール設定へ（名前・住所などを登録）
      const registerUrl = new URL("/profile/register", origin);
      registerUrl.searchParams.set("first", "1");
      if (redirectTo && redirectTo !== "/") {
        registerUrl.searchParams.set("next", redirectTo);
      }
      return NextResponse.redirect(registerUrl);
    }

    // 既存のProfileがある場合、ロールチェック
    if (existingProfile.role !== expectedRole) {
      return NextResponse.redirect(
        new URL("/auth/login?error=role_mismatch", origin)
      );
    }

    return NextResponse.redirect(new URL(redirectTo, origin));
  } catch (error) {
    console.error("Callback error:", error);
    const origin = getSiteOrigin(
      typeof request.url === "string" ? new URL(request.url).origin : undefined
    );
    return NextResponse.redirect(
      new URL("/auth/login?error=callback_error", origin)
    );
  }
}
