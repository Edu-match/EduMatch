"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** チケットを印刷する（印刷時はチケットカードのみ表示）。 */
export function TicketPrintButton() {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => window.print()}
      className="ticket-no-print"
    >
      <Printer className="h-3.5 w-3.5" /> このチケットを印刷
    </Button>
  );
}
