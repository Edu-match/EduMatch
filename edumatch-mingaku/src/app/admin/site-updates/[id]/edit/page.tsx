import { redirect, notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getSiteUpdateById } from "@/app/_actions/site-updates";
import { SiteUpdateEditor } from "../../_components/site-update-editor";

export default async function EditSiteUpdatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await getCurrentProfile();
  if (profile?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { id } = await params;
  const item = await getSiteUpdateById(id);
  if (!item) {
    notFound();
  }

  const publishedAt = new Date(item.published_at);
  const offset = publishedAt.getTimezoneOffset() * 60000;
  const local = new Date(publishedAt.getTime() - offset);
  const publishedAtLocal = local.toISOString().slice(0, 16);

  const initialProfile = profile
    ? { name: profile.name, avatar_url: profile.avatar_url, email: profile.email }
    : null;

  return (
    <SiteUpdateEditor
      mode="edit"
      id={id}
      defaultTitle={item.title}
      defaultBody={item.body}
      defaultPublishedAt={publishedAtLocal}
      defaultLink={item.link ?? ""}
      defaultThumbnailUrl={item.thumbnail_url ?? ""}
      defaultCategory={item.category ?? ""}
      initialProfile={initialProfile}
    />
  );
}
