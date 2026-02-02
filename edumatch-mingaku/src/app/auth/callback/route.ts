import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirect_to") || "/dashboard";

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
          if (role === Role.PROVIDER) {
            registerUrl.searchParams.set("next", "/company/dashboard");
          } else if (redirectTo && redirectTo !== "/dashboard") {
            registerUrl.searchParams.set("next", redirectTo);
          }
          return NextResponse.redirect(registerUrl);
        }
      } catch (profileError) {
        console.error("Profile creation error:", profileError);
        // Profile作成に失敗しても続行
      }

      // リダイレクト先を決定
      const userMetadata = data.user.user_metadata || {};
      let finalRedirect = redirectTo;
      if (userMetadata.role === "PROVIDER" && redirectTo === "/dashboard") {
        finalRedirect = "/company/dashboard";
      }

      return NextResponse.redirect(new URL(finalRedirect, origin));
    }
  }

  // エラーの場合はログインページにリダイレクト
  return NextResponse.redirect(
    new URL("/login?message=認証に失敗しました。もう一度お試しください。", origin)
  );
}
