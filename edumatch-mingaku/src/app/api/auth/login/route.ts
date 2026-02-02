import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { getPasswordErrors } from "@/lib/password";

export const dynamic = "force-dynamic";

function authErrorMessage(en: string): string {
  const map: Record<string, string> = {
    "Invalid login credentials": "メールアドレスまたはパスワードが正しくありません",
    "Email not confirmed": "メールアドレスの確認が完了していません。確認メールのリンクをクリックしてください。",
    "Invalid email or password": "メールアドレスまたはパスワードが正しくありません",
    "User not found": "このメールアドレスは登録されていません",
    "Too many requests": "リクエストが多すぎます。しばらく待ってから再度お試しください",
    "Invalid OTP": "認証コードが正しくありません",
    "otp_expired": "認証コードの有効期限が切れています",
  };
  const lower = en.toLowerCase();
  for (const [key, ja] of Object.entries(map)) {
    if (lower.includes(key.toLowerCase())) return ja;
  }
  return "エラーが発生しました。入力内容を確認してもう一度お試しください。";
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, userType } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "メールアドレスとパスワードを入力してください" },
        { status: 400 }
      );
    }

    const passwordErrors = getPasswordErrors(password);
    if (passwordErrors.length > 0) {
      return NextResponse.json(
        { error: "パスワードが間違っています。" },
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
      return NextResponse.json(
        { error: authErrorMessage(error.message) },
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

    const expectedRole = userType === "provider" ? "PROVIDER" : "VIEWER";
    if (existingProfile.role !== expectedRole) {
      return NextResponse.json(
        { error: `このアカウントは${existingProfile.role === "PROVIDER" ? "投稿者" : "閲覧者"}アカウントです。正しいアカウントタイプでログインしてください。` },
        { status: 403 }
      );
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
