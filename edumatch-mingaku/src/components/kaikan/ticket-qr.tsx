"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { receiptNumberDisplay } from "@/lib/kaikan-receipt";

/** 受付チェックイン用QR。当日受付タブ(token付き)を開くURLをエンコード。 */
export function TicketQR({ token }: { token: string }) {
  const [url, setUrl] = useState(`/admin/kaikan?tab=checkin&token=${token}`);
  useEffect(() => {
    setUrl(`${window.location.origin}/admin/kaikan?tab=checkin&token=${token}`);
  }, [token]);
  return (
    <div className="inline-flex flex-col items-center gap-2 rounded-2xl bg-white p-4 shadow-sm">
      <QRCodeSVG value={url} size={200} level="M" includeMargin />
      <p className="text-[10px] tracking-widest text-neutral-400">{receiptNumberDisplay(token)}</p>
    </div>
  );
}
