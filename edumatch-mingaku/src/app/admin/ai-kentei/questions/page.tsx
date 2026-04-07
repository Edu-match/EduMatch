import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth, getCurrentProfile } from "@/lib/auth";
import { AiKenteiQuestionsManager } from "@/components/admin/ai-kentei-questions-manager";

async function ensureAdmin() {
  await requireAuth();
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "ADMIN") {
    redirect("/mypage");
  }
}

export default async function AdminAiKenteiQuestionsPage() {
  await ensureAdmin();

  return (
    <div className="container py-8">
      <div className="mb-6">
        <p className="text-sm text-muted-foreground mb-1">
          <Link href="/ai-kentei" className="hover:underline text-primary">
            AI検定トップ
          </Link>
          {" · "}
          <span>問題管理</span>
        </p>
        <h1 className="text-2xl font-bold tracking-tight">AI検定 · 問題管理</h1>
      </div>
      <AiKenteiQuestionsManager />
    </div>
  );
}
