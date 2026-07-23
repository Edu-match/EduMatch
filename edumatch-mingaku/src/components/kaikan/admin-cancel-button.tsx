"use client";

import { useFormStatus } from "react-dom";
import { Loader2, XCircle } from "lucide-react";
import { adminCancelKaikanApplication } from "@/app/_actions/kaikan";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-md border border-red-300 px-4 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
      キャンセル
    </button>
  );
}

/** 管理者：参加者の申込を手動キャンセル。押下時に確認ポップアップを表示する。 */
export function AdminCancelButton({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={adminCancelKaikanApplication}
      className="inline-flex"
      onSubmit={(e) => {
        if (!window.confirm(`「${name}」さんのこの申込をキャンセルしますか？\nキャンセル後も「キャンセルを取り消す」で戻せます。`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Submit />
    </form>
  );
}
