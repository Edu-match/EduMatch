"use client";

import { useState } from "react";
import { Loader2, Save, ChevronDown, Pencil, X, Check } from "lucide-react";
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

      <div className="border-t p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold">システムプロンプト</p>
          {!editing && (
            <button
              type="button"
              onClick={() => { setEditing(true); setSaved(false); }}
              className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition hover:bg-muted"
            >
              <Pencil className="h-3 w-3" />編集
            </button>
          )}
        </div>

        {editing ? (
          <>
            {/* 編集不可部分 */}
            {hasPrefix && (
              <pre className="rounded-t-lg border border-b-0 bg-amber-50 p-4 text-xs leading-5 font-mono whitespace-pre-wrap text-amber-900/80 select-none">{PROMPT_PREFIX.trimEnd()}</pre>
            )}
            {/* 編集可能部分 */}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className={`w-full border bg-background p-4 font-mono text-xs leading-5 resize-none min-h-[160px] outline-none focus:ring-2 focus:ring-primary/30 ${hasPrefix ? "rounded-b-lg border-t-0" : "rounded-lg"}`}
              rows={10}
              spellCheck={false}
            />
            {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition hover:bg-muted disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />キャンセル
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {saving ? "保存中…" : "保存"}
              </button>
            </div>
          </>
        ) : (
          <>
            <pre className="rounded-lg bg-muted/60 p-4 text-xs leading-5 text-foreground/80 font-mono whitespace-pre-wrap overflow-auto min-h-[120px] border">
{hasPrefix ? PROMPT_PREFIX + text : text}
            </pre>
            {saved && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <Check className="h-3.5 w-3.5" />保存しました
              </p>
            )}
          </>
        )}
      </div>
    </details>
  );
}
