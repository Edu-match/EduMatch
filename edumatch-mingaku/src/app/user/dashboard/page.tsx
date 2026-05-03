import { redirect } from "next/navigation";
import { requireAuth, getCurrentProfile } from "@/lib/auth";
import { effectiveIsCorporateProfile } from "@/lib/manual-profile-kind";
import { prisma } from "@/lib/prisma";

/**
 * 旧モックの「ユーザーダッシュボード」URL。
 * 一般ユーザーが誤って開かないよう、ロールに応じた正式なダッシュへ誘導する。
 */
export default async function UserDashboardRedirectPage() {
  await requireAuth();
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/mypage");
  }
  if (profile.role === "ADMIN") {
    redirect("/provider-dashboard");
  }
  const hasCorp = !!(await prisma.corporateProfile.findUnique({
    where: { id: profile.id },
    select: { id: true },
  }));
  const isProvider = effectiveIsCorporateProfile(
    profile.role,
    profile.manual_profile_kind,
    hasCorp
  );
  if (isProvider) {
    redirect("/provider-dashboard");
  }
  redirect("/mypage");
}
