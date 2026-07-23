"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, ArrowRight } from "lucide-react";
import { redeemInviteCode } from "@/app/_actions/kaikan";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
        お申し込みには招待コードが必要です。<br />ご案内メールに記載のコードを入力してください。
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
        <Input
          name="code"
          required
          autoComplete="off"
          aria-label="招待コード"
          placeholder="例：ABCD2345"
          className="flex-1 text-center font-mono text-base font-bold tracking-widest uppercase"
        />
        <Button type="submit" disabled={pending} className="shrink-0">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          進む
        </Button>
      </form>
      {error && <p role="alert" className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{error}</p>}
    </div>
  );
}
