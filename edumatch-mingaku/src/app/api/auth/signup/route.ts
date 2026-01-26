import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, organization } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "メールアドレス、パスワード、お名前を入力してください" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "パスワードは8文字以上で入力してください" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Supabase Authでユーザーを作成
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          organization: organization || null,
        },
      },
    });

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "ユーザー作成に失敗しました" },
        { status: 500 }
      );
    }

    // Profileテーブルにレコードを作成
    try {
      await prisma.profile.create({
        data: {
          id: authData.user.id,
          name,
          email,
          role: "VIEWER",
          subscription_status: "INACTIVE",
        },
      });
    } catch (profileError) {
      console.error("Profile creation error:", profileError);
      // Profile作成に失敗しても、Authユーザーは作成されているので続行
    }

    return NextResponse.json({
      user: authData.user,
      session: authData.session,
      message: "会員登録が完了しました。確認メールを送信しました。",
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "会員登録に失敗しました" },
      { status: 500 }
    );
  }
}
