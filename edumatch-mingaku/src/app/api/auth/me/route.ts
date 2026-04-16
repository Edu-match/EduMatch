import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * 認証済みユーザーのプロフィール（role等）とAIナビゲーター同意状態を返す。
 * 同意状態は Profile テーブルの ai_navigator_agreed_at から取得。
 * 事業者は DB 上 role は VIEWER のため、メニュー用に role を PROVIDER として返す（ADMIN はそのまま）。
 */
export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json(
      { profile: null, ai_navigator_agreed: false },
      { status: 200 }
    );
  }
  const hasCorporate =
    profile.role === "ADMIN"
      ? false
      : !!(await prisma.corporateProfile.findUnique({
          where: { id: profile.id },
          select: { id: true },
        }));
  const uiRole =
    profile.role === "ADMIN" ? "ADMIN" : hasCorporate ? "PROVIDER" : profile.role;

  return NextResponse.json({
    profile: {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      avatar_url: profile.avatar_url,
      role: uiRole,
      is_corporate_profile: hasCorporate,
    },
    ai_navigator_agreed: !!profile.ai_navigator_agreed_at,
  });
}
