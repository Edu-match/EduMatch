import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth";
import { InteropAdminGate } from "@/components/interop/interop-admin-gate";
import { InteropAdminTabs } from "@/components/interop/interop-admin-tabs";
import { InteropBackdrop } from "@/components/interop/interop-backdrop";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "管理画面 | 教育AIサミット",
  robots: { index: false, follow: false },
};

export default async function InteropAdminPage() {
  const user = await getCurrentUser();
  if (!user) {
    return <InteropAdminGate />;
  }
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "ADMIN") {
    return <InteropAdminGate notAdmin />;
  }

  return (
    <main className="relative min-h-[100dvh] w-full text-white">
      <InteropBackdrop themeMode="auto" />

      <div className="relative z-10 border-b border-white/10 bg-white/[0.05] backdrop-blur-sm">
        <div className="container flex max-w-3xl items-center justify-between py-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-white/55 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> 特設サイトを開く
          </Link>
          <span className="text-xs text-white/40">{profile.email}</span>
        </div>
      </div>

      <div className="relative z-10 container max-w-3xl py-8">
        <InteropAdminTabs />
      </div>
    </main>
  );
}
