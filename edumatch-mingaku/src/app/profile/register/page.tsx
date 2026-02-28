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
        email: profile.email,
        phone: profile.phone ?? null,
        organization: profile.organization ?? null,
        postal_code: profile.postal_code ?? null,
        prefecture: profile.prefecture ?? null,
        city: profile.city ?? null,
        address: profile.address ?? null,
        bio: profile.bio ?? null,
        website: profile.website ?? null,
        notification_email_2: profile.notification_email_2 ?? null,
        notification_email_3: profile.notification_email_3 ?? null,
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
