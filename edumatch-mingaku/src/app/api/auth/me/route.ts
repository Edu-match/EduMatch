import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { effectiveIsCorporateProfile } from "@/lib/manual-profile-kind";

export const dynamic = "force-dynamic";

/**
 * 認証済みユーザーのプロフィール（role等）とAIナビゲーター同意状態を返す。
 * 同意状態は Profile テーブルの ai_navigator_agreed_at から取得。
 * メニュー用: manual_profile_kind を最優先し、次に Corporate 行・PROVIDER ロール。
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { profile: null, ai_navigator_agreed: false, _debug: { step: "no_user" } },
      { status: 200 }
    );
  }

  let profile = null;
  let prismaError: string | null = null;
  try {
    profile = await prisma.profile.findUnique({ where: { id: user.id } });
  } catch (e) {
    prismaError = e instanceof Error ? e.message : String(e);
  }

  if (!profile) {
    return NextResponse.json(
      {
        profile: null,
        ai_navigator_agreed: false,
        _debug: {
          step: "no_profile",
          user_id: user.id,
          prisma_error: prismaError,
          db_url_set: !!(process.env.DATABASE_URL),
        },
      },
      { status: 200 }
    );
  }
  const hasCorpRow = !!(await prisma.corporateProfile.findUnique({
    where: { id: profile.id },
    select: { id: true },
  }));
  const treatAsCorporate = effectiveIsCorporateProfile(
    profile.role,
    profile.manual_profile_kind,
    hasCorpRow
  );
  const uiRole =
    profile.role === "ADMIN"
      ? "ADMIN"
      : treatAsCorporate
        ? "PROVIDER"
        : "VIEWER";

  return NextResponse.json({
    profile: {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      avatar_url: profile.avatar_url,
      role: uiRole,
      is_corporate_profile: treatAsCorporate,
    },
    ai_navigator_agreed: !!profile.ai_navigator_agreed_at,
  });
}
