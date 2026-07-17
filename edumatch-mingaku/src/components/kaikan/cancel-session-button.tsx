"use client";

import { useFormStatus } from "react-dom";
import { Loader2, XCircle } from "lucide-react";
import { cancelKaikanApplication } from "@/app/_actions/kaikan";

function SubmitButton({ title }: { title: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      title={`「${title}」の申込をキャンセル`}
      className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] font-bold text-muted-foreground transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
    >
      {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
      キャンセル
    </button>
  );
}

/** チケットページ用：本人の申込（受付前）をキャンセルするボタン。確認ダイアログ付き。 */
export function CancelSessionButton({ id, ticketToken, title }: { id: string; ticketToken: string; title: string }) {
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
      <SubmitButton title={title} />
    </form>
  );
}
