import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const redirectTo = searchParams.get("redirect_to") || "/dashboard";

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${request.nextUrl.origin}/api/auth/callback?redirect_to=${encodeURIComponent(redirectTo)}`,
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
