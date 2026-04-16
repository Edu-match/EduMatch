import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerSupabaseForOAuth } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/server-admin";
import { prisma } from "@/lib/prisma";
import { FEATURES } from "@/lib/features";
import { syncExtensionTablesForRegistrationKind } from "@/lib/registration-profile";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const redirectTo = searchParams.get("redirect_to") || "/";
    const userTypeParam = searchParams.get("userType") || "viewer";

    if (!code) {
      return NextResponse.redirect(new URL("/login?error=oauth_error", origin));
    }

    const { supabase, applySessionCookies } = createRouteHandlerSupabaseForOAuth(request);

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      return NextResponse.redirect(new URL("/login?error=oauth_error", origin));
    }

    const redirectWithSession = (target: URL) => {
      const res = NextResponse.redirect(target);
      applySessionCookies(res);
      return res;
    };

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
        return redirectWithSession(
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
      return redirectWithSession(registerUrl);
    }

    if (!profileRow.onboarding_completed_at) {
      const registerUrl = new URL("/profile/register", origin);
      registerUrl.searchParams.set("first", "1");
      if (redirectTo && redirectTo !== "/") {
        registerUrl.searchParams.set("next", redirectTo);
      }
      return redirectWithSession(registerUrl);
    }

    return redirectWithSession(new URL(redirectTo, origin));
  } catch (error) {
    console.error("Callback error:", error);
    return NextResponse.redirect(
      new URL("/auth/login?error=callback_error", origin)
    );
  }
}
