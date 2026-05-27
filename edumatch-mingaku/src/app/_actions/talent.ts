"use server";

import { prisma } from "@/lib/prisma";

export type TalentProfile = {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  interests: string[];
  prefecture: string | null;
  organization: string | null;
  organization_type: string | null;
  talent_matching_description: string | null;
  talent_badges: string[];
  talent_hourly_rate: string | null;
  ai_kentei_passed: boolean;
  type: "individual" | "corporate";
  services: { id: string; title: string; category: string }[];
};

/** 人材マッチングに掲載中のプロフィール一覧（個人＋企業の統合） */
export async function getTalentMatchingProfiles(): Promise<TalentProfile[]> {
  const [generals, corporates] = await Promise.all([
    prisma.generalProfile.findMany({
      where: { talent_matching_enabled: true },
      include: {
        profile: {
          include: {
            services: {
              where: { is_published: true },
              select: { id: true, title: true, category: true },
              orderBy: { created_at: "desc" },
              take: 5,
            },
          },
        },
      },
      orderBy: { created_at: "desc" },
    }),
    prisma.corporateProfile.findMany({
      where: { talent_matching_enabled: true },
      include: {
        profile: {
          include: {
            services: {
              where: { is_published: true },
              select: { id: true, title: true, category: true },
              orderBy: { created_at: "desc" },
              take: 5,
            },
          },
        },
      },
      orderBy: { created_at: "desc" },
    }),
  ]);

  const individualProfiles: TalentProfile[] = generals.map((g) => ({
    id: g.profile.id,
    name: g.profile.name,
    avatar_url: g.profile.avatar_url,
    bio: g.profile.bio,
    website: g.profile.website,
    interests: g.profile.interests,
    prefecture: null,
    organization: g.organization,
    organization_type: g.organization_type,
    talent_matching_description: g.talent_matching_description,
    talent_badges: g.talent_badges ?? [],
    talent_hourly_rate: g.talent_hourly_rate ?? null,
    ai_kentei_passed: g.profile.ai_kentei_passed ?? false,
    type: "individual" as const,
    services: g.profile.services,
  }));

  const corporateProfiles: TalentProfile[] = corporates.map((c) => ({
    id: c.profile.id,
    name: c.profile.name,
    avatar_url: c.profile.avatar_url,
    bio: c.profile.bio,
    website: c.profile.website,
    interests: c.profile.interests,
    prefecture: c.prefecture,
    organization: c.organization,
    organization_type: c.organization_type,
    talent_matching_description: c.talent_matching_description,
    talent_badges: c.talent_badges ?? [],
    talent_hourly_rate: c.talent_hourly_rate ?? null,
    ai_kentei_passed: c.profile.ai_kentei_passed ?? false,
    type: "corporate" as const,
    services: c.profile.services,
  }));

  return [...individualProfiles, ...corporateProfiles];
}
