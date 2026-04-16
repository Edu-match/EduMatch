import { prisma } from "@/lib/prisma";
import { effectiveIsCorporateProfile } from "@/lib/manual-profile-kind";

/** 管理者、または manual / 拡張行により事業者として有効なユーザー */
export async function canManageProviderContent(profile: {
  id: string;
  role: string;
  manual_profile_kind?: string | null;
}): Promise<boolean> {
  if (profile.role === "ADMIN") return true;
  const row = await prisma.corporateProfile.findUnique({
    where: { id: profile.id },
    select: { id: true },
  });
  return effectiveIsCorporateProfile(profile.role, profile.manual_profile_kind, !!row);
}
