import { prisma } from "@/lib/prisma";

/** 管理者、PROVIDER、または CorporateProfile 行があるユーザーなら投稿者機能を使える */
export async function canManageProviderContent(profile: {
  id: string;
  role: string;
}): Promise<boolean> {
  if (profile.role === "ADMIN" || profile.role === "PROVIDER") return true;
  const row = await prisma.corporateProfile.findUnique({
    where: { id: profile.id },
    select: { id: true },
  });
  return !!row;
}
