import { NextResponse } from "next/server";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Supabase user_metadata の AIナビゲーター同意キー */
export const AI_NAVIGATOR_AGREED_KEY = "ai_navigator_agreed_at";

/**
 * 認証済みユーザーのプロフィール（role等）とAIナビゲーター同意状態を返す。
 * ヘッダーのアカウントメニュー表示用（Prismaで取得するためRLSの影響を受けない）。
 * 同意状態は Supabase Auth の user_metadata から取得。
 */
export async function GET() {
  const [profile, user] = await Promise.all([
    getCurrentProfile(),
    getCurrentUser(),
  ]);
  if (!profile || !user) {
    return NextResponse.json(
      { profile: null, ai_navigator_agreed: false },
      { status: 200 }
    );
  }
  const aiNavigatorAgreed = !!(
    user.user_metadata && user.user_metadata[AI_NAVIGATOR_AGREED_KEY]
  );
  return NextResponse.json({
    profile: {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      avatar_url: profile.avatar_url,
      role: profile.role,
    },
    ai_navigator_agreed: aiNavigatorAgreed,
  });
}
