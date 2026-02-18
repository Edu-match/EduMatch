import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

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
 * 投稿者（PROVIDER）専用ページ用。認証済みかつ role が PROVIDER でない場合は /dashboard へリダイレクトします。
 */
export async function requireProvider() {
  const user = await requireAuth();
  const profile = await getCurrentProfile();
  if (profile?.role !== "PROVIDER") {
    redirect("/dashboard?message=" + encodeURIComponent("投稿者として利用するには、新規登録時に「投稿者として利用」を選択して登録する必要があります。"));
  }
  return { user, profile };
}
