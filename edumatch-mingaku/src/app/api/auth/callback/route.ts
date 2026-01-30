import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const redirectTo = searchParams.get("redirect_to") || "/dashboard";
    const userType = searchParams.get("userType") || "viewer"; // viewer or provider

    if (!code) {
      return NextResponse.redirect(
        new URL("/login?error=oauth_error", request.url)
      );
    }

    const supabase = await createClient();

    // OAuthコードをセッションに交換
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      return NextResponse.redirect(
        new URL("/login?error=oauth_error", request.url)
      );
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

    const origin = new URL(request.url).origin;

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
          new URL("/auth/login?error=profile_creation_failed", request.url)
        );
      }

      // 初回登録（Google・メール問わず）は必ずプロフィール設定へ（名前・住所などを登録）
      const registerUrl = new URL("/profile/register", origin);
      registerUrl.searchParams.set("first", "1");
      if (expectedRole === "PROVIDER") {
        registerUrl.searchParams.set("next", "/company/dashboard");
      } else if (redirectTo && redirectTo !== "/dashboard") {
        registerUrl.searchParams.set("next", redirectTo);
      }
      return NextResponse.redirect(registerUrl);
    }

    // 既存のProfileがある場合、ロールチェック
    if (existingProfile.role !== expectedRole) {
      return NextResponse.redirect(
        new URL(`/auth/login?error=role_mismatch`, origin)
      );
    }

    return NextResponse.redirect(new URL(redirectTo, origin));
  } catch (error) {
    console.error("Callback error:", error);
    return NextResponse.redirect(
      new URL("/auth/login?error=callback_error", request.url)
    );
  }
}
