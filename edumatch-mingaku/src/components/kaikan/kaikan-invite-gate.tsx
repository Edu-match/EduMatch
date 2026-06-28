"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, Ticket, ExternalLink, ChevronRight } from "lucide-react";
import { redeemInviteCode } from "@/app/_actions/kaikan";

/** Peatix全体申込URL（管理側で確定したら差し替え）。 */
const PEATIX_URL = "https://peatix.com/";

/**
 * 招待コード入力ゲート。Peatixで全体申込→届いたコードを入力すると、
 * コンテンツの電子チケット申込が解放される。
 */
export function KaikanInviteGate() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.set("code", code);
    const res = await redeemInviteCode(fd);
    setLoading(false);
    if (res.ok) {
      router.refresh();
    } else {
      setError(res.error ?? "認証に失敗しました");
    }
  }

  return (
    <div className="space-y-5">
      {/* 申込の流れ・注意書き */}
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
        <p className="flex items-center gap-2 text-sm font-bold text-amber-900">
          <Ticket className="h-4 w-4 shrink-0" /> お申込みには招待コードが必要です
        </p>
        <ol className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-amber-900/90">
          <li>1. まず教育AIサミット全体（Peatix）へお申込みください。</li>
          <li>2. 後日お送りするメールに記載の<strong>招待コード</strong>を、下のフォームに入力します。</li>
          <li>3. 認証後、各コンテンツの電子チケットを申し込めます。</li>
        </ol>
        <a
          href={PEATIX_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-amber-600"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Peatixで全体に申し込む
        </a>
      </div>

      {/* コード入力 */}
      <form onSubmit={submit} className="rounded-2xl border bg-card p-5">
        <label className="flex items-center gap-2 text-sm font-bold">
          <KeyRound className="h-4 w-4 text-primary" /> 招待コードを入力
        </label>
        <p className="mt-1 text-[11px] text-muted-foreground">メールに記載のコード（例: ABCD-2F7K）を入力してください。</p>
        <div className="mt-3 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="ABCD-2F7K"
            autoCapitalize="characters"
            className="flex-1 rounded-md border border-input px-3 py-2.5 text-sm tracking-widest uppercase placeholder:tracking-normal placeholder:normal-case"
          />
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />} 認証
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </form>
    </div>
  );
}
