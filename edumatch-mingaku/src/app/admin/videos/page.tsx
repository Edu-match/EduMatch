import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentProfile } from "@/lib/auth";
import { AdminVideosClient } from "@/components/admin/admin-videos-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "動画を管理 | エデュマッチ",
};

export default async function AdminVideosPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "ADMIN") {
    redirect("/");
  }
  return <AdminVideosClient />;
}
