import { prisma } from "@/lib/prisma";
import { effectiveIsCorporateProfile } from "@/lib/manual-profile-kind";
import { computeForumAuthorRoleStorage } from "@/lib/organization-types";

/** ログインユーザーの井戸端会議 author_role 保存値（プロフィールの職業・役職から算出） */
export async function getForumAuthorRoleForUser(userId: string): Promise<string> {
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    include: { generalProfile: true, corporateProfile: true },
  });
  if (!profile) return "一般";

  const hasCorpRow = !!profile.corporateProfile;
  const treatAsCorporate = effectiveIsCorporateProfile(
    profile.role,
    profile.manual_profile_kind,
    hasCorpRow
  );

  if (treatAsCorporate) {
    const c = profile.corporateProfile;
    const orgType = c?.organization_type?.trim() || "company";
    const orgOther = c?.organization_type_other ?? null;
    return computeForumAuthorRoleStorage(orgType, orgOther);
  }

  const g = profile.generalProfile;
  return computeForumAuthorRoleStorage(g?.organization_type ?? null, g?.organization_type_other ?? null);
}
