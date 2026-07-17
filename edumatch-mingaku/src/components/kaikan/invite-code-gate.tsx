"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, ArrowRight } from "lucide-react";
import { redeemInviteCode } from "@/app/_actions/kaikan";

/**
 * 申込前の招待コード入力ゲート（共通コード方式）。
 * 入力に成功するとページを再取得し、コンテンツ選択が表示される。
 */
export function InviteCodeGate() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="mx-auto max-w-md rounded-2xl border bg-card p-6 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10">
        <KeyRound className="h-6 w-6 text-primary" />
      </span>
      <h2 className="mt-3 text-lg font-bold">招待コードを入力</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        お申込みには招待コードが必要です。<br />ご案内メールに記載のコードを入力してください。
      </p>
      <form
        action={(fd) =>
          startTransition(async () => {
            setError(null);
            const r = await redeemInviteCode(fd);
            if (!r.ok) setError(r.error ?? "コードを確認できませんでした");
            else router.refresh();
          })
        }
        className="mt-4 flex gap-2"
      >
        <input
          name="code"
          required
          autoComplete="off"
          placeholder="例: ABCD2345"
          className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2.5 text-center font-mono text-base font-bold tracking-widest uppercase"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          進む
        </button>
      </form>
      {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
    </div>
  );
}
