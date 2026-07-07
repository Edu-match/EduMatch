"use client";

import { useState } from "react";
import { Loader2, Save, ChevronDown, Lock } from "lucide-react";
import { updateMyPersonaPrompt } from "@/app/_actions/persona-admin";

const PROMPT_PREFIX = `【編集不可】このAIペルソナは教育コミュニティ「教育のひろば」で発言します。断定・説教・宣伝・政治的発言は避け、建設的に議論してください。AIだと名乗りません。
---
`;

export function AdminMyPersonaPrompt({ initialPrompt }: { initialPrompt: string }) {
  const hasPrefix = initialPrompt.startsWith(PROMPT_PREFIX);
  const lockedPart = hasPrefix ? PROMPT_PREFIX.trim() : "";
  const editablePart = hasPrefix ? initialPrompt.slice(PROMPT_PREFIX.length) : initialPrompt;

  const [prompt, setPrompt] = useState(editablePart);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(false);

  async function save() {
    setSaving(true);
    setMsg("");
    const fullPrompt = lockedPart ? PROMPT_PREFIX + prompt : prompt;
    const res = await updateMyPersonaPrompt(fullPrompt);
    setSaving(false);
    setMsg(res.ok ? "保存しました" : (res.error ?? "保存に失敗しました"));
  }

  return (
    <details
      className="mb-3 rounded-lg border bg-muted/20"
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="flex cursor-pointer select-none items-center gap-2 px-3 py-2 text-xs font-bold">
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        システムプロンプト
      </summary>
      <div className="border-t">
        <div className="overflow-hidden rounded-b-lg bg-[#1e1e2e]">
          {/* 編集不可部分 */}
          {lockedPart && (
            <div className="border-b border-white/10 px-1">
              <div className="flex items-center gap-1.5 px-2 pt-2 pb-1">
                <Lock className="h-3 w-3 text-amber-400/70" />
                <span className="text-[10px] font-medium text-amber-400/70">編集不可（安全ルール）</span>
              </div>
              <pre className="select-none px-3 pb-2 text-xs leading-relaxed text-white/40 font-mono whitespace-pre-wrap">{lockedPart}</pre>
            </div>
          )}
          {/* 編集可能部分 */}
          <div className="px-1">
            <div className="flex items-center gap-1.5 px-2 pt-2 pb-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-[10px] font-medium text-emerald-400/70">編集可能（ペルソナ設定）</span>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={6}
              className="w-full resize-y border-0 bg-transparent px-3 py-1 text-xs font-mono leading-relaxed text-emerald-100 outline-none placeholder:text-white/20"
              placeholder="ペルソナの性格・口調・知識などを記述…"
              spellCheck={false}
            />
          </div>
          {/* フッター */}
          <div className="flex items-center gap-2 border-t border-white/10 px-3 py-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} 保存
            </button>
            {msg && <p className={`text-xs ${msg === "保存しました" ? "text-emerald-400" : "text-red-400"}`}>{msg}</p>}
            <span className="ml-auto text-[10px] text-white/30">{prompt.length} 文字</span>
          </div>
        </div>
      </div>
    </details>
  );
}
