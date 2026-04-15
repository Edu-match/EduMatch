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

    const emailStr = String(email).trim();
    const localPart = emailStr.split("@")[0]?.trim() || "";
    const provisionalName =
      (localPart.length > 0 ? localPart : "ユーザー").slice(0, 100);

    const supabase = await createClient();

    const registrationKind = userType === "provider" ? "service_business" : "general";

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: emailStr,
      password,
      options: {
        data: {
          name: provisionalName,
          role: "VIEWER",
          registration_kind: registrationKind,
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

    // Profile は共通1行のみ（一般／事業者の別は GeneralUser / ServiceBusiness）。role は常に VIEWER
    const role = "VIEWER" as const;
    try {
      await prisma.profile.upsert({
        where: {
          id: authData.user.id,
        },
        create: {
          id: authData.user.id,
          name: provisionalName,
          email: emailStr,
          role,
          subscription_status: "INACTIVE",
        },
        update: {
          name: provisionalName,
          role,
        },
      });
      console.log("Profile created/updated successfully:", authData.user.id, "role:", role);
    } catch (profileError) {
      console.error("Profile creation error:", profileError);
      return NextResponse.json(
        { error: "プロフィールの作成に失敗しました。しばらく経ってから再度お試しください。" },
        { status: 500 }
      );
    }

    // メール確認をスキップ：サービスロールで即時確認
    // user_metadataを明示的に渡して、roleが上書きされないようにする
    try {
      const admin = createServiceRoleClient();
      const { error: confirmError } = await admin.auth.admin.updateUserById(authData.user.id, { 
        email_confirm: true,
        user_metadata: {
          ...authData.user.user_metadata,
          role,
          name: provisionalName,
          registration_kind: registrationKind,
        },
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
