import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerSupabaseForOAuth } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/server-admin";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { syncExtensionTablesForRegistrationKind } from "@/lib/registration-profile";

export const dynamic = "force-dynamic";

/** レガシー OAuth コールバック（/api/auth/google 以外から呼ばれる場合のフォールバック） */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirect_to") || "/";
  const origin = requestUrl.origin;

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?message=" + encodeURIComponent("認証に失敗しました。もう一度お試しください。"), origin)
    );
  }

  const { supabase, applySessionCookies } = createRouteHandlerSupabaseForOAuth(request);

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(
      new URL("/login?message=" + encodeURIComponent("認証に失敗しました。もう一度お試しください。"), origin)
    );
  }

  const redirectWithSession = (target: URL) => {
    const res = NextResponse.redirect(target);
    applySessionCookies(res);
    return res;
  };

  try {
    const existingProfile = await prisma.profile.findUnique({
      where: { id: data.user.id },
      include: { generalProfile: true, corporateProfile: true },
    });

    if (!existingProfile) {
      const userMetadata = data.user.user_metadata || {};
      const name =
        userMetadata.name ||
        userMetadata.full_name ||
        data.user.email?.split("@")[0] ||
        "ユーザー";

      let role: Role = Role.VIEWER;
      if (userMetadata.role === "ADMIN") {
        role = Role.ADMIN;
      }

      await prisma.$transaction(async (tx) => {
        await tx.profile.create({
          data: {
            id: data.user.id,
            name,
            email: data.user.email || "",
            role,
            subscription_status: "INACTIVE",
            avatar_url: userMetadata.avatar_url || userMetadata.picture || null,
            manual_profile_kind: "general",
            onboarding_completed_at: role === Role.ADMIN ? new Date() : null,
          },
        });
        await syncExtensionTablesForRegistrationKind(tx, data.user.id, "general");
      });

      try {
        const admin = createServiceRoleClient();
        await admin.auth.admin.updateUserById(data.user.id, {
          user_metadata: {
            ...userMetadata,
            registration_kind: "general",
            role: role === Role.ADMIN ? "ADMIN" : "VIEWER",
          },
        });
      } catch (metaErr) {
        console.error("Legacy OAuth user_metadata update:", metaErr);
      }

      if (role === Role.ADMIN) {
        return redirectWithSession(new URL(redirectTo, origin));
      }
      const registerUrl = new URL("/profile/register", origin);
      registerUrl.searchParams.set("first", "1");
      if (redirectTo && redirectTo !== "/") {
        registerUrl.searchParams.set("next", redirectTo);
      }
      return redirectWithSession(registerUrl);
    } else if (!existingProfile.generalProfile && !existingProfile.corporateProfile) {
      const inferredKind =
        existingProfile.manual_profile_kind === "corporate" ||
        existingProfile.role === "PROVIDER" ||
        data.user.user_metadata?.registration_kind === "service_business"
          ? "service_business"
          : "general";
      try {
        await prisma.$transaction(async (tx) => {
          await syncExtensionTablesForRegistrationKind(tx, data.user.id, inferredKind);
        });
      } catch (repairErr) {
        console.error("Legacy profile extension repair error:", repairErr);
      }
    }
  } catch (profileError) {
    console.error("Profile creation error:", profileError);
  }

  return redirectWithSession(new URL(redirectTo, origin));
}
