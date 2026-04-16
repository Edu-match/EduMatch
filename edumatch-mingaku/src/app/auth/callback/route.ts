import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/server-admin";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { getSiteOrigin } from "@/lib/site-url";
import { syncExtensionTablesForRegistrationKind } from "@/lib/registration-profile";

export const dynamic = "force-dynamic";

/** レガシー OAuth コールバック（/api/auth/google 以外から呼ばれる場合のフォールバック） */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirect_to") || "/";
  const origin = getSiteOrigin(requestUrl.origin);

  if (code) {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      try {
        const existingProfile = await prisma.profile.findUnique({
          where: { id: data.user.id },
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

          const registerUrl = new URL("/profile/register", origin);
          registerUrl.searchParams.set("first", "1");
          if (redirectTo && redirectTo !== "/") {
            registerUrl.searchParams.set("next", redirectTo);
          }
          return NextResponse.redirect(registerUrl);
        }
      } catch (profileError) {
        console.error("Profile creation error:", profileError);
      }

      return NextResponse.redirect(new URL(redirectTo, origin));
    }
  }

  return NextResponse.redirect(
    new URL("/login?message=" + encodeURIComponent("認証に失敗しました。もう一度お試しください。"), origin)
  );
}
