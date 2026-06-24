"use client";

import { useEffect } from "react";
import { X, QrCode } from "lucide-react";
import { KaikanCheckinPanel } from "./kaikan-checkin-panel";

/**
 * 電子チケットの当日受付（QR読み取り）をポップアップで表示するモーダル。
 * 左メニュー・アカウントプルダウンの「電子チケット読み取り」から開く。
 */
export function KaikanCheckinModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  // 背景スクロール固定＋Escで閉じる
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="電子チケット読み取り"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-background p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <QrCode className="h-5 w-5 text-primary" /> 電子チケット読み取り
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="rounded-full p-1.5 text-muted-foreground transition hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <KaikanCheckinPanel />
      </div>
    </div>
  );
}
