"use client";

import { useState } from "react";
import { Loader2, Save, ChevronDown } from "lucide-react";
import { updateMyPersonaPrompt } from "@/app/_actions/persona-admin";

export function AdminMyPersonaPrompt({ initialPrompt }: { initialPrompt: string }) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function save() {
    setSaving(true);
    setMsg("");
    const res = await updateMyPersonaPrompt(prompt);
    setSaving(false);
    setMsg(res.ok ? "保存しました" : (res.error ?? "保存に失敗しました"));
  }

  return (
    <details className="mb-3 rounded-lg border bg-muted/20">
      <summary className="flex cursor-pointer select-none items-center gap-2 px-3 py-2 text-xs font-bold">
        <ChevronDown className="h-3.5 w-3.5 shrink-0" />
        システムプロンプト
      </summary>
      <div className="space-y-2 border-t px-3 py-2.5">
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
    </details>
  );
}
