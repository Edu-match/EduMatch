import { requireProvider } from "@/lib/auth";
import { ProviderDashboard } from "@/components/dashboard/provider-dashboard";

export default async function ProviderDashboardPage() {
  const { user, profile } = await requireProvider();

  const displayName = profile?.name ?? user.email?.split("@")[0] ?? "ユーザー";

  return <ProviderDashboard displayName={displayName} />;
}
