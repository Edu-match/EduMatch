import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * 認証済みユーザーのプロフィール（role等）とAIナビゲーター同意状態を返す。
 * 同意状態は Profile テーブルの ai_navigator_agreed_at から取得。
 */
export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json(
      { profile: null, ai_navigator_agreed: false },
      { status: 200 }
    );
  }
  return NextResponse.json({
    profile: {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      avatar_url: profile.avatar_url,
      role: profile.role,
    },
    ai_navigator_agreed: !!profile.ai_navigator_agreed_at,
  });
}
