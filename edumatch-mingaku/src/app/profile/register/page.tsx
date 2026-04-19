import { requireAuth } from "@/lib/auth";
import { getCurrentUserProfile } from "@/app/_actions";
import { ProfileRegisterForm } from "./ProfileRegisterForm";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ first?: string; next?: string }> };

export default async function ProfileRegisterPage({ searchParams }: Props) {
  await requireAuth();
  const { first, next } = await searchParams;
  const profile = await getCurrentUserProfile();

  const initialProfile = profile
    ? {
        name: profile.name,
        legal_name: profile.legal_name ?? null,
        age: profile.age ?? null,
        email: profile.email,
        avatar_url: profile.avatar_url ?? null,
        phone: profile.phone ?? null,
        organization: profile.organization ?? null,
        organization_type: profile.organization_type ?? null,
        organization_type_other: profile.organization_type_other ?? null,
        bio: profile.bio ?? null,
        website: profile.website ?? null,
        notification_email_2: profile.notification_email_2 ?? null,
        notification_email_3: profile.notification_email_3 ?? null,
        role: profile.role,
        is_corporate_profile: profile.is_corporate_profile,
        registration_kind: profile.registration_kind,
        interests: profile.interests ?? [],
        interest_other: profile.interest_other ?? null,
      }
    : null;

  return (
    <ProfileRegisterForm
      initialProfile={initialProfile}
      isFirstTime={first === "1"}
      nextUrl={next ?? undefined}
    />
  );
}
