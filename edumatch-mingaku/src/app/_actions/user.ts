"use server";

import { getCurrentProfile } from "@/lib/auth";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import {
  effectiveIsCorporateProfile,
  resolveProfileExtensionTarget,
} from "@/lib/manual-profile-kind";

export async function getCurrentUserRole() {
  const profile = await getCurrentProfile();
  return profile?.role || null;
}

export type CurrentUserProfile = {
  name: string;
  legal_name: string | null;
  age: string | null;
  avatar_url: string | null;
  email: string;
  phone: string | null;
  organization: string | null;
  organization_type: string | null;
  bio: string | null;
  website: string | null;
  notification_email_2: string | null;
  notification_email_3: string | null;
  role: string;
  /** CorporateProfile 行がある（企業ユーザー・投稿者機能） */
  is_corporate_profile: boolean;
  /** 所属「その他」の補足（任意） */
  organization_type_other: string | null;
  /** 初回プロフィール前: user_metadata の登録種別 */
  registration_kind: "general" | "service_business" | null;
  /** 関心のあるカテゴリ（複数選択） */
  interests: string[];
  /** 関心カテゴリ「その他」の自由記述 */
  interest_other: string | null;
};

export async function getCurrentUserProfile(): Promise<CurrentUserProfile | null> {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const full = await prisma.profile.findUnique({
    where: { id: profile.id },
    include: { generalProfile: true, corporateProfile: true },
  });
  if (!full) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const meta = user?.user_metadata ?? {};
  const rkRaw = meta.registration_kind;
  const registration_kind =
    rkRaw === "service_business" || rkRaw === "general" ? rkRaw : null;

  const g = full.generalProfile;
  const c = full.corporateProfile;
  const is_corporate_profile = effectiveIsCorporateProfile(
    full.role,
    full.manual_profile_kind,
    !!c
  );

  const organization = is_corporate_profile
    ? (c?.organization ?? g?.organization ?? null)
    : (g?.organization ?? c?.organization ?? null);
  const organization_type = is_corporate_profile
    ? (c?.organization_type ?? g?.organization_type ?? null)
    : (g?.organization_type ?? c?.organization_type ?? null);
  const legal_name = is_corporate_profile
    ? (c?.legal_name ?? g?.legal_name ?? null)
    : (g?.legal_name ?? c?.legal_name ?? null);
  const age = g?.age ?? null;
  const organization_type_other = is_corporate_profile
    ? (c?.organization_type_other ?? g?.organization_type_other ?? null)
    : (g?.organization_type_other ?? c?.organization_type_other ?? null);

  return {
    name: full.name,
    legal_name,
    age,
    avatar_url: full.avatar_url,
    email: full.email,
    phone: full.phone,
    organization,
    organization_type,
    bio: full.bio,
    website: full.website,
    notification_email_2: is_corporate_profile ? (c?.notification_email_2 ?? null) : null,
    notification_email_3: is_corporate_profile ? (c?.notification_email_3 ?? null) : null,
    role: full.role,
    is_corporate_profile,
    organization_type_other,
    registration_kind,
    interests: full.interests ?? [],
    interest_other: full.interest_other ?? null,
  };
}

/** 公開用プロフィール（投稿者詳細表示用・メールは返さない） */
export type PublicProfile = {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
};

export async function getProfileById(id: string): Promise<PublicProfile | null> {
  const profile = await prisma.profile.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      avatar_url: true,
      bio: true,
      website: true,
    },
  });
  return profile;
}

/** 公開用プロフィール＋投稿一覧（投稿者詳細ページ用） */
export type PublicProfileWithContents = PublicProfile & {
  services: { id: string; title: string; thumbnail_url: string | null; category: string }[];
  posts: { id: string; title: string; thumbnail_url: string | null; created_at: Date }[];
};

export async function getProfileWithContents(
  id: string
): Promise<PublicProfileWithContents | null> {
  const profile = await prisma.profile.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      avatar_url: true,
      bio: true,
      website: true,
      services: {
        where: {
          OR: [{ status: "APPROVED" as const }, { is_published: true }],
        },
        select: { id: true, title: true, thumbnail_url: true, category: true },
        orderBy: { created_at: "desc" },
        take: 24,
      },
      posts: {
        where: {
          OR: [{ status: "APPROVED" as const }, { is_published: true }],
        },
        select: { id: true, title: true, thumbnail_url: true, created_at: true },
        orderBy: { created_at: "desc" },
        take: 24,
      },
    },
  });
  if (!profile) return null;
  return profile as PublicProfileWithContents;
}

export type UpdateProfileInput = {
  name?: string;
  avatar_url?: string | null;
  legal_name?: string | null;
  age?: string | null;
  phone?: string | null;
  organization?: string | null;
  organization_type?: string | null;
  /** 所属の種類が「その他」のときの補足（任意） */
  organization_type_other?: string | null;
  bio?: string | null;
  website?: string | null;
  notification_email_2?: string | null;
  notification_email_3?: string | null;
  /** 関心のあるカテゴリ（複数選択） */
  interests?: string[];
  /** 関心カテゴリ「その他」の自由記述（最大100文字） */
  interest_other?: string | null;
  /** 初回プロフィール登録ウィザード完了時に true */
  completeInitialSetup?: boolean;
};


export async function updateProfile(input: UpdateProfileInput): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAuth();
    const full = await prisma.profile.findUnique({
      where: { id: user.id },
      include: { generalProfile: true, corporateProfile: true },
    });
    if (!full) return { success: false, error: "プロフィールが見つかりません" };

    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    const meta = authUser?.user_metadata ?? {};
    const rkRaw = meta.registration_kind;
    const registration_kind =
      rkRaw === "service_business" || rkRaw === "general" ? rkRaw : null;

    const target = resolveProfileExtensionTarget(
      full.role,
      full.manual_profile_kind,
      !!full.generalProfile,
      !!full.corporateProfile,
      registration_kind
    );

    await prisma.$transaction(async (tx) => {
      await tx.profile.update({
        where: { id: user.id },
        data: {
          ...(input.name != null && { name: input.name }),
          ...(input.avatar_url !== undefined && { avatar_url: input.avatar_url || null }),
          ...(input.phone !== undefined && { phone: input.phone || null }),
          ...(input.bio !== undefined && { bio: input.bio || null }),
          ...(input.website !== undefined && { website: input.website || null }),
          ...(input.interests !== undefined && { interests: input.interests }),
          ...(input.interest_other !== undefined && {
            interest_other: input.interest_other?.trim() || null,
          }),
          ...(input.completeInitialSetup === true && {
            onboarding_completed_at: new Date(),
          }),
        },
      });

      const orgOther =
        input.organization_type_other !== undefined
          ? input.organization_type_other?.trim() || null
          : undefined;

      if (target === "service_business") {
        await tx.corporateProfile.upsert({
          where: { id: user.id },
          create: {
            id: user.id,
            legal_name: input.legal_name?.trim() || null,
            organization: input.organization?.trim() || null,
            organization_type: input.organization_type?.trim() || null,
            ...(orgOther !== undefined && { organization_type_other: orgOther }),
            notification_email_2: input.notification_email_2?.trim() || null,
            notification_email_3: input.notification_email_3?.trim() || null,
          },
          update: {
            ...(input.legal_name !== undefined && {
              legal_name: input.legal_name?.trim() || null,
            }),
            ...(input.organization !== undefined && {
              organization: input.organization?.trim() || null,
            }),
            ...(input.organization_type !== undefined && {
              organization_type: input.organization_type?.trim() || null,
            }),
            ...(orgOther !== undefined && { organization_type_other: orgOther }),
            ...(input.notification_email_2 !== undefined && {
              notification_email_2: input.notification_email_2?.trim() || null,
            }),
            ...(input.notification_email_3 !== undefined && {
              notification_email_3: input.notification_email_3?.trim() || null,
            }),
          },
        });
        await tx.generalProfile.deleteMany({ where: { id: user.id } });
      } else {
        await tx.generalProfile.upsert({
          where: { id: user.id },
          create: {
            id: user.id,
            legal_name: input.legal_name?.trim() || null,
            age: input.age || null,
            organization: input.organization?.trim() || null,
            organization_type: input.organization_type?.trim() || null,
            ...(orgOther !== undefined && { organization_type_other: orgOther }),
          },
          update: {
            ...(input.legal_name !== undefined && {
              legal_name: input.legal_name?.trim() || null,
            }),
            ...(input.age !== undefined && { age: input.age || null }),
            ...(input.organization !== undefined && {
              organization: input.organization?.trim() || null,
            }),
            ...(input.organization_type !== undefined && {
              organization_type: input.organization_type?.trim() || null,
            }),
            ...(orgOther !== undefined && { organization_type_other: orgOther }),
          },
        });
        await tx.corporateProfile.deleteMany({ where: { id: user.id } });
      }
    });

    return { success: true };
  } catch (e) {
    console.error("updateProfile error:", e);
    return { success: false, error: "保存に失敗しました" };
  }
}
