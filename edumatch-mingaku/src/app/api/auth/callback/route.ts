import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const redirectTo = searchParams.get("redirect_to") || "/dashboard";

    if (!code) {
      return NextResponse.redirect(
        new URL("/auth/login?error=oauth_error", request.url)
      );
    }

    const supabase = await createClient();

    // OAuthコードをセッションに交換
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      return NextResponse.redirect(
        new URL("/auth/login?error=oauth_error", request.url)
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

    // Profileが存在しない場合は作成
    if (!existingProfile) {
      const userMetadata = data.user.user_metadata || {};
      const name = userMetadata.name || userMetadata.full_name || data.user.email?.split("@")[0] || "ユーザー";

      try {
        await prisma.profile.create({
          data: {
            id: data.user.id,
            name,
            email: data.user.email || "",
            role: "VIEWER",
            subscription_status: "INACTIVE",
            avatar_url: userMetadata.avatar_url || userMetadata.picture || null,
          },
        });
      } catch (profileError) {
        console.error("Profile creation error:", profileError);
        // Profile作成に失敗しても続行
      }
    }

    // リダイレクト先に移動
    return NextResponse.redirect(new URL(redirectTo, request.url));
  } catch (error) {
    console.error("Callback error:", error);
    return NextResponse.redirect(
      new URL("/auth/login?error=callback_error", request.url)
    );
  }
}
