"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2, Scale, Sparkles, ShieldCheck, ShieldAlert, ShieldX, Trash2, ChevronDown, AlertTriangle, Save } from "lucide-react";
import { createSpecialPersona, setSpecialPersonaActive, deleteSpecialPersona, updateSpecialPersonaPrompt, type HistoricalPersonaResult } from "@/app/_actions/persona-admin";

/** 編集不可プレフィックス（システムプロンプトの先頭に付与） */
const PROMPT_PREFIX = `【編集不可】このAIペルソナは教育コミュニティ「教育のひろば」で発言します。断定・説教・宣伝・政治的発言は避け、建設的に議論してください。AIだと名乗りません。
---
`;

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

/** トグルスイッチコンポーネント */
function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2">
      <span className={`text-[11px] font-bold ${checked ? "text-emerald-700" : "text-muted-foreground"}`}>
        {checked ? "有効" : "無効"}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="sr-only peer"
      />
      <div className="relative h-5 w-9 shrink-0 rounded-full bg-gray-300 transition-colors duration-200 ease-in-out peer-checked:bg-emerald-500 peer-disabled:opacity-50 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition-transform after:duration-200 after:ease-in-out peer-checked:after:translate-x-4" />
    </label>
  );
}

/** ペルソナプロンプト編集コンポーネント */
function PromptEditor({
  personaId,
  initialPrompt,
}: {
  personaId: string;
  initialPrompt: string;
}) {
  // 編集不可部分と編集可能部分を分離
  const hasPrefix = initialPrompt.startsWith(PROMPT_PREFIX);
  const editablePart = hasPrefix ? initialPrompt.slice(PROMPT_PREFIX.length) : initialPrompt;

  const [prompt, setPrompt] = useState(editablePart);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function save() {
    setSaving(true);
    setMsg("");
    const fullPrompt = PROMPT_PREFIX + prompt;
    const res = await updateSpecialPersonaPrompt(personaId, fullPrompt);
    setSaving(false);
    setMsg(res.ok ? "保存しました" : (res.error ?? "保存に失敗しました"));
  }

  return (
    <div className="mt-2 space-y-2">
      {/* 編集不可部分 */}
      <div className="rounded-md bg-gray-100 p-2 text-xs text-muted-foreground whitespace-pre-wrap font-mono">
        {PROMPT_PREFIX.trim()}
      </div>
      {/* 編集可能部分 */}
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={6}
        className="w-full rounded-md border border-input px-3 py-2 text-xs font-mono"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} 保存
        </button>
        {msg && <p className={`text-xs ${msg === "保存しました" ? "text-emerald-600" : "text-red-600"}`}>{msg}</p>}
      </div>
    </div>
  );
}

export function AdminHistoricalPersona({ existing }: { existing: SpecialPersonaRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HistoricalPersonaResult | null>(null);
  const [permission, setPermission] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // 生成後のプロンプト編集用state
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [generatedId, setGeneratedId] = useState<string | null>(null);
  const [promptSaving, setPromptSaving] = useState(false);
  const [promptMsg, setPromptMsg] = useState("");

  async function create(permissionConfirmed = false) {
    if (!name.trim()) return;
    setLoading(true);
    setResult(null);
    setGeneratedId(null);
    setGeneratedPrompt("");
    setPromptMsg("");
    const res = await createSpecialPersona(name.trim(), permissionConfirmed, description.trim() || undefined);
    setResult(res);
    setLoading(false);
    if (res.ok && res.persona) {
      // 生成後のプロンプトを表示可能にする
      const rawPrompt = res.persona.personaPrompt ?? "";
      const hasPrefix = rawPrompt.startsWith(PROMPT_PREFIX);
      setGeneratedPrompt(hasPrefix ? rawPrompt.slice(PROMPT_PREFIX.length) : rawPrompt);
      setGeneratedId(res.persona.id);
      setName("");
      setDescription("");
      setPermission(false);
      router.refresh();
    }
  }

  async function saveGeneratedPrompt() {
    if (!generatedId) return;
    setPromptSaving(true);
    setPromptMsg("");
    const fullPrompt = PROMPT_PREFIX + generatedPrompt;
    const res = await updateSpecialPersonaPrompt(generatedId, fullPrompt);
    setPromptSaving(false);
    setPromptMsg(res.ok ? "保存しました" : (res.error ?? "保存に失敗しました"));
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-background p-4">
        <p className="flex items-center gap-2 text-sm font-bold"><Scale className="h-4 w-4 text-primary" /> AIペルソナを作成</p>
        <p className="mt-1 text-xs text-muted-foreground">
          名前と任意の説明からAIペルソナとオリジナルイラストを生成します。説明が空の場合はネット検索で自動調査します。
        </p>
        <div className="mt-3 space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
            placeholder="例：AI吉田松陰、AI教育改革者"
            className="w-full rounded-md border border-input px-3 py-2 text-sm"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="人物の特徴や人格の説明を自由に入力できます。空欄の場合はネット検索で自動調査します。"
            rows={3}
            className="w-full rounded-md border border-input px-3 py-2 text-sm"
          />
          <button type="button" onClick={() => create(false)} disabled={loading || !name.trim()} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} AIペルソナを生成
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
            {/* 肖像権・著作権の確認ポップアップ（caution/blocked 時） */}
            {result.legal && (result.legal.status === "caution" || result.legal.status === "blocked") && !result.ok && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-2">
                <p className="text-xs font-bold text-amber-900">肖像権・著作権を著しく侵す可能性があります。許可取得済みですか？</p>
                <p className="mt-1 text-[11px] text-muted-foreground">上の「許可を取得済み」にチェックを入れて作成してください。</p>
              </div>
            )}
            {result.error && <p className="text-sm text-red-600">{result.error}</p>}
            {result.ok && result.persona && (
              <>
                <div className="flex items-center gap-3">
                  {result.persona.avatarUrl && (
                    <Image src={result.persona.avatarUrl} alt="" width={56} height={56} className="h-14 w-14 rounded-full object-cover" unoptimized />
                  )}
                  <div className="text-xs">
                    <p className="text-sm font-bold">{result.persona.name} を作成しました</p>
                    {result.persona.expertise.length > 0 && <p className="text-muted-foreground">得意分野: {result.persona.expertise.join("、")}</p>}
                  </div>
                </div>
                {/* 生成後のシステムプロンプト表示・編集 */}
                {generatedId && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-bold">システムプロンプト（編集可能）</p>
                    <div className="rounded-md bg-gray-100 p-2 text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                      {PROMPT_PREFIX.trim()}
                    </div>
                    <textarea
                      value={generatedPrompt}
                      onChange={(e) => setGeneratedPrompt(e.target.value)}
                      rows={6}
                      className="w-full rounded-md border border-input px-3 py-2 text-xs font-mono"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={saveGeneratedPrompt}
                        disabled={promptSaving}
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                      >
                        {promptSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} 保存
                      </button>
                      {promptMsg && <p className={`text-xs ${promptMsg === "保存しました" ? "text-emerald-600" : "text-red-600"}`}>{promptMsg}</p>}
                    </div>
                  </div>
                )}
              </>
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
              <li key={p.id} className="rounded-lg border">
                <div className="flex items-center gap-3 p-2.5">
                  {p.avatarUrl ? (
                    <Image src={p.avatarUrl} alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-full object-cover" unoptimized />
                  ) : (
                    <div className="h-11 w-11 shrink-0 rounded-full bg-muted" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-bold">{p.name} <LegalBadge status={p.legalStatus} /></p>
                    {p.expertise.length > 0 && <p className="truncate text-[11px] text-muted-foreground">{p.expertise.join("、")}</p>}
                  </div>
                  <ToggleSwitch
                    checked={p.isActive}
                    onChange={async () => { await setSpecialPersonaActive(p.id, !p.isActive); router.refresh(); }}
                  />
                  <button
                    type="button"
                    onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                    className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                    aria-label="プロンプト表示"
                  >
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expandedId === p.id ? "rotate-180" : ""}`} />
                  </button>
                  <button type="button" onClick={async () => { if (confirm(`「${p.name}」を削除しますか？`)) { await deleteSpecialPersona(p.id); router.refresh(); } }} aria-label="削除" className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-rose-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {/* 展開時: プロンプト表示・編集 */}
                {expandedId === p.id && (
                  <div className="border-t px-3 py-2.5">
                    <p className="mb-1 text-xs font-bold">システムプロンプト</p>
                    <PromptEditor personaId={p.id} initialPrompt={p.personaPrompt} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
