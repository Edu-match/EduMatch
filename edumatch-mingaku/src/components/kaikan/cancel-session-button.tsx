"use client";

import { useFormStatus } from "react-dom";
import { Loader2, XCircle } from "lucide-react";
import { cancelKaikanApplication } from "@/app/_actions/kaikan";

function SubmitButton({ title, label = "キャンセル" }: { title: string; label?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      title={`「${title}」の申込をキャンセル`}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-bold text-muted-foreground outline-none transition-[color,background-color,border-color,box-shadow] duration-150 hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50 pointer-coarse:min-h-11"
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}

/** 本人の申込（受付前）をキャンセルするボタン。確認ダイアログ付き。label で文言変更可。 */
export function CancelSessionButton({ id, ticketToken, title, label }: { id: string; ticketToken: string; title: string; label?: string }) {
  return (
    <form
      action={cancelKaikanApplication}
      onSubmit={(e) => {
        if (!window.confirm(`「${title}」の申込をキャンセルしますか？\nキャンセル後、空きがあれば再度申込できます。`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="ticketToken" value={ticketToken} />
      <SubmitButton title={title} label={label} />
    </form>
  );
}
