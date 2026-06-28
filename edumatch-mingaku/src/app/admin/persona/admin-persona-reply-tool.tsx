"use client";

import { useState } from "react";
import { Loader2, Sparkles, Send, MessageSquare } from "lucide-react";
import { generatePersonaReplyDraftForPost, postPersonaReplyToPost } from "@/app/_actions/persona-admin";

export type ReplyTargetPost = {
  id: string;
  authorName: string;
  body: string;
  subCategoryName: string;
  createdAt: string;
};

/** 管理者が投稿を選び、自分のAIペルソナで返信ドラフトを作成→編集→投稿するツール。 */
export function AdminPersonaReplyTool({ posts, hasPersona }: { posts: ReplyTargetPost[]; hasPersona: boolean }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [generating, setGenerating] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const select = (id: string) => {
    setSelectedId(id);
    setDraft("");
    setError(null);
    setDone(null);
  };

  async function generate() {
    if (!selectedId) return;
    setGenerating(true); setError(null); setDone(null);
    const res = await generatePersonaReplyDraftForPost(selectedId);
    setGenerating(false);
    if (res.ok && res.text) setDraft(res.text);
    else setError(res.error ?? "生成に失敗しました");
  }

  async function post() {
    if (!selectedId || !draft.trim()) return;
    setPosting(true); setError(null); setDone(null);
    const res = await postPersonaReplyToPost(selectedId, draft);
    setPosting(false);
    if (res.ok) {
      setDone("返信を投稿しました。");
      setDraft("");
      setSelectedId(null);
    } else {
      setError(res.error ?? "投稿に失敗しました");
    }
  }

  if (!hasPersona) {
    return <p className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">先に上の「あなたのAIペルソナ」を作成すると、投稿への返信を作れます。</p>;
  }

  return (
    <div className="space-y-3">
      {done && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">{done}</p>}
      {posts.length === 0 ? (
        <p className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">返信対象の投稿がありません。</p>
      ) : (
        <ul className="space-y-2">
          {posts.map((p) => {
            const active = selectedId === p.id;
            return (
              <li key={p.id} className={`rounded-xl border p-3 transition ${active ? "border-primary ring-1 ring-primary/30" : "bg-background"}`}>
                <button type="button" onClick={() => select(p.id)} className="block w-full text-left">
                  <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <MessageSquare className="h-3 w-3" /> {p.subCategoryName} ・ {p.authorName}
                  </span>
                  <span className="mt-1 block text-sm line-clamp-2">{p.body}</span>
                </button>

                {active && (
                  <div className="mt-3 space-y-2 border-t pt-3">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={generate} disabled={generating} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50">
                        {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        {draft ? "作り直す" : "AIで返信を生成"}
                      </button>
                    </div>
                    {(draft || generating) && (
                      <>
                        <textarea
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          rows={4}
                          placeholder={generating ? "生成中…" : "返信本文（編集できます）"}
                          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                        <button type="button" onClick={post} disabled={posting || !draft.trim()} className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50">
                          {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} この内容で返信を投稿
                        </button>
                      </>
                    )}
                    {error && <p className="text-xs text-red-600">{error}</p>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
