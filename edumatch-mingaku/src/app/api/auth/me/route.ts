import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  canAccessPosterFeatures,
  effectiveIsCorporateProfile,
} from "@/lib/manual-profile-kind";

export const dynamic = "force-dynamic";

/**
 * 認証済みユーザーのプロフィール（role等）とAIナビゲーター同意状態を返す。
 * 同意状態は Profile テーブルの ai_navigator_agreed_at から取得。
 * メニュー用 uiRole: ADMIN のみ投稿者メニュー、それ以外は VIEWER（事業者 PROVIDER も同様）。
 */
export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json(
      { profile: null, ai_navigator_agreed: false },
      { status: 200 }
    );
  }
  const [corpRow, generalRow] = await Promise.all([
    prisma.corporateProfile.findUnique({
      where: { id: profile.id },
      select: { id: true, legal_name: true, job_title: true, organization_type: true, organization_type_other: true },
    }),
    prisma.generalProfile.findUnique({
      where: { id: profile.id },
      select: { legal_name: true, organization_type: true, organization_type_other: true },
    }),
  ]);
  const treatAsCorporate = effectiveIsCorporateProfile(
    profile.role,
    profile.manual_profile_kind,
    !!corpRow
  );
  const uiRole = canAccessPosterFeatures(profile.role) ? "ADMIN" : "VIEWER";

  // 井戸端の投稿者表示に使う「アカウント登録の属性・本名」。法人/一般どちらの拡張行からでも拾う。
  const ext = treatAsCorporate ? corpRow : generalRow;
  const legalName = ext?.legal_name ?? null;
  const organizationType = ext?.organization_type ?? null;
  const organizationTypeOther = ext?.organization_type_other ?? null;
  const jobTitle = corpRow?.job_title ?? null;

  return NextResponse.json({
    profile: {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      avatar_url: profile.avatar_url,
      role: uiRole,
      is_corporate_profile: treatAsCorporate,
      legal_name: legalName,
      organization_type: organizationType,
      organization_type_other: organizationTypeOther,
      job_title: jobTitle,
    },
    ai_navigator_agreed: !!profile.ai_navigator_agreed_at,
  });
}
