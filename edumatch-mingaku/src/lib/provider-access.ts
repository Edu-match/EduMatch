import { prisma } from "@/lib/prisma";

/** 管理者、または CorporateProfile 行があるユーザー（企業ユーザー）なら投稿者機能を使える */
export async function canManageProviderContent(profile: {
  id: string;
  role: string;
}): Promise<boolean> {
  if (profile.role === "ADMIN") return true;
  const row = await prisma.corporateProfile.findUnique({
    where: { id: profile.id },
    select: { id: true },
  });
  return !!row;
}
