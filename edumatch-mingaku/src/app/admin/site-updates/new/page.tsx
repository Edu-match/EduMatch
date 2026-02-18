import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { SiteUpdateEditor } from "../_components/site-update-editor";

export default async function NewSiteUpdatePage() {
  const profile = await getCurrentProfile();
  if (profile?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  const local = new Date(now.getTime() - offset);
  const publishedAt = local.toISOString().slice(0, 16);

  const initialProfile = profile
    ? { name: profile.name, avatar_url: profile.avatar_url, email: profile.email }
    : null;

  return (
    <SiteUpdateEditor
      mode="create"
      defaultTitle=""
      defaultBody=""
      defaultPublishedAt={publishedAt}
      defaultLink=""
      defaultThumbnailUrl=""
      defaultCategory=""
      initialProfile={initialProfile}
    />
  );
}
