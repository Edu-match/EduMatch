import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { canAccessPosterFeatures } from "@/lib/manual-profile-kind";

/**
 * 現在のユーザーを取得します（同一リクエスト内で1回だけ実行）
 * 未認証の場合はnullを返します
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * 認証が必要なページで使用します
 * 未認証の場合はログインページにリダイレクトします
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login");
  }
  return user;
}

/**
 * 認証済みユーザーのProfileを取得します（同一リクエスト内で1回だけ実行）
 */
export const getCurrentProfile = cache(async () => {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const { prisma } = await import("@/lib/prisma");

  try {
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      // マイグレーション適用前のDBでも認証・管理者メニューが壊れないよう、
      // 新規追加カラムを暗黙SELECTしない。
      select: {
        id: true,
        role: true,
        name: true,
        email: true,
        avatar_url: true,
        subscription_status: true,
        created_at: true,
        updated_at: true,
        phone: true,
        bio: true,
        website: true,
        subscription_plan: true,
        stripe_customer_id: true,
        stripe_subscription_id: true,
        subscription_current_period_end: true,
        chat_usage_events: true,
        ai_navigator_agreed_at: true,
        interests: true,
        interest_other: true,
        manual_profile_kind: true,
        onboarding_completed_at: true,
      },
    });
    return profile;
  } catch (error) {
    console.error("Error fetching profile:", error);
    return null;
  }
});

/**
 * 管理者専用ガード。ADMIN ロール以外はトップページにリダイレクトします。
 */
export async function requireAdmin() {
  const user = await requireAuth();
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "ADMIN") {
    redirect("/");
  }
  return { user, profile };
}

/**
 * スタッフ以上ガード。STAFF または ADMIN ならパス。チケット受付用。
 */
export async function requireStaffOrAdmin() {
  const user = await requireAuth();
  const profile = await getCurrentProfile();
  if (!profile || (profile.role !== "ADMIN" && profile.role !== "STAFF")) {
    redirect("/");
  }
  return { user, profile };
}

/**
 * 記事・サービス投稿および投稿者ダッシュボード（運営 ADMIN のみ）。
 */
export async function requireProvider() {
  const user = await requireAuth();
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/auth/login");
  }
  if (!canAccessPosterFeatures(profile.role)) {
    redirect(
      "/mypage?message=" +
        encodeURIComponent("この機能は運営アカウントのみ利用できます。")
    );
  }
  return { user, profile };
}
