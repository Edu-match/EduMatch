import { revalidatePath } from "next/cache";
import { requireProvider } from "@/lib/auth";
import { ProviderDashboard } from "@/components/dashboard/provider-dashboard";
import {
  getPendingPosts,
  getPendingServices,
  approvePost,
  rejectPost,
  approveService,
  rejectService,
  type PostWithProvider,
  type ServiceWithProvider,
} from "@/app/_actions";

export default async function ProviderDashboardPage() {
  const { user, profile } = await requireProvider();

  const displayName = profile?.name ?? user.email?.split("@")[0] ?? "ユーザー";
  const isAdmin = profile?.role === "ADMIN";

  const [pendingPosts, pendingServices]: [PostWithProvider[], ServiceWithProvider[]] = isAdmin
    ? await Promise.all([getPendingPosts(), getPendingServices()])
    : [[], []];

  async function approvePostAction(formData: FormData) {
    "use server";
    const id = String(formData.get("id") || "");
    if (!id) return;
    await approvePost(id);
    revalidatePath("/provider-dashboard");
    revalidatePath("/admin/approvals");
    revalidatePath("/");
  }

  async function rejectPostAction(formData: FormData) {
    "use server";
    const id = String(formData.get("id") || "");
    const reason = String(formData.get("reason") || "").trim();
    if (!id) return;
    await rejectPost(id, reason || undefined);
    revalidatePath("/provider-dashboard");
    revalidatePath("/admin/approvals");
    revalidatePath("/");
  }

  async function approveServiceAction(formData: FormData) {
    "use server";
    const id = String(formData.get("id") || "");
    if (!id) return;
    await approveService(id);
    revalidatePath("/provider-dashboard");
    revalidatePath("/admin/approvals");
    revalidatePath("/");
  }

  async function rejectServiceAction(formData: FormData) {
    "use server";
    const id = String(formData.get("id") || "");
    const reason = String(formData.get("reason") || "").trim();
    if (!id) return;
    await rejectService(id, reason || undefined);
    revalidatePath("/provider-dashboard");
    revalidatePath("/admin/approvals");
    revalidatePath("/");
  }

  return (
    <ProviderDashboard
      displayName={displayName}
      isAdmin={isAdmin}
      pendingPosts={pendingPosts}
      pendingServices={pendingServices}
      approvePostAction={approvePostAction}
      rejectPostAction={rejectPostAction}
      approveServiceAction={approveServiceAction}
      rejectServiceAction={rejectServiceAction}
    />
  );
}
