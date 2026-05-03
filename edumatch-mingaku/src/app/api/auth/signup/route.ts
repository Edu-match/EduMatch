import type { Session, User } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/server-admin";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPasswordErrors } from "@/lib/password";
import { FEATURES } from "@/lib/features";
import { syncExtensionTablesForRegistrationKind } from "@/lib/registration-profile";

export const dynamic = "force-dynamic";

function tryCreateServiceRoleClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) return null;
  try {
    return createServiceRoleClient();
  } catch {
    return null;
  }
}

function createUserErrorMessage(en: string): string {
  const lower = en.toLowerCase();
  if (
    lower.includes("already been registered") ||
    lower.includes("already registered") ||
    lower.includes("duplicate")
  ) {
    return "このメールアドレスは既に登録されています";
  }
  return authErrorMessage(en);
}

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

    if (userType === "provider" && !FEATURES.PROVIDER_REGISTRATION) {
      return NextResponse.json(
        { error: "現在、事業者向けの新規登録は受け付けていません。" },
        { status: 403 }
      );
    }

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
    const admin = tryCreateServiceRoleClient();

    const registrationKind =
      userType === "provider" ? ("service_business" as const) : ("general" as const);
    const manualKind = registrationKind === "service_business" ? "corporate" : "general";
    const role: Role =
      userType === "provider" ? Role.PROVIDER : Role.VIEWER;
    const authRoleStr = role === Role.PROVIDER ? "PROVIDER" : "VIEWER";

    const userMetadata = {
      name: provisionalName,
      role: authRoleStr,
      registration_kind: registrationKind,
    };

    let authUser: User;
    /** signUp 直後にメール確認OFFなら入る。多くの環境では null */
    let sessionFromSignUp: Session | null = null;

    if (admin) {
      // メール確認付き signUp だと session が null のままになり、確認メールも飛ぶ。
      // サービスロールで作成すれば即時確認かつ確認メールを送らない。
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: emailStr,
        password,
        email_confirm: true,
        user_metadata: userMetadata,
      });
      if (createErr) {
        return NextResponse.json(
          { error: createUserErrorMessage(createErr.message) },
          { status: 400 }
        );
      }
      if (!created.user) {
        return NextResponse.json(
          { error: "ユーザー作成に失敗しました" },
          { status: 500 }
        );
      }
      authUser = created.user;
    } else {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: emailStr,
        password,
        options: { data: userMetadata },
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
      authUser = authData.user;
      sessionFromSignUp = authData.session;
    }

    // Profile：一般は VIEWER、事業者は PROVIDER。拡張テーブルは登録種別で作成。初回オンボーディングは未完了のまま
    const userId = authUser.id;
    try {
      await prisma.$transaction(async (tx) => {
        await tx.profile.upsert({
          where: {
            id: userId,
          },
          create: {
            id: userId,
            name: provisionalName,
            email: emailStr,
            role,
            subscription_status: "INACTIVE",
            manual_profile_kind: manualKind,
            onboarding_completed_at: null,
          },
          update: {
            name: provisionalName,
            role,
            manual_profile_kind: manualKind,
          },
        });
        await syncExtensionTablesForRegistrationKind(tx, userId, registrationKind);
      });
      console.log("Profile created/updated successfully:", userId, "role:", role);
    } catch (profileError) {
      console.error("Profile creation error:", profileError);
      return NextResponse.json(
        { error: "プロフィールの作成に失敗しました。しばらく経ってから再度お試しください。" },
        { status: 500 }
      );
    }

    // ブラウザに載せるセッション: signUp 時に返らない場合はパスワードでサインインして取得する
    let session: Session | null = sessionFromSignUp;
    if (!session) {
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: emailStr,
        password,
      });
      if (signInErr || !signInData.session) {
        console.error("Signup post-create signIn error:", signInErr?.message);
        return NextResponse.json(
          {
            error:
              signInErr?.message?.toLowerCase().includes("email not confirmed") ||
              signInErr?.message?.toLowerCase().includes("not confirmed")
                ? "メールアドレスの確認が完了していません。Supabase の「Confirm email」をオフにするか、サーバーに SUPABASE_SERVICE_ROLE_KEY を設定してください。"
                : authErrorMessage(signInErr?.message || "ログインに失敗しました"),
          },
          { status: 400 }
        );
      }
      session = signInData.session;
    }

    console.log("Signup successful:", {
      userId: authUser.id,
      email: authUser.email,
      hasSession: !!session,
    });

    return NextResponse.json({
      user: authUser,
      session,
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
