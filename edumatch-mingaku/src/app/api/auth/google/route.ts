import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteOrigin } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const redirectTo = searchParams.get("redirect_to") || "/";
    const userType = searchParams.get("userType") || "viewer"; // viewer or provider

    // 本番ではNEXT_PUBLIC_SITE_URLを使用（localhostへ飛ばないようにする）
    const origin = getSiteOrigin(request.nextUrl.origin);
    const callbackUrl = `${origin}/api/auth/callback?redirect_to=${encodeURIComponent(redirectTo)}&userType=${encodeURIComponent(userType)}`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (data.url) {
      return NextResponse.redirect(data.url);
    }

    return NextResponse.json(
      { error: "OAuth URLの生成に失敗しました" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Google OAuth error:", error);
    return NextResponse.json(
      { error: "Googleログインに失敗しました" },
      { status: 500 }
    );
  }
}
