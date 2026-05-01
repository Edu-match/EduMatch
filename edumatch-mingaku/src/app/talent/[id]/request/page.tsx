import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import TalentRequestForm from "./request-form";
import type { TalentProfile } from "@/app/_actions/talent";

export const dynamic = "force-dynamic";

async function getTalentProfile(id: string): Promise<TalentProfile | null> {
  try {
    const general = await prisma.generalProfile.findUnique({
      where: { id },
      include: { profile: { include: { services: { where: { is_published: true }, select: { id: true, title: true, category: true }, take: 5 } } } },
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
        ai_kentei_passed: general.profile.ai_kentei_passed ?? false,
        type: "individual",
        services: general.profile.services,
      };
    }
    const corporate = await prisma.corporateProfile.findUnique({
      where: { id },
      include: { profile: { include: { services: { where: { is_published: true }, select: { id: true, title: true, category: true }, take: 5 } } } },
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
        ai_kentei_passed: corporate.profile.ai_kentei_passed ?? false,
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
  return { title: `${profile.name}への依頼 | エデュマッチ` };
}

export default async function TalentRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [profile, currentProfile] = await Promise.all([
    getTalentProfile(id),
    getCurrentProfile(),
  ]);
  if (!profile) notFound();

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="container max-w-2xl py-8">
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-6 text-muted-foreground">
          <Link href={`/talent/${profile.id}`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {profile.name}のプロフィールに戻る
          </Link>
        </Button>

        <div className="mb-8">
          <h1 className="text-2xl font-bold">依頼フォーム</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{profile.name}</span>
            さんへの依頼内容をご記入ください。
          </p>
        </div>

        <TalentRequestForm
          profile={profile}
          currentUserName={currentProfile?.name}
          currentUserEmail={currentProfile?.email}
        />
      </div>
    </div>
  );
}
