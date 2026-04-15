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
  /** DB に ServiceBusiness 行がある（投稿者・事業者機能） */
  is_service_business: boolean;
  /** 初回プロフィール前: user_metadata の登録種別 */
  registration_kind: "general" | "service_business" | null;
};

export async function getCurrentUserProfile(): Promise<CurrentUserProfile | null> {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const full = await prisma.profile.findUnique({
    where: { id: profile.id },
    include: { generalUser: true, serviceBusiness: true },
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

  const g = full.generalUser;
  const s = full.serviceBusiness;
  const is_service_business = !!s;

  const organization = is_service_business ? (s?.organization ?? null) : (g?.organization ?? null);
  const organization_type = is_service_business
    ? (s?.organization_type ?? null)
    : (g?.organization_type ?? null);
  const legal_name = is_service_business ? (s?.legal_name ?? null) : (g?.legal_name ?? null);
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
    notification_email_2: s?.notification_email_2 ?? null,
    notification_email_3: s?.notification_email_3 ?? null,
    role: full.role,
    is_service_business,
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
    generalUser: { id: string } | null;
    serviceBusiness: { id: string } | null;
  },
  registration_kind: "general" | "service_business" | null
): "general" | "service_business" {
  if (full.serviceBusiness) return "service_business";
  if (full.generalUser) return "general";
  if (registration_kind === "service_business") return "service_business";
  return "general";
}

export async function updateProfile(input: UpdateProfileInput): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAuth();
    const full = await prisma.profile.findUnique({
      where: { id: user.id },
      include: { generalUser: true, serviceBusiness: true },
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
        await tx.serviceBusiness.upsert({
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
        await tx.generalUser.deleteMany({ where: { id: user.id } });
      } else {
        await tx.generalUser.upsert({
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
        await tx.serviceBusiness.deleteMany({ where: { id: user.id } });
      }
    });

    return { success: true };
  } catch (e) {
    console.error("updateProfile error:", e);
    return { success: false, error: "保存に失敗しました" };
  }
}
