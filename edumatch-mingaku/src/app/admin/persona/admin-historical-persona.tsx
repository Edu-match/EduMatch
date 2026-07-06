"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Loader2, Sparkles, ShieldCheck, ShieldAlert, ShieldX, Trash2,
  ChevronDown, AlertTriangle, User, FileText, Pencil, Check, X, ToggleLeft, ToggleRight,
} from "lucide-react";
import {
  createSpecialPersona,
  setSpecialPersonaActive,
  deleteSpecialPersona,
  updateSpecialPersonaPrompt,
  type SpecialPersonaResult,
} from "@/app/_actions/persona-admin";

export type SpecialPersonaRow = {
  id: string;
  name: string;
  expertise: string[];
  avatarUrl: string | null;
  legalStatus: string;
  legalNote: string;
  isActive: boolean;
  personaPrompt: string;
};

function LegalBadge({ status }: { status: string }) {
  if (status === "blocked")
    return <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700"><ShieldX className="h-3 w-3" />要見送り</span>;
  if (status === "caution")
    return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800"><ShieldAlert className="h-3 w-3" />要注意</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700"><ShieldCheck className="h-3 w-3" />OK</span>;
}

function PromptEditor({ personaId, initialPrompt }: { personaId: string; initialPrompt: string }) {
  const [editing, setEditing] = useState(false);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const IMMUTABLE_HEADER = "【以下はシステム固定（編集不可）】\n返信ルール: 教育コミュニティにふさわしい建設的な発言をする。断定・説教・宣伝・政治的に偏った発言は避ける。AIだと名乗らない。";

  const save = useCallback(async () => {
    setSaving(true);
    const res = await updateSpecialPersonaPrompt(personaId, prompt);
    setSaving(false);
    if (res.ok) setEditing(false);
  }, [personaId, prompt]);

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <FileText className="h-3 w-3" />
        システムプロンプト
        <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="mt-1.5 space-y-1.5">
          {/* 編集不可部分 */}
          <div className="rounded-md bg-muted/50 px-2.5 py-2 text-[11px] text-muted-foreground leading-relaxed border border-dashed border-muted-foreground/20">
            <p className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1">固定ルール（編集不可）</p>
            {IMMUTABLE_HEADER.split("\n").map((line, i) => <p key={i}>{line}</p>)}
          </div>

          {/* 編集可能部分 */}
          {editing ? (
            <div className="space-y-1.5">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={6}
                maxLength={2000}
                className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-xs leading-relaxed focus:ring-2 focus:ring-primary/30"
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">{prompt.length}/2000</span>
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => { setPrompt(initialPrompt); setEditing(false); }} className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-medium hover:bg-muted">
                    <X className="h-3 w-3" /> キャンセル
                  </button>
                  <button type="button" onClick={save} disabled={saving || !prompt.trim()} className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} 保存
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="group relative rounded-md border bg-background px-2.5 py-2 text-xs leading-relaxed text-foreground/80">
              <p className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1">ペルソナプロンプト（編集可能）</p>
              <p className="whitespace-pre-wrap">{initialPrompt || "（未設定）"}</p>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
                aria-label="編集"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AdminHistoricalPersona({ existing }: { existing: SpecialPersonaRow[] }) {
  const router = useRouter();
  const [inputType, setInputType] = useState<"person" | "freeform">("person");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SpecialPersonaResult | null>(null);
  const [permission, setPermission] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function create(permissionConfirmed = false) {
    if (!input.trim()) return;
    setLoading(true);
    setResult(null);
    const res = await createSpecialPersona(input.trim(), inputType, permissionConfirmed);
    setResult(res);
    setLoading(false);
    if (res.ok) {
      setInput("");
      setPermission(false);
      router.refresh();
    }
  }

  async function toggleActive(id: string, currentActive: boolean) {
    setTogglingId(id);
    await setSpecialPersonaActive(id, !currentActive);
    setTogglingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-background p-4">
        <p className="flex items-center gap-2 text-sm font-bold"><Sparkles className="h-4 w-4 text-primary" /> 特別AIペルソナを作成</p>
        <p className="mt-1 text-xs text-muted-foreground">
          人物名の入力、または自由記述でAIペルソナを作成できます。実在人物の場合は著作権・肖像権等の法的チェックを自動で行います。
        </p>

        {/* 入力モード切替 */}
        <div className="mt-3 inline-flex rounded-lg border bg-muted/40 p-0.5 text-xs font-medium">
          <button type="button" onClick={() => setInputType("person")} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition ${inputType === "person" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
            <User className="h-3 w-3" /> 人物名で作成
          </button>
          <button type="button" onClick={() => setInputType("freeform")} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition ${inputType === "freeform" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
            <FileText className="h-3 w-3" /> 自由記述で作成
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {inputType === "person" ? (
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
              placeholder="例：吉田松陰、福沢諭吉"
              className="min-w-0 flex-1 rounded-md border border-input px-3 py-2 text-sm"
            />
          ) : (
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="例：教育改革に情熱を持つ架空の校長先生。生徒の自主性を重んじ、「失敗は学びの始まり」が口癖。穏やかだが芯が強い。"
              rows={3}
              className="min-w-0 flex-1 rounded-md border border-input px-3 py-2 text-sm leading-relaxed"
            />
          )}
          <button type="button" onClick={() => create(false)} disabled={loading || !input.trim()} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {inputType === "person" ? "法的チェック＆生成" : "生成"}
          </button>
        </div>

        <p className="mt-2 text-[11px] text-muted-foreground">
          ※ 名称は自動的に「AI○○」形式になります。{inputType === "person" && "存命の人物は原則作成できません。本人・権利者の許可がある場合のみ、下の手順から作成してください。"}
        </p>

        {/* 許可取得済みオーバーライド */}
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
          <label className="flex cursor-pointer items-start gap-2 text-xs">
            <input type="checkbox" checked={permission} onChange={(e) => setPermission(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-amber-600" />
            <span className="font-bold text-amber-900">許可を取得済み（存命者・権利が残る人物・著作権保護キャラクターでも、権利者から作成・公開の許可を得ています）</span>
          </label>

          {permission && (
            <details className="mt-2 rounded-md border border-amber-300 bg-background">
              <summary className="flex cursor-pointer select-none items-center justify-between gap-2 px-3 py-2 text-xs font-bold text-amber-900">
                <span className="flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> 本当に作成してよいか確認する</span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0" />
              </summary>
              <div className="space-y-2 border-t border-amber-200 px-3 py-2.5">
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  許可の取得状況・公開範囲・苦情時の取り下げ対応について、あなた（管理者）の責任で確認済みであることを前提に作成します。法的チェックで見送り推奨と判定されても、この操作で作成を続行します。記録として「許可取得済みとして作成」が残ります。
                </p>
                <button type="button" onClick={() => create(true)} disabled={loading || !input.trim()} className="inline-flex items-center justify-center gap-1.5 rounded-md bg-amber-600 px-4 py-2 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50">
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
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  {result.persona.avatarUrl && (
                    <Image src={result.persona.avatarUrl} alt="" width={56} height={56} className="h-14 w-14 rounded-full object-cover" unoptimized />
                  )}
                  <div className="text-xs">
                    <p className="text-sm font-bold">{result.persona.name} を作成しました</p>
                    {result.persona.expertise.length > 0 && <p className="text-muted-foreground">得意分野: {result.persona.expertise.join("、")}</p>}
                  </div>
                </div>
                {/* 生成後のシステムプロンプト表示 */}
                <PromptEditor personaId={result.persona.id} initialPrompt={result.persona.personaPrompt} />
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
          <ul className="space-y-3">
            {existing.map((p) => (
              <li key={p.id} className="rounded-xl border bg-card p-3">
                <div className="flex items-center gap-3">
                  {p.avatarUrl ? (
                    <Image src={p.avatarUrl} alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-full object-cover" unoptimized />
                  ) : (
                    <div className="h-11 w-11 shrink-0 rounded-full bg-muted" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-bold">{p.name} <LegalBadge status={p.legalStatus} /></p>
                    {p.expertise.length > 0 && <p className="truncate text-[11px] text-muted-foreground">{p.expertise.join("、")}</p>}
                  </div>

                  {/* 有効/無効トグル（改善版） */}
                  <button
                    type="button"
                    onClick={() => toggleActive(p.id, p.isActive)}
                    disabled={togglingId === p.id}
                    className={`relative inline-flex h-7 w-[4.5rem] shrink-0 items-center rounded-full border-2 px-0.5 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                      p.isActive
                        ? "border-emerald-500 bg-emerald-500"
                        : "border-muted-foreground/30 bg-muted"
                    }`}
                    aria-label={p.isActive ? "無効にする" : "有効にする"}
                  >
                    <span className={`absolute text-[10px] font-bold transition-opacity ${p.isActive ? "left-2 text-white opacity-100" : "left-2 opacity-0"}`}>有効</span>
                    <span className={`absolute text-[10px] font-bold transition-opacity ${!p.isActive ? "right-2 text-muted-foreground opacity-100" : "right-2 opacity-0"}`}>無効</span>
                    <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${p.isActive ? "translate-x-[2.75rem]" : "translate-x-0"}`}>
                      {togglingId === p.id && <Loader2 className="h-5 w-5 animate-spin p-0.5 text-muted-foreground" />}
                    </span>
                  </button>

                  <button type="button" onClick={async () => { if (confirm(`「${p.name}」を削除しますか？`)) { await deleteSpecialPersona(p.id); router.refresh(); } }} aria-label="削除" className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-rose-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* システムプロンプト表示・編集 */}
                <PromptEditor personaId={p.id} initialPrompt={p.personaPrompt} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
