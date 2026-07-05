"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { effectiveIsCorporateProfile } from "@/lib/manual-profile-kind";
import { computeForumAuthorRoleStorage } from "@/lib/organization-types";
import { revalidatePath } from "next/cache";

/**
 * 人材マッチング名鑑。分断を越えて教育関係者が互いを見つけ、つながるための名鑑。
 * プライバシー保護：directory_opt_in=true（本人が明示同意）の Profile のみ掲載する。
 * 公開するのは名前・アバター・立場・自己紹介・関心のみ（メール等の連絡先は非公開）。
 */

export type DirectoryMember = {
  id: string;
  name: string;
  avatar_url: string | null;
  role_label: string;
  bio: string | null;
  interests: string[];
  ai_kentei_passed: boolean;
};

const SELECT = {
  id: true,
  name: true,
  avatar_url: true,
  bio: true,
  interests: true,
  ai_kentei_passed: true,
  role: true,
  manual_profile_kind: true,
  generalProfile: { select: { organization_type: true, organization_type_other: true } },
  corporateProfile: { select: { organization_type: true, organization_type_other: true } },
} as const;

type Row = {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  interests: string[];
  ai_kentei_passed: boolean;
  role: string;
  manual_profile_kind: string | null;
  generalProfile: { organization_type: string | null; organization_type_other: string | null } | null;
  corporateProfile: { organization_type: string | null; organization_type_other: string | null } | null;
};

function roleLabel(p: Row): string {
  const treatAsCorporate = effectiveIsCorporateProfile(p.role, p.manual_profile_kind, !!p.corporateProfile);
  if (treatAsCorporate) {
    const c = p.corporateProfile;
    return computeForumAuthorRoleStorage(c?.organization_type?.trim() || "company", c?.organization_type_other ?? null);
  }
  const g = p.generalProfile;
  return computeForumAuthorRoleStorage(g?.organization_type ?? null, g?.organization_type_other ?? null);
}

/** 名鑑掲載メンバー一覧（オプトイン済みのみ）。interest 指定時はその関心を持つ人に絞る。 */
export async function getDirectoryMembers(interest?: string): Promise<DirectoryMember[]> {
  const rows = (await prisma.profile.findMany({
    where: {
      directory_opt_in: true,
      ...(interest ? { interests: { has: interest } } : {}),
    },
    select: SELECT,
    orderBy: { updated_at: "desc" },
    take: 200,
  })) as Row[];

  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    avatar_url: p.avatar_url,
    role_label: roleLabel(p),
    bio: p.bio,
    interests: p.interests ?? [],
    ai_kentei_passed: p.ai_kentei_passed,
  }));
}

/** 名鑑に載っている関心タグの一覧（フィルタUI用）。 */
export async function getDirectoryInterests(): Promise<string[]> {
  const rows = await prisma.profile.findMany({
    where: { directory_opt_in: true },
    select: { interests: true },
    take: 500,
  });
  const set = new Set<string>();
  for (const r of rows) for (const i of r.interests ?? []) if (i.trim()) set.add(i.trim());
  return [...set].sort();
}

export type MyDirectoryStatus = {
  optIn: boolean;
  bio: string | null;
  interests: string[];
};

/** ログイン中ユーザーの名鑑掲載状態（設定カード用）。未ログインは null。 */
export async function getMyDirectoryStatus(): Promise<MyDirectoryStatus | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const p = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { directory_opt_in: true, bio: true, interests: true },
  });
  if (!p) return null;
  return { optIn: p.directory_opt_in, bio: p.bio, interests: p.interests ?? [] };
}

/** 自分の名鑑掲載オプトインを切り替える。 */
export async function setDirectoryOptIn(optIn: boolean): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "ログインが必要です" };
  try {
    await prisma.profile.update({ where: { id: user.id }, data: { directory_opt_in: optIn } });
    revalidatePath("/matching");
    return { success: true };
  } catch (e) {
    console.error("[directory] setDirectoryOptIn", e);
    return { success: false, error: "設定の更新に失敗しました" };
  }
}
