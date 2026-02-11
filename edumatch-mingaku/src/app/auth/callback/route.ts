import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { getSiteOrigin } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  const code = searchParams.get("code");
    const redirectTo = searchParams.get("redirect_to") || "/";
  const origin = getSiteOrigin(requestUrl.origin);

  if (code) {
    const supabase = await createClient();

    // OAuthコードをセッションに交換
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Profileテーブルにレコードが存在するか確認
      try {
        const existingProfile = await prisma.profile.findUnique({
          where: { id: data.user.id },
        });

        // Profileが存在しない場合は作成し、初回は必ずプロフィール設定へ
        if (!existingProfile) {
          const userMetadata = data.user.user_metadata || {};
          const name =
            userMetadata.name ||
            userMetadata.full_name ||
            data.user.email?.split("@")[0] ||
            "ユーザー";

          // roleを判定（user_metadataから取得、デフォルトはVIEWER）
          let role: Role = Role.VIEWER;
          if (userMetadata.role === "PROVIDER") {
            role = Role.PROVIDER;
          } else if (userMetadata.role === "ADMIN") {
            role = Role.ADMIN;
          }

          await prisma.profile.create({
            data: {
              id: data.user.id,
              name: userMetadata.organization || name,
              email: data.user.email || "",
              role,
              subscription_status: "INACTIVE",
              avatar_url: userMetadata.avatar_url || userMetadata.picture || null,
            },
          });

          // 初回登録時は必ずプロフィール設定（名前・住所など）へ誘導
          const registerUrl = new URL("/profile/register", origin);
          registerUrl.searchParams.set("first", "1");
          if (redirectTo && redirectTo !== "/") {
            registerUrl.searchParams.set("next", redirectTo);
          }
          return NextResponse.redirect(registerUrl);
        }
      } catch (profileError) {
        console.error("Profile creation error:", profileError);
        // Profile作成に失敗しても続行
      }

      // リダイレクト先を決定
      return NextResponse.redirect(new URL(redirectTo, origin));
    }
  }

  // エラーの場合はログインページにリダイレクト（本番URLを使用）
  return NextResponse.redirect(
    new URL("/login?message=" + encodeURIComponent("認証に失敗しました。もう一度お試しください。"), origin)
  );
}
