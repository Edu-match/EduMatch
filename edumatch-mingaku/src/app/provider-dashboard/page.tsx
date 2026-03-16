import { revalidatePath } from "next/cache";
import { requireProvider } from "@/lib/auth";
import { ProviderDashboard } from "@/components/dashboard/provider-dashboard";
import {
  approvePost,
  rejectPost,
  approveService,
  rejectService,
} from "@/app/_actions";
import {
  getPendingPostsFromSupabase,
  getPendingServicesFromSupabase,
} from "@/lib/supabase-pending-approvals";

const MAX_PENDING_DISPLAY = 10; // 投稿者ダッシュボードの承認待ち最大表示数

export default async function ProviderDashboardPage() {
  const { user, profile } = await requireProvider();

  const displayName = profile?.name ?? user.email?.split("@")[0] ?? "ユーザー";
  const isAdmin = profile?.role === "ADMIN";

  let pendingPosts: Awaited<ReturnType<typeof getPendingPostsFromSupabase>> = [];
  let pendingServices: Awaited<ReturnType<typeof getPendingServicesFromSupabase>> = [];
  if (isAdmin) {
    try {
      const [posts, services] = await Promise.all([
        getPendingPostsFromSupabase(),
        getPendingServicesFromSupabase(),
      ]);
      const total = posts.length + services.length;
      if (total <= MAX_PENDING_DISPLAY) {
        pendingPosts = posts;
        pendingServices = services;
      } else {
        const postCount = Math.min(posts.length, MAX_PENDING_DISPLAY);
        pendingPosts = posts.slice(0, postCount);
        pendingServices = services.slice(0, MAX_PENDING_DISPLAY - postCount);
      }
    } catch (e) {
      console.error("[provider-dashboard] Failed to fetch pending approvals:", e);
      // Supabase 未設定時などは空で継続
    }
  }

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
