"use client";

import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { FileText, Pencil, Check, X, Loader2, ChevronDown, RefreshCw } from "lucide-react";
import { updateMyPersonaPrompt, regenerateMyPersonaPrompt } from "@/app/_actions/persona-admin";

const IMMUTABLE_HEADER = "【以下はシステム固定（編集不可）】\n返信ルール: 教育コミュニティにふさわしい建設的な発言をする。断定・説教・宣伝・政治的に偏った発言は避ける。AIだと名乗らない。";

export function PersonaPromptViewer({
  initialPrompt,
  type,
}: {
  initialPrompt: string;
  type: "my" | "special";
}) {
  const [editing, setEditing] = useState(false);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [baseline, setBaseline] = useState(initialPrompt);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const save = useCallback(async () => {
    if (type !== "my") return;
    setSaving(true);
    const res = await updateMyPersonaPrompt(prompt);
    setSaving(false);
    if (res.ok) {
      setBaseline(prompt);
      setEditing(false);
    }
  }, [prompt, type]);

  const regenerate = useCallback(async () => {
    if (type !== "my") return;
    if (!confirm("システムプロンプトを再生成しますか？現在の内容は上書きされます。")) return;
    setRegenerating(true);
    setError(null);
    const res = await regenerateMyPersonaPrompt();
    setRegenerating(false);
    if (res.ok && res.newPrompt) {
      setPrompt(res.newPrompt);
      setBaseline(res.newPrompt);
      setEditing(false);
    } else {
      setError(res.error ?? "再生成に失敗しました");
    }
  }, [type]);

  return (
    <div className="rounded-lg border bg-card p-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <FileText className="h-3.5 w-3.5" />
        システムプロンプト
        <ChevronDown className={`ml-auto h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
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
                rows={8}
                maxLength={2000}
                className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-xs leading-relaxed focus:ring-2 focus:ring-primary/30"
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">{prompt.length}/2000</span>
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => { setPrompt(baseline); setEditing(false); }} className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-medium hover:bg-muted">
                    <X className="h-3 w-3" /> キャンセル
                  </button>
                  <button type="button" onClick={save} disabled={saving || !prompt.trim()} className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} 保存
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="group relative rounded-md border bg-background px-3 py-2.5">
              <p className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1.5">ペルソナプロンプト（編集可能）</p>
              {prompt.trim() ? (
                <div className="prose prose-sm max-w-none prose-headings:mt-3 prose-headings:mb-1.5 prose-headings:text-sm prose-headings:font-bold prose-headings:text-foreground/90 prose-p:my-1 prose-p:text-[13px] prose-p:leading-relaxed prose-p:text-foreground/80 prose-li:my-0.5 prose-li:text-[13px] prose-li:leading-relaxed prose-ul:my-1 prose-strong:text-foreground first:prose-headings:mt-0">
                  <ReactMarkdown remarkPlugins={[remarkBreaks]}>{prompt}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">（未設定）</p>
              )}
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
                aria-label="編集"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              {type === "my" && (
                <div className="mt-3 flex justify-end border-t pt-2.5">
                  <button
                    type="button"
                    onClick={regenerate}
                    disabled={regenerating}
                    className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium transition hover:bg-muted disabled:opacity-50"
                  >
                    {regenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    {regenerating ? "生成中…" : "再生成"}
                  </button>
                </div>
              )}
              {error && <p className="mt-1.5 text-[11px] text-destructive">{error}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
