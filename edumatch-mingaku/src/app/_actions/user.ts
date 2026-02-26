"use server";

import { getCurrentProfile } from "@/lib/auth";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getCurrentUserRole() {
  const profile = await getCurrentProfile();
  return profile?.role || null;
}

export async function getCurrentUserProfile() {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  return {
    name: profile.name,
    avatar_url: profile.avatar_url,
    email: profile.email,
    phone: profile.phone,
    postal_code: profile.postal_code,
    prefecture: profile.prefecture,
    city: profile.city,
    address: profile.address,
    bio: profile.bio,
    website: profile.website,
    notification_email_2: profile.notification_email_2 ?? null,
    notification_email_3: profile.notification_email_3 ?? null,
  };
}

/** 公開用プロフィール（投稿者詳細表示用・メールは返さない） */
export type PublicProfile = {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  prefecture: string | null;
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
      prefecture: true,
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
      prefecture: true,
      services: {
        where: {
          OR: [
            { status: "APPROVED" as const },
            { is_published: true },
          ],
        },
        select: { id: true, title: true, thumbnail_url: true, category: true },
        orderBy: { created_at: "desc" },
        take: 24,
      },
      posts: {
        where: {
          OR: [
            { status: "APPROVED" as const },
            { is_published: true },
          ],
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
  phone?: string | null;
  postal_code?: string | null;
  prefecture?: string | null;
  city?: string | null;
  address?: string | null;
  bio?: string | null;
  website?: string | null;
  notification_email_2?: string | null;
  notification_email_3?: string | null;
};

export async function updateProfile(input: UpdateProfileInput): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAuth();
    await prisma.profile.update({
      where: { id: user.id },
      data: {
        ...(input.name != null && { name: input.name }),
        ...(input.phone !== undefined && { phone: input.phone || null }),
        ...(input.postal_code !== undefined && { postal_code: input.postal_code || null }),
        ...(input.prefecture !== undefined && { prefecture: input.prefecture || null }),
        ...(input.city !== undefined && { city: input.city || null }),
        ...(input.address !== undefined && { address: input.address || null }),
        ...(input.bio !== undefined && { bio: input.bio || null }),
        ...(input.website !== undefined && { website: input.website || null }),
        ...(input.notification_email_2 !== undefined && { notification_email_2: input.notification_email_2?.trim() || null }),
        ...(input.notification_email_3 !== undefined && { notification_email_3: input.notification_email_3?.trim() || null }),
      },
    });
    return { success: true };
  } catch (e) {
    console.error("updateProfile error:", e);
    return { success: false, error: "保存に失敗しました" };
  }
}
