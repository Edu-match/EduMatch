"use server";

import { getCurrentProfile } from "@/lib/auth";

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
  };
}
