"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

/** ブラウザ履歴で1つ戻る（ハブ/ポップアップ等、遷移元が可変なため）。 */
export function KaikanBackButton({ label = "戻る" }: { label?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
    >
      <ChevronLeft className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
