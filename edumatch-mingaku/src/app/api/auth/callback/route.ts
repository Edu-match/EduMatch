import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/server-admin";
import { prisma } from "@/lib/prisma";
import { getSiteOrigin } from "@/lib/site-url";
import { FEATURES } from "@/lib/features";
import { syncExtensionTablesForRegistrationKind } from "@/lib/registration-profile";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const redirectTo = searchParams.get("redirect_to") || "/";
    const userTypeParam = searchParams.get("userType") || "viewer";

    if (!code) {
      const origin = getSiteOrigin(new URL(request.url).origin);
      return NextResponse.redirect(new URL("/login?error=oauth_error", origin));
    }

    const supabase = await createClient();

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      const origin = getSiteOrigin(new URL(request.url).origin);
      return NextResponse.redirect(new URL("/login?error=oauth_error", origin));
    }

    const origin = getSiteOrigin(new URL(request.url).origin);
    const userId = data.user.id;

    const providerSignupAllowed =
      userTypeParam === "provider" && FEATURES.PROVIDER_REGISTRATION;
    const registrationKind = providerSignupAllowed
      ? ("service_business" as const)
      : ("general" as const);
    const manualKind = registrationKind === "service_business" ? "corporate" : "general";
    const role: Role = providerSignupAllowed ? Role.PROVIDER : Role.VIEWER;
    const authRoleStr = role === Role.PROVIDER ? "PROVIDER" : "VIEWER";

    const userMetadata = data.user.user_metadata || {};
    const name =
      userMetadata.name ||
      userMetadata.full_name ||
      data.user.email?.split("@")[0] ||
      "ユーザー";

    let profileRow = null;
    try {
      profileRow = await prisma.profile.findUnique({
        where: { id: userId },
        include: { generalProfile: true, corporateProfile: true },
      });
    } catch (dbError) {
      console.error("Profile lookup error:", dbError);
    }

    if (!profileRow) {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.profile.create({
            data: {
              id: userId,
              name,
              email: data.user.email || "",
              role,
              subscription_status: "INACTIVE",
              avatar_url: userMetadata.avatar_url || userMetadata.picture || null,
              manual_profile_kind: manualKind,
              onboarding_completed_at: null,
            },
          });
          await syncExtensionTablesForRegistrationKind(tx, userId, registrationKind);
        });
      } catch (profileError) {
        console.error("Profile creation error:", profileError);
        return NextResponse.redirect(
          new URL("/auth/login?error=profile_creation_failed", origin)
        );
      }

      try {
        const admin = createServiceRoleClient();
        await admin.auth.admin.updateUserById(userId, {
          user_metadata: {
            ...userMetadata,
            role: authRoleStr,
            registration_kind: registrationKind,
          },
        });
      } catch (metaErr) {
        console.error("OAuth user_metadata update:", metaErr);
      }

      const registerUrl = new URL("/profile/register", origin);
      registerUrl.searchParams.set("first", "1");
      if (redirectTo && redirectTo !== "/") {
        registerUrl.searchParams.set("next", redirectTo);
      }
      return NextResponse.redirect(registerUrl);
    }

    // 既存プロフィール: 初回オンボーディング未完了なら登録フローへ（空の拡張行だけの場合も含む）
    if (!profileRow.onboarding_completed_at) {
      const registerUrl = new URL("/profile/register", origin);
      registerUrl.searchParams.set("first", "1");
      if (redirectTo && redirectTo !== "/") {
        registerUrl.searchParams.set("next", redirectTo);
      }
      return NextResponse.redirect(registerUrl);
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
