import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/server-admin";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPasswordErrors } from "@/lib/password";
import { FEATURES } from "@/lib/features";
import { syncExtensionTablesForRegistrationKind } from "@/lib/registration-profile";

export const dynamic = "force-dynamic";

function authErrorMessage(en: string): string {
  const map: Record<string, string> = {
    "Password should be at least 6 characters": "パスワードは6文字以上で入力してください",
    "Password must be at least 8 characters": "パスワードは8文字以上で入力してください",
    "weak password": "パスワードの強度が不足しています。8文字以上で英数字などを含めてください",
    "Signup requires a valid password": "有効なパスワードを設定してください",
    "Unable to validate email address: invalid format": "メールアドレスの形式が正しくありません",
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

/** アカウント列挙防止: 既存メールを示唆する Supabase エラーかどうか */
function isAlreadyRegisteredError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("already registered") ||
    lower.includes("already been registered") ||
    lower.includes("user already exists")
  );
}

const signupBodySchema = z.object({
  email: z.string().trim().min(1).max(254).email(),
  password: z.string().min(1).max(128),
  userType: z.string().max(50).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json().catch(() => null);
    const parsed = signupBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "メールアドレスとパスワードを入力してください" },
        { status: 400 }
      );
    }
    const { email, password, userType } = parsed.data;

    if (userType === "provider" && !FEATURES.PROVIDER_REGISTRATION) {
      return NextResponse.json(
        { error: "現在、事業者向けの新規登録は受け付けていません。" },
        { status: 403 }
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

    const registrationKind =
      userType === "provider" ? ("service_business" as const) : ("general" as const);
    const manualKind = registrationKind === "service_business" ? "corporate" : "general";
    // 事業者登録は DB ロール PROVIDER。投稿機能は ADMIN のみ（uiRole は VIEWER 相当）。
    const role: Role =
      registrationKind === "service_business" ? Role.PROVIDER : Role.VIEWER;
    const authRoleStr = role;

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: emailStr,
      password,
      options: {
        data: {
          name: provisionalName,
          role: authRoleStr,
          registration_kind: registrationKind,
        },
      },
    });

    if (authError) {
      // アカウント列挙防止:
      // 既存メールの場合も成功時と同じレスポンス形式（200）を返し、
      // 登録済みかどうかを外部から判別できないようにする。
      if (isAlreadyRegisteredError(authError.message)) {
        console.warn("Signup attempt for existing email (masked response)");
        return NextResponse.json({
          user: null,
          session: null,
          message: "会員登録が完了しました。",
        });
      }
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

    // Profile：ロールは VIEWER 固定。拡張テーブルは登録種別で作成。初回オンボーディングは未完了のまま
    const userId = authData.user.id;
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

    // メール確認をスキップ：サービスロールで即時確認
    // user_metadataを明示的に渡して、roleが上書きされないようにする
    try {
      const admin = createServiceRoleClient();
      const { error: confirmError } = await admin.auth.admin.updateUserById(authData.user.id, { 
        email_confirm: true,
        user_metadata: {
          ...authData.user.user_metadata,
          role: authRoleStr,
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
