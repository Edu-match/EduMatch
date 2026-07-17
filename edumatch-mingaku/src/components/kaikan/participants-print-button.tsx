"use client";

import { Printer } from "lucide-react";

/** 参加者一覧をPDF保存/印刷する（ブラウザの印刷ダイアログを開く）。 */
export function ParticipantsPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90"
    >
      <Printer className="h-4 w-4" /> PDF保存 / 印刷
    </button>
  );
}
