"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

/** 受付チェックイン用QR。トークンから受付URLを生成して表示する。 */
export function TicketQR({ token }: { token: string }) {
  const [url, setUrl] = useState(`/admin/kaikan/checkin/${token}`);
  useEffect(() => {
    // 受付端末で読み取ったときに絶対URLで開けるよう origin を付与
    setUrl(`${window.location.origin}/admin/kaikan/checkin/${token}`);
  }, [token]);
  return (
    <div className="inline-flex flex-col items-center gap-2 rounded-2xl bg-white p-4 shadow-sm">
      <QRCodeSVG value={url} size={200} level="M" includeMargin />
      <p className="text-[10px] tracking-widest text-neutral-400">{token.slice(0, 8).toUpperCase()}</p>
    </div>
  );
}
