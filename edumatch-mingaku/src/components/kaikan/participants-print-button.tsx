"use client";

import { Printer } from "lucide-react";

/** 参加者一覧をPDF保存/印刷する（ブラウザの印刷ダイアログを開く）。 */
export function ParticipantsPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-[color,background-color,box-shadow,transform] duration-150 hover:bg-primary-hover hover:shadow-md active:scale-[0.98] active:shadow-sm pointer-coarse:min-h-11"
    >
      <Printer className="h-4 w-4" /> PDF保存 / 印刷
    </button>
  );
}
