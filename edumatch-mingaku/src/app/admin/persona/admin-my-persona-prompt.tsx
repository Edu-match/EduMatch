"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, Save, ChevronDown, Lock } from "lucide-react";
import { updateMyPersonaPrompt } from "@/app/_actions/persona-admin";

const PROMPT_PREFIX = `【編集不可】このAIペルソナは教育コミュニティ「教育のひろば」で発言します。断定・説教・宣伝・政治的発言は避け、建設的に議論してください。AIだと名乗りません。
---
`;

export function AdminMyPersonaPrompt({ initialPrompt }: { initialPrompt: string }) {
  const hasPrefix = initialPrompt.startsWith(PROMPT_PREFIX);
  const lockedLines = hasPrefix ? PROMPT_PREFIX.trimEnd().split("\n") : [];
  const editablePart = hasPrefix ? initialPrompt.slice(PROMPT_PREFIX.length) : initialPrompt;

  const [prompt, setPrompt] = useState(editablePart);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const editableLines = prompt.split("\n");
  const totalLines = lockedLines.length + Math.max(editableLines.length, 1);

  function autoResize() {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "0";
    ta.style.height = ta.scrollHeight + "px";
  }
  useEffect(autoResize, [prompt]);

  async function save() {
    setSaving(true);
    setMsg("");
    const fullPrompt = lockedLines.length ? PROMPT_PREFIX + prompt : prompt;
    const res = await updateMyPersonaPrompt(fullPrompt);
    setSaving(false);
    setMsg(res.ok ? "保存しました" : (res.error ?? "保存に失敗しました"));
  }

  return (
    <details
      className="mb-3 rounded-lg border border-[#3c3c5c] bg-[#1e1e2e] overflow-hidden"
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="flex cursor-pointer select-none items-center gap-2 bg-[#252536] px-3 py-2 text-xs font-bold text-white/70">
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        システムプロンプト
      </summary>

      {/* エディタ本体 */}
      <div className="flex min-h-[100px] border-t border-[#3c3c5c] font-mono text-[13px]">
        {/* 行番号ガター */}
        <div className="shrink-0 select-none border-r border-[#3c3c5c] bg-[#1e1e2e] py-2 text-right text-[11px] leading-[1.7] text-white/20" style={{ width: 38 }}>
          {Array.from({ length: totalLines }, (_, i) => (
            <div key={i} className="px-2">{i + 1}</div>
          ))}
        </div>

        {/* コード領域 */}
        <div className="min-w-0 flex-1 py-2">
          {/* 編集不可ブロック */}
          {lockedLines.length > 0 && (
            <div className="relative">
              <div className="absolute inset-0 bg-amber-500/[0.06]" />
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-amber-500/40" />
              <div className="relative select-none whitespace-pre-wrap px-4 leading-[1.7] text-white/50">
                {lockedLines.map((line, i) => (
                  <div key={i}>{line || " "}</div>
                ))}
              </div>
              <div className="absolute right-2 top-1 flex items-center gap-1 rounded bg-amber-500/20 px-1.5 py-0.5">
                <Lock className="h-2.5 w-2.5 text-amber-400/60" />
                <span className="text-[9px] font-sans text-amber-400/60">read-only</span>
              </div>
            </div>
          )}

          {/* 編集可能エリア */}
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-emerald-500/40" />
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full resize-none border-0 bg-transparent px-4 leading-[1.7] text-[#d4d4d4] outline-none placeholder:text-white/15"
              placeholder="// ペルソナの性格・口調・知識を記述..."
              spellCheck={false}
              style={{ minHeight: "3.4em" }}
            />
          </div>
        </div>
      </div>

      {/* ステータスバー */}
      <div className="flex items-center justify-between border-t border-[#3c3c5c] bg-[#007acc] px-3 py-1">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-white transition hover:text-white/80 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} 保存
          </button>
          {msg && <span className={`text-[11px] ${msg === "保存しました" ? "text-emerald-200" : "text-red-200"}`}>{msg}</span>}
        </div>
        <div className="flex items-center gap-3 text-[10px] text-white/70">
          <span>行 {totalLines}</span>
          <span>{prompt.length} 文字</span>
          <span>UTF-8</span>
        </div>
      </div>
    </details>
  );
}
