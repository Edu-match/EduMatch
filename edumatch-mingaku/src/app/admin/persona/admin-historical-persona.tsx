"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2, Scale, Sparkles, ShieldCheck, ShieldAlert, ShieldX, Trash2, ChevronDown, AlertTriangle } from "lucide-react";
import { createHistoricalPersona, setSpecialPersonaActive, deleteSpecialPersona, type HistoricalPersonaResult } from "@/app/_actions/persona-admin";

export type SpecialPersonaRow = {
  id: string;
  name: string;
  expertise: string[];
  avatarUrl: string | null;
  legalStatus: string;
  legalNote: string;
  isActive: boolean;
};

function LegalBadge({ status }: { status: string }) {
  if (status === "blocked")
    return <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700"><ShieldX className="h-3 w-3" />要見送り</span>;
  if (status === "caution")
    return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800"><ShieldAlert className="h-3 w-3" />要注意</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700"><ShieldCheck className="h-3 w-3" />OK</span>;
}

export function AdminHistoricalPersona({ existing }: { existing: SpecialPersonaRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HistoricalPersonaResult | null>(null);
  const [permission, setPermission] = useState(false);

  async function create(permissionConfirmed = false) {
    if (!name.trim()) return;
    setLoading(true);
    setResult(null);
    const res = await createHistoricalPersona(name.trim(), permissionConfirmed);
    setResult(res);
    setLoading(false);
    if (res.ok) {
      setName("");
      setPermission(false);
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-background p-4">
        <p className="flex items-center gap-2 text-sm font-bold"><Scale className="h-4 w-4 text-primary" /> 人物名から作成（法的チェック付き）</p>
        <p className="mt-1 text-xs text-muted-foreground">
          ネット検索で人物像を調べ、AIが著作権・肖像権等を点検したうえでペルソナとオリジナルイラストを生成します。
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
            placeholder="例：吉田松陰"
            className="min-w-0 flex-1 rounded-md border border-input px-3 py-2 text-sm"
          />
          <button type="button" onClick={() => create(false)} disabled={loading || !name.trim()} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} 法的チェック＆生成
          </button>
        </div>

        <p className="mt-2 text-[11px] text-muted-foreground">
          存命の人物は原則作成できません。本人・権利者の許可がある場合のみ、下の手順から作成してください。
        </p>

        {/* 許可取得済みオーバーライド：チェック→確認プルダウン→作成 */}
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
          <label className="flex cursor-pointer items-start gap-2 text-xs">
            <input type="checkbox" checked={permission} onChange={(e) => setPermission(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-amber-600" />
            <span className="font-bold text-amber-900">許可を取得済み（存命・権利が残る人物でも、本人または権利者から作成・公開の許可を得ています）</span>
          </label>

          {permission && (
            <details className="mt-2 rounded-md border border-amber-300 bg-background">
              <summary className="flex cursor-pointer select-none items-center justify-between gap-2 px-3 py-2 text-xs font-bold text-amber-900">
                <span className="flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> 本当に作成してよいか確認する</span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0" />
              </summary>
              <div className="space-y-2 border-t border-amber-200 px-3 py-2.5">
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  許可の取得状況・公開範囲・苦情時の取り下げ対応について、あなた（管理者）の責任で確認済みであることを前提に作成します。法的チェックで見送り推奨（存命含む）と判定されても、この操作で作成を続行します。記録として「許可取得済みとして作成」が残ります。
                </p>
                <button type="button" onClick={() => create(true)} disabled={loading || !name.trim()} className="inline-flex items-center justify-center gap-1.5 rounded-md bg-amber-600 px-4 py-2 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50">
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />} 許可確認済みとして作成
                </button>
              </div>
            </details>
          )}
        </div>

        {loading && <p className="mt-2 text-xs text-muted-foreground">調査・チェック・生成中です（30〜60秒ほどかかります）…</p>}

        {result && (
          <div className="mt-3 space-y-2 rounded-lg border bg-muted/20 p-3">
            {result.legal && (
              <div className="flex items-start gap-2">
                <LegalBadge status={result.legal.status} />
                <p className="text-xs text-muted-foreground">{result.legal.note}</p>
              </div>
            )}
            {result.error && <p className="text-sm text-red-600">{result.error}</p>}
            {result.ok && result.persona && (
              <div className="flex items-center gap-3">
                {result.persona.avatarUrl && (
                  <Image src={result.persona.avatarUrl} alt="" width={56} height={56} className="h-14 w-14 rounded-full object-cover" unoptimized />
                )}
                <div className="text-xs">
                  <p className="text-sm font-bold">{result.persona.name} を作成しました</p>
                  {result.persona.expertise.length > 0 && <p className="text-muted-foreground">得意分野: {result.persona.expertise.join("、")}</p>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 作成済み一覧 */}
      <div className="rounded-xl border bg-background p-4">
        <p className="mb-3 text-sm font-bold">作成済みの特別ペルソナ（{existing.length}）</p>
        {existing.length === 0 ? (
          <p className="text-sm text-muted-foreground">まだありません。</p>
        ) : (
          <ul className="space-y-2">
            {existing.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                {p.avatarUrl ? (
                  <Image src={p.avatarUrl} alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-full object-cover" unoptimized />
                ) : (
                  <div className="h-11 w-11 shrink-0 rounded-full bg-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-bold">{p.name} <LegalBadge status={p.legalStatus} /></p>
                  {p.expertise.length > 0 && <p className="truncate text-[11px] text-muted-foreground">{p.expertise.join("、")}</p>}
                </div>
                <button type="button" onClick={async () => { await setSpecialPersonaActive(p.id, !p.isActive); router.refresh(); }} className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${p.isActive ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                  {p.isActive ? "有効" : "無効"}
                </button>
                <button type="button" onClick={async () => { if (confirm(`「${p.name}」を削除しますか？`)) { await deleteSpecialPersona(p.id); router.refresh(); } }} aria-label="削除" className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-rose-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
