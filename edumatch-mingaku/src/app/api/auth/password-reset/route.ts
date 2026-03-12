import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteOrigin } from "@/lib/site-url";

export const dynamic = "force-dynamic";

/**
 * パスワードリセット用メール送信。
 * セキュリティのため、メールの有無に関わらず常に同じレスポンスを返す（ユーザー列挙の防止）。
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim() : "";

    if (!email) {
      return NextResponse.json(
        { error: "メールアドレスを入力してください" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const origin = getSiteOrigin(request.nextUrl.origin);
    const redirectTo = `${origin}/auth/password-reset-new`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      // ログのみ。クライアントには成功と同じレスポンスを返す
      console.error("Password reset email error:", error.message);
    }

    // 常に同じ成功レスポンス（メールが登録されていてもいなくても）
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Password reset request error:", error);
    // 例外時も列挙防止のため成功と同じ形式で返す
    return NextResponse.json({ ok: true });
  }
}
