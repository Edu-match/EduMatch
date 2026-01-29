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
  };
}

export type UpdateProfileInput = {
  name?: string;
  phone?: string | null;
  postal_code?: string | null;
  prefecture?: string | null;
  city?: string | null;
  address?: string | null;
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
      },
    });
    return { success: true };
  } catch (e) {
    console.error("updateProfile error:", e);
    return { success: false, error: "保存に失敗しました" };
  }
}
