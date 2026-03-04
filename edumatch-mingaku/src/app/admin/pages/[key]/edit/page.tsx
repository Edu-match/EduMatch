import { redirect, notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getSitePage } from "@/app/_actions/site-pages";
import { PageEditor } from "../../_components/page-editor";
import type { SitePageKey } from "@/app/_actions/site-pages";

const VALID_KEYS: SitePageKey[] = ["terms", "privacy", "service_content"];

export default async function EditSitePagePage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const profile = await getCurrentProfile();
  if (profile?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { key } = await params;
  if (!VALID_KEYS.includes(key as SitePageKey)) {
    notFound();
  }

  const page = await getSitePage(key as SitePageKey);

  return (
    <PageEditor
      keyType={key as SitePageKey}
      initialContent={page.body ?? ""}
      initialTitle={page.title}
    />
  );
}
