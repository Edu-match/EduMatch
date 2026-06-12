import { redirect } from "next/navigation";
import { getCurrentUserRole } from "@/app/_actions/user";
import { InteropAdminTabs } from "@/components/interop/interop-admin-tabs";
import { InteropBackdrop } from "@/components/interop/interop-backdrop";

export const dynamic = "force-dynamic";

export default async function AdminInteropPage() {
  const role = await getCurrentUserRole();
  if (role !== "ADMIN") {
    redirect("/dashboard");
  }

  // 特設と同じ管理要素（マップ管理・モデレーション・サイト設定）をエデュマッチ管理側に移行。
  // コンポーネントは暗色背景前提（白文字）のため、ダーク背景で包んで視認性を確保する。
  return (
    <main className="relative min-h-[calc(100dvh-3rem)] w-full text-white">
      <InteropBackdrop themeMode="auto" />
      <div className="relative z-10 container max-w-3xl py-8">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-white">井戸端会議 管理</h1>
          <p className="mt-1 text-sm text-white/55">
            マップ配置・投稿モデレーション・サイト設定を管理します。
          </p>
        </div>
        <InteropAdminTabs />
      </div>
    </main>
  );
}
