"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2, Scale, Sparkles, ShieldCheck, ShieldAlert, ShieldX, Trash2, ChevronDown, Lock, Save, X, Pencil, Check } from "lucide-react";
import { createSpecialPersona, setSpecialPersonaActive, deleteSpecialPersona, updateSpecialPersonaPrompt, type HistoricalPersonaResult } from "@/app/_actions/persona-admin";

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

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2">
      <span className={`text-[11px] font-bold ${checked ? "text-emerald-700" : "text-muted-foreground"}`}>
        {checked ? "有効" : "無効"}
      </span>
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} className="sr-only peer" />
      <div className="relative h-5 w-9 shrink-0 rounded-full bg-gray-300 transition-colors duration-200 ease-in-out peer-checked:bg-emerald-500 peer-disabled:opacity-50 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition-transform after:duration-200 after:ease-in-out peer-checked:after:translate-x-4" />
    </label>
  );
}

/* ── 許可確認モーダル ── */
function PermissionModal({ open, onClose, onConfirm, loading, name }: {
  open: boolean; onClose: () => void; onConfirm: () => void; loading: boolean; name: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-[min(420px,90vw)] rounded-2xl border bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
            <h3 className="text-base font-bold">肖像権・著作権の確認</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-sm leading-relaxed text-foreground/80">
          「<strong>{name}</strong>」は肖像権・著作権を侵害する可能性があります。
        </p>
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
          <p className="font-bold">以下をすべて確認してください：</p>
          <ul className="mt-1.5 list-inside list-disc space-y-1 text-amber-800">
            <li>本人または権利者から作成・公開の許可を取得済み</li>
            <li>公開範囲について合意済み</li>
            <li>苦情時の取り下げ対応が可能</li>
          </ul>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          確認済みとして作成した場合、記録が残ります。法的チェックはAIによる参考判定です。
        </p>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
            キャンセル
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            許可確認済みとして作成
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── システムプロンプト（クリーンUI） ── */
function PromptEditor({
  personaId,
  initialPrompt,
}: {
  personaId: string;
  initialPrompt: string;
}) {
  const hasPrefix = initialPrompt.startsWith(PROMPT_PREFIX);
  const editablePart = hasPrefix ? initialPrompt.slice(PROMPT_PREFIX.length) : initialPrompt;

  const [text, setText] = useState(editablePart);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const fullPrompt = PROMPT_PREFIX + text;
    const res = await updateSpecialPersonaPrompt(personaId, fullPrompt);
    setSaving(false);
    if (res.ok) {
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setError(res.error ?? "保存に失敗しました");
    }
  }

  function handleCancel() {
    setText(editablePart);
    setEditing(false);
    setError(null);
  }

  return (
    <div className="mt-2">
      {/* 編集不可プレフィックス */}
      {hasPrefix && (
        <div className="rounded-t-lg border border-b-0 border-amber-200 bg-amber-50/60 p-3">
          <div className="mb-1.5 flex items-center gap-1.5">
            <Lock className="h-3 w-3 text-amber-600/70" />
            <span className="text-[11px] font-semibold text-amber-700">共通ルール（編集不可）</span>
          </div>
          <pre className="whitespace-pre-wrap font-mono text-xs leading-5 text-amber-900/70">{PROMPT_PREFIX.trimEnd()}</pre>
        </div>
      )}

      {/* 編集可能プロンプト */}
      <div className={`flex items-center justify-between ${hasPrefix ? "border border-t-0 border-b-0 bg-background px-3 py-2" : "mb-2"}`}>
        <p className="text-xs font-semibold text-foreground/70">カスタムプロンプト</p>
        {!editing && (
          <button
            type="button"
            onClick={() => { setEditing(true); setSaved(false); }}
            className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-medium transition hover:bg-muted"
          >
            <Pencil className="h-3 w-3" />編集
          </button>
        )}
      </div>

      {editing ? (
        <div className={hasPrefix ? "rounded-b-lg border border-t-0 p-3" : ""}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full rounded-lg border bg-background p-3 font-mono text-xs leading-5 resize-none min-h-[160px] outline-none focus:ring-2 focus:ring-primary/30"
            rows={10}
            spellCheck={false}
          />
          {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium transition hover:bg-muted disabled:opacity-50"
            >
              <X className="h-3 w-3" />キャンセル
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              {saving ? "保存中…" : "保存"}
            </button>
          </div>
        </div>
      ) : (
        <div className={hasPrefix ? "rounded-b-lg border border-t-0" : "rounded-lg border"}>
          <pre className="whitespace-pre-wrap p-3 font-mono text-xs leading-5 text-foreground/80 min-h-[80px]">{text || "（未設定）"}</pre>
          {saved && (
            <p className="border-t px-3 py-2 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <Check className="h-3.5 w-3.5" />保存しました
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function AdminHistoricalPersona({ existing }: { existing: SpecialPersonaRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HistoricalPersonaResult | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [generatedId, setGeneratedId] = useState<string | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  const create = useCallback(async (permissionConfirmed = false) => {
    if (!name.trim()) return;
    setLoading(true);
    setResult(null);
    setGeneratedId(null);
    setGeneratedPrompt("");
    const res = await createSpecialPersona(name.trim(), permissionConfirmed, description.trim() || undefined);
    setResult(res);
    setLoading(false);

    if (res.ok && res.persona) {
      const rawPrompt = res.persona.personaPrompt ?? "";
      const hasPrefix = rawPrompt.startsWith(PROMPT_PREFIX);
      setGeneratedPrompt(hasPrefix ? rawPrompt.slice(PROMPT_PREFIX.length) : rawPrompt);
      setGeneratedId(res.persona.id);
      setName("");
      setDescription("");
      setShowPermissionModal(false);
      router.refresh();
    } else if (!res.ok && res.legal && (res.legal.status === "blocked" || res.legal.status === "caution")) {
      setShowPermissionModal(true);
    }
  }, [name, description, router]);

  const displayName = name.trim() ? (name.trim().startsWith("AI") ? name.trim() : `AI${name.trim()}`) : "";

  return (
    <div className="space-y-4">
      {/* ── 作成フォーム ── */}
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
            placeholder="例：吉田松陰、教育改革者"
            className="w-full rounded-md border border-input px-3 py-2 text-sm"
          />
          {displayName && (
            <p className="text-xs text-muted-foreground">
              表示名: <span className="font-bold text-foreground">{displayName}</span>
            </p>
          )}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="人物の特徴や人格の説明を自由に入力できます。空欄の場合はネット検索で自動調査します。"
            rows={3}
            className="w-full rounded-md border border-input px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => create(false)}
            disabled={loading || !name.trim()}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} AIペルソナを生成
          </button>
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
              <>
                <div className="flex items-center gap-3">
                  {result.persona.avatarUrl && (
                    <Image src={result.persona.avatarUrl} alt="" width={56} height={56} className="h-14 w-14 rounded-full object-cover" unoptimized />
                  )}
                  <div className="text-xs">
                    <p className="text-sm font-bold">{result.persona.name.startsWith("AI") ? result.persona.name : `AI${result.persona.name}`} を作成しました</p>
                    {result.persona.expertise.length > 0 && <p className="text-muted-foreground">得意分野: {result.persona.expertise.join("、")}</p>}
                  </div>
                </div>
                {generatedId && (
                  <div className="mt-3">
                    <p className="text-xs font-bold mb-1">システムプロンプト</p>
                    <PromptEditor personaId={generatedId} initialPrompt={PROMPT_PREFIX + generatedPrompt} />
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── 許可確認モーダル ── */}
      <PermissionModal
        open={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        onConfirm={() => create(true)}
        loading={loading}
        name={displayName || name.trim()}
      />

      {/* ── 作成済み一覧 ── */}
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
                    <p className="flex items-center gap-2 text-sm font-bold">{p.name.startsWith("AI") ? p.name : `AI${p.name}`} <LegalBadge status={p.legalStatus} /></p>
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
