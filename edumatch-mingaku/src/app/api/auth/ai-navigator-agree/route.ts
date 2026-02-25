import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { AI_NAVIGATOR_AGREED_KEY } from "@/app/api/auth/me/route";

export const dynamic = "force-dynamic";

/**
 * AIナビゲーター利用上の注意に同意したことを Supabase User の user_metadata に保存する。
 * 同意しないとチャットを利用できないようにするため。
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser();

    if (getUserError || !user) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
    }

    const updated = {
      ...(user.user_metadata || {}),
      [AI_NAVIGATOR_AGREED_KEY]: new Date().toISOString(),
    };

    const { error: updateError } = await supabase.auth.updateUser({
      data: updated,
    });

    if (updateError) {
      console.error("ai-navigator-agree updateUser error:", updateError);
      return NextResponse.json(
        { error: "同意の保存に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("ai-navigator-agree error:", e);
    return NextResponse.json(
      { error: "サーバーエラー" },
      { status: 500 }
    );
  }
}
