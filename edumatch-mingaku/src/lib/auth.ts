import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

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
    });
    return profile;
  } catch (error) {
    console.error("Error fetching profile:", error);
    return null;
  }
});

/**
 * 投稿者向け（CorporateProfile 行あり、または Profile.role が PROVIDER）、または ADMIN。
 */
export async function requireProvider() {
  const user = await requireAuth();
  const profile = await getCurrentProfile();
  if (profile?.role === "ADMIN") {
    return { user, profile };
  }
  if (profile?.role === "PROVIDER") {
    return { user, profile };
  }
  const corporate = await prisma.corporateProfile.findUnique({
    where: { id: user.id },
    select: { id: true },
  });
  if (!corporate) {
    redirect(
      "/dashboard?message=" +
        encodeURIComponent(
          "投稿者として利用するには、事業者として登録し、プロフィールを完了してください。"
        )
    );
  }
  return { user, profile };
}
