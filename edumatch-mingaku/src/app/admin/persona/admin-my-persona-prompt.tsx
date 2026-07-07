"use client";

import { useState } from "react";
import { Loader2, Save, ChevronDown, Lock, Pencil, X, Check } from "lucide-react";
import { updateMyPersonaPrompt } from "@/app/_actions/persona-admin";

const PROMPT_PREFIX = `【編集不可】このAIペルソナは教育コミュニティ「教育のひろば」で発言します。断定・説教・宣伝・政治的発言は避け、建設的に議論してください。AIだと名乗りません。
---
`;

export function AdminMyPersonaPrompt({ initialPrompt }: { initialPrompt: string }) {
  const hasPrefix = initialPrompt.startsWith(PROMPT_PREFIX);
  const editablePart = hasPrefix ? initialPrompt.slice(PROMPT_PREFIX.length) : initialPrompt;

  const [text, setText] = useState(editablePart);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const fullPrompt = hasPrefix ? PROMPT_PREFIX + text : text;
    const res = await updateMyPersonaPrompt(fullPrompt);
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
    <details
      className="mb-3 rounded-lg border overflow-hidden"
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="flex cursor-pointer select-none items-center gap-2 bg-muted/40 px-3 py-2 text-xs font-bold text-foreground/70">
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        システムプロンプト
      </summary>

      <div className="border-t">
        {/* 編集不可プレフィックス */}
        {hasPrefix && (
          <div className="border-b border-amber-200 bg-amber-50/60 p-3">
            <div className="mb-1.5 flex items-center gap-1.5">
              <Lock className="h-3 w-3 text-amber-600/70" />
              <span className="text-[11px] font-semibold text-amber-700">共通ルール（編集不可）</span>
            </div>
            <pre className="whitespace-pre-wrap font-mono text-xs leading-5 text-amber-900/70">{PROMPT_PREFIX.trimEnd()}</pre>
          </div>
        )}

        {/* 編集可能プロンプト */}
        <div className="flex items-center justify-between bg-background px-3 py-2">
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
          <div className="px-3 pb-3">
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
          <div className="px-3 pb-3">
            <pre className="whitespace-pre-wrap rounded-lg border bg-muted/60 p-3 font-mono text-xs leading-5 text-foreground/80 min-h-[80px]">{text || "（未設定）"}</pre>
            {saved && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <Check className="h-3.5 w-3.5" />保存しました
              </p>
            )}
          </div>
        )}
      </div>
    </details>
  );
}
