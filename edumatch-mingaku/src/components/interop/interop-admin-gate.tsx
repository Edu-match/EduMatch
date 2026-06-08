"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Lock, Mail, ShieldAlert } from "lucide-react";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";

/** 特設サイトの管理者ログイン画面。エデュマッチと同じSupabaseアカウントでログインしADMINのみ入場。 */
export function InteropAdminGate({ notAdmin = false }: { notAdmin?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError("メールアドレスまたはパスワードが正しくありません。");
        setSubmitting(false);
        return;
      }
      // ログイン成功 → サーバー側で権限判定するためリロード
      window.location.reload();
    } catch {
      setError("ログインに失敗しました。時間をおいて再度お試しください。");
      setSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-[100dvh] w-full bg-[#070a1c] text-white">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col justify-center px-5 py-12">
        <Link
          href="/"
          className="mb-8 inline-flex w-fit items-center gap-1.5 text-xs font-bold text-white/55 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> 特設サイトに戻る
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold">管理画面ログイン</h1>
          <p className="mt-1.5 text-sm text-white/55">
            エデュマッチと同じアカウントでログインしてください。
          </p>
        </div>

        {notAdmin && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            このアカウントには管理者権限がありません。
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-white/65">メールアドレス</span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                placeholder="you@example.com"
                className="w-full rounded-xl border border-white/12 bg-white/[0.04] py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-white/65">パスワード</span>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/12 bg-white/[0.04] py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none"
              />
            </div>
          </label>

          {error && <p className="text-sm text-rose-300">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-400 to-violet-500 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition hover:brightness-110 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            ログイン
          </button>
        </form>
      </div>
    </main>
  );
}
