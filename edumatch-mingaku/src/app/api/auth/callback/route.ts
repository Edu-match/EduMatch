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
    // 事業者 OAuth 登録は DB ロール PROVIDER。投稿機能は ADMIN のみ。
    const role: Role =
      registrationKind === "service_business" ? Role.PROVIDER : Role.VIEWER;
    const authRoleStr = role;

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

    // 既存 Profile がある場合でも、Google登録時に provider を選んでいれば
    // 企業種別（manual_profile_kind / 拡張テーブル / metadata）を反映する
    if (
      providerSignupAllowed &&
      profileRow.role !== Role.ADMIN
    ) {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.profile.update({
            where: { id: userId },
            data: {
              role: Role.PROVIDER,
              manual_profile_kind: "corporate",
            },
          });
          await syncExtensionTablesForRegistrationKind(
            tx,
            userId,
            "service_business"
          );
        });
        profileRow = await prisma.profile.findUnique({
          where: { id: userId },
          include: { generalProfile: true, corporateProfile: true },
        });
      } catch (upgradeErr) {
        console.error("Provider profile upgrade error:", upgradeErr);
      }

      try {
        const admin = createServiceRoleClient();
        await admin.auth.admin.updateUserById(userId, {
          user_metadata: {
            ...userMetadata,
            role: "PROVIDER",
            registration_kind: "service_business",
          },
        });
      } catch (metaErr) {
        console.error("OAuth provider metadata update:", metaErr);
      }
    }

    if (!profileRow) {
      return redirectWithSession(
        new URL("/auth/login?error=profile_creation_failed", origin)
      );
    }

    // 既存 Profile で拡張行が両方無い場合は補修してから進める
    if (!profileRow.generalProfile && !profileRow.corporateProfile) {
      const inferredKind =
        profileRow.manual_profile_kind === "corporate" ||
        profileRow.role === "PROVIDER" ||
        userMetadata.registration_kind === "service_business"
          ? ("service_business" as const)
          : ("general" as const);
      try {
        await prisma.$transaction(async (tx) => {
          await syncExtensionTablesForRegistrationKind(tx, userId, inferredKind);
        });
        profileRow = await prisma.profile.findUnique({
          where: { id: userId },
          include: { generalProfile: true, corporateProfile: true },
        });
      } catch (repairErr) {
        console.error("Profile extension repair error:", repairErr);
      }
    }

    const ensuredProfileRow = profileRow;
    if (!ensuredProfileRow) {
      return redirectWithSession(
        new URL("/auth/login?error=profile_creation_failed", origin)
      );
    }

    if (!ensuredProfileRow.onboarding_completed_at) {
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
