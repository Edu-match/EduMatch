import { requireAuth, getCurrentProfile } from "@/lib/auth";
import { ProviderDashboard } from "@/components/dashboard/provider-dashboard";
import { redirect } from "next/navigation";

export default async function ProviderDashboardPage() {
  const user = await requireAuth();
  const profile = await getCurrentProfile();
  
  // 投稿者以外はマイページにリダイレクト
  if (profile?.role !== "PROVIDER") {
    redirect("/dashboard");
  }

  const displayName = profile?.name ?? user.email?.split("@")[0] ?? "ユーザー";

  return <ProviderDashboard displayName={displayName} />;
}
