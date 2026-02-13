import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/server-admin";
import { prisma } from "@/lib/prisma";
import { getPasswordErrors } from "@/lib/password";

export const dynamic = "force-dynamic";

function authErrorMessage(en: string): string {
  const map: Record<string, string> = {
    "Password should be at least 6 characters": "パスワードは6文字以上で入力してください",
    "Password must be at least 8 characters": "パスワードは8文字以上で入力してください",
    "weak password": "パスワードの強度が不足しています。8文字以上で英数字などを含めてください",
    "Signup requires a valid password": "有効なパスワードを設定してください",
    "Unable to validate email address: invalid format": "メールアドレスの形式が正しくありません",
    "User already registered": "このメールアドレスは既に登録されています",
    "A user with this email has already been registered": "このメールアドレスは既に登録されています",
    "Email rate limit exceeded": "メール送信の上限に達しました。しばらく待ってから再度お試しください",
    "Signup disabled": "新規登録は現在受け付けておりません",
    "Forbidden": "この操作は許可されていません",
    "signup_disabled": "新規登録は現在受け付けておりません",
  };
  const lower = en.toLowerCase();
  for (const [key, ja] of Object.entries(map)) {
    if (lower.includes(key.toLowerCase())) return ja;
  }
  return "エラーが発生しました。入力内容を確認してもう一度お試しください。";
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, organization, userType } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "メールアドレス、パスワード、お名前を入力してください" },
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

    // 投稿者の場合は組織名必須
    if (userType === "provider" && !organization) {
      return NextResponse.json(
        { error: "企業名・学校名を入力してください" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          organization: organization || null,
          role: userType === "provider" ? "PROVIDER" : "VIEWER",
        },
      },
    });

    if (authError) {
      return NextResponse.json(
        { error: authErrorMessage(authError.message) },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "ユーザー作成に失敗しました" },
        { status: 500 }
      );
    }

    // メール確認をスキップ：サービスロールで即時確認（確認メールが送られてもログイン可能に）
    try {
      const admin = createServiceRoleClient();
      const { error: confirmError } = await admin.auth.admin.updateUserById(authData.user.id, { 
        email_confirm: true 
      });
      
      if (confirmError) {
        console.error("Email confirmation error:", confirmError);
      } else {
        console.log("Email confirmed for user:", authData.user.id);
      }
    } catch (confirmErr) {
      console.error("Service role client error:", confirmErr);
      // サービスロール未設定等でも登録は完了しているので続行
    }

    // Profileテーブルにレコードを作成（住所・電話はプロフィール登録ページで入力）
    const role = userType === "provider" ? "PROVIDER" : "VIEWER";
    try {
      await prisma.profile.create({
        data: {
          id: authData.user.id,
          name,
          email,
          role,
          subscription_status: "INACTIVE",
        },
      });
    } catch (profileError) {
      console.error("Profile creation error:", profileError);
      // Profile作成に失敗しても、Authユーザーは作成されているので続行
    }

    console.log("Signup successful:", {
      userId: authData.user.id,
      email: authData.user.email,
      hasSession: !!authData.session,
    });

    return NextResponse.json({
      user: authData.user,
      session: authData.session,
      message: "会員登録が完了しました。",
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "会員登録に失敗しました" },
      { status: 500 }
    );
  }
}
