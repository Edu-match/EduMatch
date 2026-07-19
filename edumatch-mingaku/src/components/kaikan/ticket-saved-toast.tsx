"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/** 申込直後（?applied=1）に「保存しました」ポップアップを表示する。 */
export function TicketSavedToast({ show }: { show: boolean }) {
  const [open, setOpen] = useState(show);
  const router = useRouter();
  const pathname = usePathname();

  const close = () => {
    setOpen(false);
    // リロードで再表示しないよう applied 等のクエリを外す
    router.replace(pathname);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="max-w-xs text-center">
        <DialogTitle className="sr-only">保存しました</DialogTitle>
        <div className="flex flex-col items-center gap-3 py-2">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </span>
          <p className="text-lg font-bold">保存しました</p>
          <p className="text-sm text-muted-foreground">
            電子チケットを発行しました。<br />当日はこの画面（QR・受付番号）を受付で提示してください。
          </p>
          <Button onClick={close} className="mt-1 w-full">OK</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
