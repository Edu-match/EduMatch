"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

/**
 * 戻るボタン。href 指定時はそこへ遷移する（OAuthログイン等を経た直後に
 * router.back() でGoogleログイン画面へ戻ってしまう問題を回避）。未指定時のみ履歴で戻る。
 */
export function KaikanBackButton({ label = "戻る", href }: { label?: string; href?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (href ? router.push(href) : router.back())}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
    >
      <ChevronLeft className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
