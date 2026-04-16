"use server";

import { getCurrentProfile } from "@/lib/auth";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";

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
  /** 初回プロフィール前: user_metadata の登録種別 */
  registration_kind: "general" | "service_business" | null;
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
  // ADMIN は常に一般表示（DB に誤った CorporateProfile が残っていても無視）
  const is_corporate_profile = full.role === "ADMIN" ? false : !!c;

  const organization = is_corporate_profile ? (c?.organization ?? null) : (g?.organization ?? null);
  const organization_type = is_corporate_profile
    ? (c?.organization_type ?? null)
    : (g?.organization_type ?? null);
  const legal_name = is_corporate_profile ? (c?.legal_name ?? null) : (g?.legal_name ?? null);
  const age = g?.age ?? null;

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
    notification_email_2: c?.notification_email_2 ?? null,
    notification_email_3: c?.notification_email_3 ?? null,
    role: full.role,
    is_corporate_profile,
    registration_kind,
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
  bio?: string | null;
  website?: string | null;
  notification_email_2?: string | null;
  notification_email_3?: string | null;
};

function resolveProfileTarget(
  full: {
    role: string;
    generalProfile: { id: string } | null;
    corporateProfile: { id: string } | null;
  },
  registration_kind: "general" | "service_business" | null
): "general" | "service_business" {
  // 管理者は常に一般側（GeneralProfile）。企業用 CorporateProfile は持たない。
  if (full.role === "ADMIN") return "general";
  if (full.corporateProfile) return "service_business";
  if (full.generalProfile) return "general";
  if (registration_kind === "service_business") return "service_business";
  return "general";
}

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

    const target = resolveProfileTarget(full, registration_kind);

    await prisma.$transaction(async (tx) => {
      await tx.profile.update({
        where: { id: user.id },
        data: {
          ...(input.name != null && { name: input.name }),
          ...(input.avatar_url !== undefined && { avatar_url: input.avatar_url || null }),
          ...(input.phone !== undefined && { phone: input.phone || null }),
          ...(input.bio !== undefined && { bio: input.bio || null }),
          ...(input.website !== undefined && { website: input.website || null }),
        },
      });

      if (target === "service_business") {
        await tx.corporateProfile.upsert({
          where: { id: user.id },
          create: {
            id: user.id,
            legal_name: input.legal_name?.trim() || null,
            organization: input.organization?.trim() || null,
            organization_type: input.organization_type?.trim() || null,
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
