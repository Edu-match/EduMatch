"use client";

import { Printer } from "lucide-react";

/** チケットを印刷する（印刷時はチケットカードのみ表示）。 */
export function TicketPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="ticket-no-print inline-flex items-center gap-1.5 rounded-full border border-input bg-background px-4 py-2 text-xs font-bold text-foreground transition hover:bg-muted"
    >
      <Printer className="h-3.5 w-3.5" /> このチケットを印刷
    </button>
  );
}
