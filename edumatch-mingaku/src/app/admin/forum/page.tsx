import { redirect } from "next/navigation";
import { getCurrentUserRole } from "@/app/_actions/user";
import { InteropBackdrop } from "@/components/interop/interop-backdrop";
import { AdminForumClient } from "./admin-forum-client";

export default async function AdminForumPage() {
  const role = await getCurrentUserRole();
  if (role !== "ADMIN") {
    redirect("/dashboard");
  }

  // 井戸端と同じ「透明感＋時間帯背景」。dark スコープで shadcn を暗色化し、
  // カード類は半透明ガラス(bg-white/[0.06]+blur)に上書きして背景を透かす。
  return (
    <div
      className="dark relative min-h-screen text-white [&_[class*='bg-card']]:border-white/10 [&_[class*='bg-card']]:bg-white/[0.06] [&_[class*='bg-card']]:backdrop-blur-sm"
    >
      <InteropBackdrop themeMode="auto" showCityscape={false} />
      <div className="relative z-10">
        <AdminForumClient />
      </div>
    </div>
  );
}
