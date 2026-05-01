import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import TalentDetailClient from "./talent-detail-client";
import type { TalentProfile } from "@/app/_actions/talent";

export const dynamic = "force-dynamic";

async function getTalentProfile(id: string): Promise<TalentProfile | null> {
  try {
    const general = await prisma.generalProfile.findUnique({
      where: { id },
      include: {
        profile: {
          include: {
            services: {
              where: { is_published: true },
              select: { id: true, title: true, category: true },
              orderBy: { created_at: "desc" },
              take: 10,
            },
          },
        },
      },
    });

    if (general?.talent_matching_enabled) {
      return {
        id: general.profile.id,
        name: general.profile.name,
        avatar_url: general.profile.avatar_url,
        bio: general.profile.bio,
        website: general.profile.website,
        interests: general.profile.interests,
        prefecture: null,
        organization: general.organization,
        organization_type: general.organization_type,
        talent_matching_description: general.talent_matching_description,
        talent_badges: general.talent_badges ?? [],
        type: "individual",
        services: general.profile.services,
      };
    }

    const corporate = await prisma.corporateProfile.findUnique({
      where: { id },
      include: {
        profile: {
          include: {
            services: {
              where: { is_published: true },
              select: { id: true, title: true, category: true },
              orderBy: { created_at: "desc" },
              take: 10,
            },
          },
        },
      },
    });

    if (corporate?.talent_matching_enabled) {
      return {
        id: corporate.profile.id,
        name: corporate.profile.name,
        avatar_url: corporate.profile.avatar_url,
        bio: corporate.profile.bio,
        website: corporate.profile.website,
        interests: corporate.profile.interests,
        prefecture: corporate.prefecture,
        organization: corporate.organization,
        organization_type: corporate.organization_type,
        talent_matching_description: corporate.talent_matching_description,
        talent_badges: corporate.talent_badges ?? [],
        type: "corporate",
        services: corporate.profile.services,
      };
    }

    return null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const profile = await getTalentProfile(id);
  if (!profile) return {};
  return {
    title: `${profile.name} | 人材マッチング | エデュマッチ`,
    description: profile.talent_matching_description ?? profile.bio ?? undefined,
  };
}

export default async function TalentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getTalentProfile(id);
  if (!profile) notFound();
  return <TalentDetailClient profile={profile} />;
}
