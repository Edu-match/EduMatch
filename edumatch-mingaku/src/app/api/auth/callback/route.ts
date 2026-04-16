import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/server-admin";
import { prisma } from "@/lib/prisma";
import { getSiteOrigin } from "@/lib/site-url";
import { syncExtensionTablesForRegistrationKind } from "@/lib/registration-profile";

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

    const registrationKind =
      userType === "provider" ? ("service_business" as const) : ("general" as const);
    const manualKind = registrationKind === "service_business" ? "corporate" : "general";

    // 本番ではNEXT_PUBLIC_SITE_URLを使用（localhostへ飛ばないようにする）
    const origin = getSiteOrigin(new URL(request.url).origin);

    const userMetadata = data.user.user_metadata || {};
    const name = userMetadata.name || userMetadata.full_name || data.user.email?.split("@")[0] || "ユーザー";

    // Profileが存在しない場合は作成（登録種別に応じて GeneralProfile / CorporateProfile も同時作成）
    if (!existingProfile) {
      try {
        existingProfile = await prisma.$transaction(async (tx) => {
          const p = await tx.profile.create({
            data: {
              id: data.user.id,
              name,
              email: data.user.email || "",
              role: "VIEWER",
              subscription_status: "INACTIVE",
              avatar_url: userMetadata.avatar_url || userMetadata.picture || null,
              manual_profile_kind: manualKind,
            },
          });
          await syncExtensionTablesForRegistrationKind(tx, data.user.id, registrationKind);
          return p;
        });
      } catch (profileError) {
        console.error("Profile creation error:", profileError);
        return NextResponse.redirect(
          new URL("/auth/login?error=profile_creation_failed", origin)
        );
      }

      try {
        const admin = createServiceRoleClient();
        await admin.auth.admin.updateUserById(data.user.id, {
          user_metadata: {
            ...userMetadata,
            role: "VIEWER",
            registration_kind: registrationKind,
          },
        });
      } catch (metaErr) {
        console.error("OAuth user_metadata update:", metaErr);
      }

      // 初回登録は必ずプロフィール設定へ（名前・住所などを登録）
      const registerUrl = new URL("/profile/register", origin);
      registerUrl.searchParams.set("first", "1");
      if (redirectTo && redirectTo !== "/") {
        registerUrl.searchParams.set("next", redirectTo);
      }
      return NextResponse.redirect(registerUrl);
    }

    // 既存ユーザーは登録時のroleを維持する（ログイン画面で選んだ「閲覧者/投稿者」では上書きしない）
    // 新規登録時のみ expectedRole で Profile を作成している

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
