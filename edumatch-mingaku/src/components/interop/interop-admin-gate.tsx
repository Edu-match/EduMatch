"use client";

import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";

/** 特設サイトの管理者ログイン画面。エデュマッチと同じアカウントでログインする。 */
export function InteropAdminGate({ notAdmin = false }: { notAdmin?: boolean }) {
  const redirectTo =
    typeof window !== "undefined" ? window.location.pathname : "/interop/admin";

  return (
    <main className="relative min-h-[100dvh] w-full bg-[#070a1c] text-white">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center px-4 py-12">
        <Link
          href="/interop"
          className="mb-6 inline-flex w-fit items-center gap-1.5 text-xs font-bold text-white/60 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> 特設サイトに戻る
        </Link>

        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">教育AIサミット 管理画面</h1>
          <p className="mt-1.5 text-sm text-white/55">
            エデュマッチと同じアカウントでログインしてください。
          </p>
        </div>

        {notAdmin && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            このアカウントには管理者権限がありません。別のアカウントでログインしてください。
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 [color-scheme:dark]">
          <LoginForm redirectTo={redirectTo} />
        </div>
      </div>
    </main>
  );
}
