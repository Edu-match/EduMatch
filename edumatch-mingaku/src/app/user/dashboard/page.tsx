import { redirect } from "next/navigation";
import { requireAuth, getCurrentProfile } from "@/lib/auth";
import { canAccessPosterFeatures } from "@/lib/manual-profile-kind";

/**
 * 旧モックの「ユーザーダッシュボード」URL。
 * 運営（ADMIN）のみ投稿者ダッシュボードへ。事業者・一般ユーザーはマイページへ。
 */
export default async function UserDashboardRedirectPage() {
  await requireAuth();
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/mypage");
  }
  if (canAccessPosterFeatures(profile.role)) {
    redirect("/provider-dashboard");
  }
  redirect("/mypage");
}
