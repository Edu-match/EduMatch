"use client";

import { useMemo, useState } from "react";
import { Loader2, Sparkles, Send, ChevronDown, ChevronRight, Search } from "lucide-react";
import { generatePersonaReplyDraftForPost, postPersonaReplyToPost } from "@/app/_actions/persona-admin";

export type ReplyTargetPost = {
  id: string;
  authorName: string;
  body: string;
  categoryName: string;
  subCategoryName: string;
  replyCount: number;
  createdAt: string;
};

/** 管理者が投稿をカテゴリ別に選び、自分のAIペルソナで返信ドラフト→編集→投稿するツール。 */
export function AdminPersonaReplyTool({ posts, hasPersona }: { posts: ReplyTargetPost[]; hasPersona: boolean }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [generating, setGenerating] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});

  // カテゴリ別グルーピング＋検索フィルタ。
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? posts.filter((p) => p.body.toLowerCase().includes(q) || p.authorName.toLowerCase().includes(q) || p.subCategoryName.toLowerCase().includes(q))
      : posts;
    const map = new Map<string, ReplyTargetPost[]>();
    for (const p of filtered) {
      const arr = map.get(p.categoryName) ?? [];
      arr.push(p);
      map.set(p.categoryName, arr);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [posts, query]);

  const isOpen = (cat: string) => openCats[cat] ?? (query.trim() !== "");

  function select(id: string) {
    setSelectedId(id); setDraft(""); setError(null); setDone(null);
  }
  async function generate() {
    if (!selectedId) return;
    setGenerating(true); setError(null); setDone(null);
    const res = await generatePersonaReplyDraftForPost(selectedId);
    setGenerating(false);
    if (res.ok && res.text) setDraft(res.text); else setError(res.error ?? "生成に失敗しました");
  }
  async function post() {
    if (!selectedId || !draft.trim()) return;
    setPosting(true); setError(null); setDone(null);
    const res = await postPersonaReplyToPost(selectedId, draft);
    setPosting(false);
    if (res.ok) { setDone("返信を投稿しました。"); setDraft(""); setSelectedId(null); }
    else setError(res.error ?? "投稿に失敗しました");
  }

  if (!hasPersona) {
    return <p className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">先に上の「あなたのAIペルソナ」を作成すると、投稿への返信を作れます。</p>;
  }

  return (
    <div className="space-y-3">
      {done && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">{done}</p>}

      {/* 検索 */}
      <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="投稿を検索（本文・投稿者・カテゴリ）" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
      </div>

      {posts.length === 0 ? (
        <p className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">返信対象の投稿がありません。</p>
      ) : groups.length === 0 ? (
        <p className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">該当する投稿がありません。</p>
      ) : (
        <div className="space-y-2">
          {groups.map(([cat, items]) => {
            const open = isOpen(cat);
            return (
              <div key={cat} className="overflow-hidden rounded-xl border">
                <button
                  type="button"
                  onClick={() => setOpenCats((prev) => ({ ...prev, [cat]: !open }))}
                  className="flex w-full items-center justify-between gap-2 bg-muted/40 px-3 py-2.5 text-left"
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm font-bold">
                    {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                    <span className="truncate">{cat}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-[11px] font-bold text-muted-foreground">{items.length}</span>
                </button>

                {open && (
                  <ul className="divide-y">
                    {items.map((p) => {
                      const active = selectedId === p.id;
                      return (
                        <li key={p.id} className={`px-3 py-2.5 ${active ? "bg-primary/[0.04]" : ""}`}>
                          <button type="button" onClick={() => select(p.id)} className="block w-full text-left">
                            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                              <span className="rounded bg-muted px-1.5 py-0.5 font-medium">{p.subCategoryName}</span>
                              <span className="truncate">{p.authorName}</span>
                              {p.replyCount > 0 && <span>・返信 {p.replyCount}</span>}
                            </span>
                            <span className="mt-1 block break-words text-sm line-clamp-2">{p.body}</span>
                          </button>

                          {active && (
                            <div className="mt-3 space-y-2 border-t pt-3">
                              <button type="button" onClick={generate} disabled={generating} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50">
                                {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                                {draft ? "作り直す" : "AIで返信を生成"}
                              </button>
                              {(draft || generating) && (
                                <>
                                  <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} placeholder={generating ? "生成中…" : "返信本文（編集できます）"} className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm" />
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
          })}
        </div>
      )}
    </div>
  );
}
