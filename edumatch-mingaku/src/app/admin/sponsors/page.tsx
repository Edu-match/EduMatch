import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentProfile } from "@/lib/auth";
import { getSponsorAdsForAdmin } from "@/app/_actions/sponsor-ads";
import { AdminSponsorsClient } from "@/components/admin/admin-sponsors-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "スポンサーPRを管理 | エデュマッチ",
};

export default async function AdminSponsorsPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "ADMIN") {
    redirect("/");
  }

  const ads = await getSponsorAdsForAdmin();

  return (
    <AdminSponsorsClient
      initialAds={ads.map((ad) => ({
        id: ad.id,
        title: ad.title,
        description: ad.description,
        imageUrl: ad.image_url,
        linkUrl: ad.link_url,
        placement: ad.placement,
        isActive: ad.is_active,
        position: ad.position,
        startsAt: ad.starts_at ? ad.starts_at.toISOString() : null,
        endsAt: ad.ends_at ? ad.ends_at.toISOString() : null,
        clickCount: ad.click_count,
      }))}
    />
  );
}
