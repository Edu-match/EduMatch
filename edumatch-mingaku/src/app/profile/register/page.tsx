import { requireAuth } from "@/lib/auth";
import { getCurrentUserProfile } from "@/app/_actions";
import { ProfileRegisterForm } from "./ProfileRegisterForm";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ first?: string }> };

export default async function ProfileRegisterPage({ searchParams }: Props) {
  await requireAuth();
  const { first } = await searchParams;
  const profile = await getCurrentUserProfile();

  const initialProfile = profile
    ? {
        name: profile.name,
        email: profile.email,
        phone: profile.phone ?? null,
        postal_code: profile.postal_code ?? null,
        prefecture: profile.prefecture ?? null,
        city: profile.city ?? null,
        address: profile.address ?? null,
      }
    : null;

  return (
    <ProfileRegisterForm
      initialProfile={initialProfile}
      isFirstTime={first === "1"}
    />
  );
}
