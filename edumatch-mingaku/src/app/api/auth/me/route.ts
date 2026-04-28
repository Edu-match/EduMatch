import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { effectiveIsCorporateProfile } from "@/lib/manual-profile-kind";
import { getAiKenteiDb } from "@/lib/ai-kentei-db";

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
  const [generalProfile, corporateRow] = await Promise.all([
    prisma.generalProfile.findUnique({
      where: { id: profile.id },
      select: { organization_type: true, organization_type_other: true },
    }),
    prisma.corporateProfile.findUnique({
      where: { id: profile.id },
      select: { id: true, organization_type: true, organization_type_other: true },
    }),
  ]);

  const treatAsCorporate = effectiveIsCorporateProfile(
    profile.role,
    profile.manual_profile_kind,
    !!corporateRow
  );
  const uiRole =
    profile.role === "ADMIN"
      ? "ADMIN"
      : treatAsCorporate
        ? "PROVIDER"
        : "VIEWER";

  const organizationType: string | null = treatAsCorporate
    ? (corporateRow?.organization_type?.trim() || "company")
    : (generalProfile?.organization_type ?? null);

  const organization_type_other: string | null = treatAsCorporate
    ? (corporateRow?.organization_type_other ?? null)
    : (generalProfile?.organization_type_other ?? null);

  // AI検定合格チェック（別DBのため失敗しても無視）
  let aiKenteiPassed = false;
  try {
    const kenteiDb = await getAiKenteiDb();
    const { data } = await kenteiDb
      .from("ai_kentei_exam_sessions")
      .select("passed")
      .eq("user_id", profile.id)
      .eq("passed", true)
      .limit(1);
    aiKenteiPassed = !!(data && data.length > 0);
  } catch {
    // AI検定DBへの接続に失敗しても通常のレスポンスを返す
  }

  return NextResponse.json({
    profile: {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      avatar_url: profile.avatar_url,
      role: uiRole,
      is_corporate_profile: treatAsCorporate,
      organization_type: organizationType,
      organization_type_other,
      ai_kentei_passed: aiKenteiPassed,
    },
    ai_navigator_agreed: !!profile.ai_navigator_agreed_at,
  });
}
