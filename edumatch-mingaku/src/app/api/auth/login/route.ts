import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { effectiveIsCorporateProfile } from "@/lib/manual-profile-kind";

export const dynamic = "force-dynamic";

function authErrorMessage(en: string): string {
  const map: Record<string, string> = {
    "Email not confirmed": "メールアドレスの確認が完了していません。確認メールのリンクをクリックしてください。",
    "Too many requests": "リクエストが多すぎます。しばらく待ってから再度お試しください",
    "Invalid OTP": "認証コードが正しくありません",
    "otp_expired": "認証コードの有効期限が切れています",
  };
  const lower = en.toLowerCase();
  for (const [key, ja] of Object.entries(map)) {
    if (lower.includes(key.toLowerCase())) return ja;
  }
  // 認証情報の誤り（パスワード不一致・未登録・Googleのみ登録など）は同じメッセージにし、列挙を防ぐ
  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid email or password") ||
    lower.includes("user not found")
  ) {
    return "メールアドレスまたはパスワードが正しくありません。";
  }
  return "エラーが発生しました。入力内容を確認してもう一度お試しください。";
}

/** 認証失敗時用の案内（Google登録・パスワード未設定のユーザー向け） */
export const LOGIN_CREDENTIALS_HINT =
  "Googleで登録した方は「Googleでログイン」を、パスワードをまだ設定していない方は「パスワードをお忘れですか？」でパスワードを設定してからメールでログインできます。";

export async function POST(request: NextRequest) {
  try {
    const { email, password, userType } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "メールアドレスとパスワードを入力してください" },
        { status: 400 }
      );
    }

    if (!userType || (userType !== "viewer" && userType !== "provider")) {
      return NextResponse.json(
        { error: "アカウントタイプを選択してください" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const message = authErrorMessage(error.message);
      const isCredentialsError =
        /invalid login credentials|invalid email or password|user not found/i.test(error.message);
      return NextResponse.json(
        {
          error: message,
          hint: isCredentialsError ? LOGIN_CREDENTIALS_HINT : undefined,
        },
        { status: 401 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        { error: "ログインに失敗しました" },
        { status: 500 }
      );
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

    // Profileが存在しない場合は作成
    if (!existingProfile) {
      const userMetadata = data.user.user_metadata || {};
      const name = userMetadata.name || userMetadata.full_name || data.user.email?.split("@")[0] || "ユーザー";

      try {
        existingProfile = await prisma.profile.create({
          data: {
            id: data.user.id,
            name,
            email: data.user.email || "",
            role: "VIEWER",
            subscription_status: "INACTIVE",
            avatar_url: userMetadata.avatar_url || userMetadata.picture || null,
          },
        });
      } catch (profileError) {
        console.error("Profile creation error:", profileError);
        return NextResponse.json(
          { error: "プロフィールの作成に失敗しました" },
          { status: 500 }
        );
      }
    }

    // ロールチェック（必須）
    if (!existingProfile) {
      return NextResponse.json(
        { error: "プロフィールが見つかりませんでした" },
        { status: 404 }
      );
    }

    const hasCorporateProfile = await prisma.corporateProfile.findUnique({
      where: { id: data.user.id },
      select: { id: true },
    });
    const isProviderAccount = effectiveIsCorporateProfile(
      existingProfile.role,
      existingProfile.manual_profile_kind,
      !!hasCorporateProfile
    );
    // ADMIN はどちらの入口でも許可。事業者判定は manual_profile_kind・Corporate 行・role を参照
    if (existingProfile.role !== "ADMIN") {
      if (userType === "provider" && !isProviderAccount) {
        return NextResponse.json(
          {
            error:
              "このアカウントは一般ユーザーとして登録されています。閲覧者としてログインするか、サービス事業者としてプロフィール登録を完了してください。",
          },
          { status: 403 }
        );
      }
      if (userType === "viewer" && isProviderAccount) {
        return NextResponse.json(
          {
            error:
              "このアカウントはサービス事業者として登録されています。サービス事業者としてログインしてください。",
          },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      user: data.user,
      session: data.session,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "ログインに失敗しました" },
      { status: 500 }
    );
  }
}
