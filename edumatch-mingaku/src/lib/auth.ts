import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

/**
 * 現在のユーザーを取得します
 * 未認証の場合はnullを返します
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

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
 * 認証済みユーザーのProfileを取得します
 */
export async function getCurrentProfile() {
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
}
