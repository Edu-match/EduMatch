import { canAccessPosterFeatures } from "@/lib/manual-profile-kind";

/** 記事・サービスの投稿・管理（運営 ADMIN のみ） */
export async function canManageProviderContent(profile: {
  role: string;
}): Promise<boolean> {
  return canAccessPosterFeatures(profile.role);
}
