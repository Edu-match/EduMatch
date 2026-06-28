"use client";

import { useMemo, useState } from "react";
import { Loader2, Sparkles, Send, ChevronDown, ChevronRight, Search, Check } from "lucide-react";
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

type SubGroup = { sub: string; posts: ReplyTargetPost[] };
type CatGroup = { cat: string; count: number; subs: SubGroup[] };

/** 管理者が「カテゴリ→ボード」で投稿を選び、自分のAIペルソナで返信を作る。 */
export function AdminPersonaReplyTool({ posts, hasPersona }: { posts: ReplyTargetPost[]; hasPersona: boolean }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [generating, setGenerating] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});

  // カテゴリ→ボード(サブカテゴリ)→投稿 の2階層グルーピング＋検索。
  const groups = useMemo<CatGroup[]>(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? posts.filter((p) =>
          p.body.toLowerCase().includes(q) ||
          p.authorName.toLowerCase().includes(q) ||
          p.subCategoryName.toLowerCase().includes(q) ||
          p.categoryName.toLowerCase().includes(q))
      : posts;
    const catMap = new Map<string, Map<string, ReplyTargetPost[]>>();
    for (const p of filtered) {
      const subMap = catMap.get(p.categoryName) ?? new Map<string, ReplyTargetPost[]>();
      const arr = subMap.get(p.subCategoryName) ?? [];
      arr.push(p);
      subMap.set(p.subCategoryName, arr);
      catMap.set(p.categoryName, subMap);
    }
    return [...catMap.entries()]
      .map(([cat, subMap]) => ({
        cat,
        count: [...subMap.values()].reduce((n, a) => n + a.length, 0),
        subs: [...subMap.entries()].map(([sub, ps]) => ({ sub, posts: ps })).sort((a, b) => b.posts.length - a.posts.length),
      }))
      .sort((a, b) => b.count - a.count);
  }, [posts, query]);

  const isOpen = (cat: string) => openCats[cat] ?? (query.trim() !== "");

  function select(id: string) { setSelectedId(id); setDraft(""); setError(null); setDone(null); }
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

  function postRow(p: ReplyTargetPost) {
    const active = selectedId === p.id;
    return (
      <li key={p.id} className={`rounded-lg border p-2.5 transition ${active ? "border-primary bg-primary/[0.06] ring-2 ring-primary/40" : "border-transparent hover:bg-muted/40"}`}>
        <button type="button" onClick={() => select(p.id)} className="flex w-full items-start gap-2 text-left">
          <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${active ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"}`}>
            {active && <Check className="h-3 w-3" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
              <span className="truncate">{p.authorName}</span>
              {p.replyCount > 0 && <span>・返信 {p.replyCount}</span>}
              {active && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">選択中</span>}
            </span>
            <span className="mt-0.5 block break-words text-sm line-clamp-2">{p.body}</span>
          </span>
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
  }

  return (
    <div className="space-y-3">
      {done && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">{done}</p>}

      <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="投稿を検索（本文・投稿者・ボード・カテゴリ）" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
      </div>

      {posts.length === 0 ? (
        <p className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">返信対象の投稿がありません。</p>
      ) : groups.length === 0 ? (
        <p className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">該当する投稿がありません。</p>
      ) : (
        <div className="space-y-2">
          {groups.map((g) => {
            const open = isOpen(g.cat);
            return (
              <div key={g.cat} className="overflow-hidden rounded-xl border">
                <button type="button" onClick={() => setOpenCats((prev) => ({ ...prev, [g.cat]: !open }))} className="flex w-full items-center justify-between gap-2 bg-muted/50 px-3 py-2.5 text-left">
                  <span className="flex min-w-0 items-center gap-2 text-sm font-bold">
                    {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                    <span className="truncate">{g.cat}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-[11px] font-bold text-muted-foreground">{g.count}</span>
                </button>

                {open && (
                  <div className="space-y-3 px-2.5 py-2.5">
                    {g.subs.map((s) => (
                      <div key={s.sub}>
                        <p className="mb-1 px-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{s.sub}（{s.posts.length}）</p>
                        <ul className="space-y-1.5">
                          {s.posts.map((p) => postRow(p))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
