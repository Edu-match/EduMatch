"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  MessageSquare,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  isPrimary: boolean;
  sortOrder: number;
  isActive: boolean;
};
type SubCategory = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
};
type Post = {
  id: string;
  authorName: string;
  authorRole: string;
  body: string;
  isPinned: boolean;
  isHidden: boolean;
  postedAt: string;
};

async function api(url: string, opts?: RequestInit) {
  const res = await fetch(url, { credentials: "include", ...opts });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export function InteropContentAdmin() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subsByCat, setSubsByCat] = useState<Record<string, SubCategory[]>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const flash = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    if (ok) setTimeout(() => setMsg(null), 2500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await api("/api/interop/categories?all=true");
    const cats: Category[] = data.categories ?? [];
    setCategories(cats);
    const entries = await Promise.all(
      cats.map(async (c) => {
        const { data: d } = await api(`/api/interop/sub-categories?all=true&categoryId=${c.id}`);
        return [c.id, (d.subCategories ?? []) as SubCategory[]] as const;
      })
    );
    setSubsByCat(Object.fromEntries(entries));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      {msg && (
        <p className={`sticky top-2 z-10 rounded-md border px-4 py-2 text-sm font-medium ${msg.ok ? "border-green-300 bg-green-50 text-green-700" : "border-red-300 bg-red-50 text-red-700"}`}>
          {msg.text}
        </p>
      )}

      <AddCategoryForm count={categories.length} onAdded={load} onMsg={flash} />

      <div>
        <h2 className="mb-3 text-sm font-semibold">カテゴリ・コンテンツ管理</h2>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : categories.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-8 text-center text-xs text-muted-foreground">まだありません。</p>
        ) : (
          <div className="space-y-2">
            {categories.map((c) => (
              <CategoryRow
                key={c.id}
                cat={c}
                subs={subsByCat[c.id] ?? []}
                open={!!expanded[c.id]}
                onToggle={() => setExpanded((p) => ({ ...p, [c.id]: !p[c.id] }))}
                onChanged={load}
                onMsg={flash}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────── カテゴリ追加 ─────────── */
function AddCategoryForm({ count, onAdded, onMsg }: { count: number; onAdded: () => void; onMsg: (t: string, ok: boolean) => void }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#9fb4e8");
  const [primary, setPrimary] = useState(false);
  const [busy, setBusy] = useState(false);
  const add = async () => {
    if (!name.trim()) return;
    setBusy(true);
    const { ok, data } = await api("/api/interop/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color, isPrimary: primary, sortOrder: count }),
    });
    setBusy(false);
    if (ok) { onMsg(`「${data.category.name}」を追加しました。`, true); setName(""); setPrimary(false); onAdded(); }
    else onMsg("追加に失敗しました。", false);
  };
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">カテゴリを追加</CardTitle></CardHeader>
      <CardContent className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">カテゴリ名</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="例：AI部" className="w-48" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">色</span>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-14 rounded border" />
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={primary} onChange={(e) => setPrimary(e.target.checked)} /> 中心（インフォメーション）
        </label>
        <Button onClick={add} disabled={busy} className="gap-1.5">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} 追加
        </Button>
      </CardContent>
    </Card>
  );
}

/* ─────────── カテゴリ行 ─────────── */
function CategoryRow({ cat, subs, open, onToggle, onChanged, onMsg }: {
  cat: Category; subs: SubCategory[]; open: boolean; onToggle: () => void; onChanged: () => void; onMsg: (t: string, ok: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(cat.name);
  const [color, setColor] = useState(cat.color);
  const [desc, setDesc] = useState(cat.description);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const { ok } = await api(`/api/interop/categories/${cat.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color, description: desc }),
    });
    setBusy(false);
    if (ok) { onMsg("カテゴリを更新しました。", true); setEditing(false); onChanged(); }
    else onMsg("更新に失敗しました。", false);
  };
  const toggleActive = async () => {
    const { ok } = await api(`/api/interop/categories/${cat.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !cat.isActive }),
    });
    if (ok) onChanged(); else onMsg("更新に失敗しました。", false);
  };
  const setPrimary = async () => {
    const { ok } = await api(`/api/interop/categories/${cat.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPrimary: true }),
    });
    if (ok) { onMsg("中心カテゴリに設定しました。", true); onChanged(); } else onMsg("更新に失敗しました。", false);
  };
  const remove = async () => {
    if (!confirm(`「${cat.name}」とその配下（サブカテゴリ・投稿）をすべて削除しますか？`)) return;
    const { ok } = await api(`/api/interop/categories/${cat.id}`, { method: "DELETE" });
    if (ok) { onMsg("削除しました。", true); onChanged(); } else onMsg("削除に失敗しました。", false);
  };

  return (
    <div className={`rounded-lg border ${cat.isActive ? "" : "opacity-60"}`}>
      <div className="flex items-center gap-2 px-3 py-3">
        <button type="button" onClick={onToggle} className="flex flex-1 items-center gap-3 text-left">
          <span className="h-4 w-4 shrink-0 rounded-full border" style={{ background: cat.color }} />
          <span className="font-medium">{cat.name}</span>
          {cat.isPrimary && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">中心</span>}
          {!cat.isActive && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">非公開</span>}
          <span className="text-[11px] text-muted-foreground">{subs.length}件</span>
        </button>
        <button type="button" onClick={() => setEditing((v) => !v)} className="rounded p-1 text-muted-foreground hover:text-foreground" title="編集"><Pencil className="h-4 w-4" /></button>
        {!cat.isPrimary && (
          <button type="button" onClick={setPrimary} className="rounded p-1 text-muted-foreground hover:text-foreground" title="中心にする"><Pin className="h-4 w-4" /></button>
        )}
        <button type="button" onClick={toggleActive} className="rounded p-1 text-muted-foreground hover:text-foreground" title={cat.isActive ? "非公開にする" : "公開する"}>
          {cat.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
        <button type="button" onClick={remove} className="rounded p-1 text-muted-foreground hover:text-destructive" title="削除"><Trash2 className="h-4 w-4" /></button>
        <button type="button" onClick={onToggle} className="rounded p-1 text-muted-foreground">{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button>
      </div>

      {editing && (
        <div className="flex flex-wrap items-end gap-2 border-t bg-muted/20 px-3 py-3">
          <label className="text-xs"><span className="mb-1 block text-muted-foreground">名前</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 w-40 text-xs" /></label>
          <label className="text-xs"><span className="mb-1 block text-muted-foreground">色</span>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-12 rounded border" /></label>
          <label className="text-xs"><span className="mb-1 block text-muted-foreground">説明</span>
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} className="h-8 w-56 text-xs" /></label>
          <Button size="sm" onClick={save} disabled={busy} className="h-8 gap-1 text-xs">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}保存</Button>
        </div>
      )}

      {open && (
        <div className="space-y-2 border-t bg-muted/20 px-3 py-3">
          {subs.length === 0 ? (
            <p className="text-xs text-muted-foreground">サブカテゴリはまだありません。</p>
          ) : (
            <ul className="space-y-1.5">
              {subs.map((s) => <SubRow key={s.id} sub={s} onChanged={onChanged} onMsg={onMsg} />)}
            </ul>
          )}
          <AddSubForm categoryId={cat.id} count={subs.length} onAdded={onChanged} onMsg={onMsg} />
        </div>
      )}
    </div>
  );
}

/* ─────────── サブカテゴリ行 ─────────── */
function SubRow({ sub, onChanged, onMsg }: { sub: SubCategory; onChanged: () => void; onMsg: (t: string, ok: boolean) => void }) {
  const [editing, setEditing] = useState(false);
  const [showPosts, setShowPosts] = useState(false);
  const [name, setName] = useState(sub.name);
  const [desc, setDesc] = useState(sub.description);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const { ok } = await api(`/api/interop/sub-categories/${sub.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description: desc }),
    });
    setBusy(false);
    if (ok) { onMsg("サブカテゴリを更新しました。", true); setEditing(false); onChanged(); } else onMsg("更新に失敗しました。", false);
  };
  const remove = async () => {
    if (!confirm(`「${sub.name}」と投稿をすべて削除しますか？`)) return;
    const { ok } = await api(`/api/interop/sub-categories/${sub.id}`, { method: "DELETE" });
    if (ok) { onMsg("削除しました。", true); onChanged(); } else onMsg("削除に失敗しました。", false);
  };

  return (
    <li className="rounded border bg-background">
      <div className="flex items-center gap-2 px-3 py-1.5 text-sm">
        <span className="flex-1">{sub.name}</span>
        <button type="button" onClick={() => setShowPosts((v) => !v)} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground" title="投稿・記事を管理">
          <MessageSquare className="h-3.5 w-3.5" /> 投稿
        </button>
        <button type="button" onClick={() => setEditing((v) => !v)} className="rounded p-0.5 text-muted-foreground hover:text-foreground" title="編集"><Pencil className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={remove} className="rounded p-0.5 text-muted-foreground hover:text-destructive" title="削除"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
      {editing && (
        <div className="flex flex-wrap items-end gap-2 border-t bg-muted/30 px-3 py-2">
          <label className="text-xs"><span className="mb-1 block text-muted-foreground">名前</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 w-36 text-xs" /></label>
          <label className="text-xs"><span className="mb-1 block text-muted-foreground">説明</span>
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} className="h-8 w-56 text-xs" /></label>
          <Button size="sm" onClick={save} disabled={busy} className="h-8 gap-1 text-xs">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}保存</Button>
        </div>
      )}
      {showPosts && <PostManager subId={sub.id} onMsg={onMsg} />}
    </li>
  );
}

/* ─────────── サブカテゴリ追加 ─────────── */
function AddSubForm({ categoryId, count, onAdded, onMsg }: { categoryId: string; count: number; onAdded: () => void; onMsg: (t: string, ok: boolean) => void }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const add = async () => {
    if (!name.trim()) return;
    const { ok } = await api("/api/interop/sub-categories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId, name, description: desc, sortOrder: count }),
    });
    if (ok) { onMsg(`サブカテゴリ「${name}」を追加しました。`, true); setName(""); setDesc(""); onAdded(); }
    else onMsg("追加に失敗しました。", false);
  };
  return (
    <div className="flex flex-wrap items-end gap-2 pt-1">
      <label className="text-xs"><span className="mb-1 block text-muted-foreground">サブカテゴリ名</span>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="例：タイムテーブル" className="h-8 w-36 text-xs" /></label>
      <label className="text-xs"><span className="mb-1 block text-muted-foreground">説明（任意）</span>
        <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="任意" className="h-8 w-44 text-xs" /></label>
      <Button size="sm" variant="outline" onClick={add} className="h-8 gap-1 text-xs"><Plus className="h-3.5 w-3.5" /> 追加</Button>
    </div>
  );
}

/* ─────────── 投稿・記事マネージャ ─────────── */
function PostManager({ subId, onMsg }: { subId: string; onMsg: (t: string, ok: boolean) => void }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [articleTitle, setArticleTitle] = useState("運営からのお知らせ");
  const [articleBody, setArticleBody] = useState("");
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await api(`/api/interop/posts?subCategoryId=${subId}&includeHidden=true`);
    setPosts(data.posts ?? []);
    setLoading(false);
  }, [subId]);
  useEffect(() => { load(); }, [load]);

  const postArticle = async () => {
    if (!articleBody.trim()) return;
    setPosting(true);
    const { ok } = await api("/api/interop/posts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subCategoryId: subId, authorName: articleTitle.trim() || "運営", authorRole: "運営", postBody: articleBody, isPinned: true }),
    });
    setPosting(false);
    if (ok) { onMsg("記事を投稿しました。", true); setArticleBody(""); load(); } else onMsg("投稿に失敗しました。", false);
  };
  const patch = async (id: string, payload: Record<string, unknown>) => {
    const { ok } = await api(`/api/interop/posts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (ok) load(); else onMsg("更新に失敗しました。", false);
  };
  const remove = async (id: string) => {
    if (!confirm("この投稿を削除しますか？")) return;
    const { ok } = await api(`/api/interop/posts/${id}`, { method: "DELETE" });
    if (ok) { onMsg("削除しました。", true); load(); } else onMsg("削除に失敗しました。", false);
  };

  return (
    <div className="space-y-3 border-t bg-muted/30 px-3 py-3">
      {/* 記事（固定）投稿フォーム */}
      <div className="rounded-md border bg-background p-2.5">
        <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold"><Pin className="h-3.5 w-3.5" /> 記事・お知らせを投稿（上部に固定）</p>
        <Input value={articleTitle} onChange={(e) => setArticleTitle(e.target.value)} placeholder="表示名（例：運営／タイムテーブル）" className="mb-1.5 h-8 text-xs" />
        <textarea value={articleBody} onChange={(e) => setArticleBody(e.target.value)} rows={3} maxLength={1000} placeholder="本文（イベント情報・登壇者・注意事項など）" className="w-full resize-none rounded-md border px-2.5 py-1.5 text-xs" />
        <div className="mt-1.5 flex justify-end">
          <Button size="sm" onClick={postArticle} disabled={posting} className="h-8 gap-1 text-xs">
            {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} 記事を投稿
          </Button>
        </div>
      </div>

      {/* 投稿一覧 */}
      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
      ) : posts.length === 0 ? (
        <p className="text-xs text-muted-foreground">投稿はまだありません。</p>
      ) : (
        <ul className="space-y-1.5">
          {posts.map((p) => (
            <li key={p.id} className={`rounded border bg-background px-2.5 py-2 text-xs ${p.isHidden ? "opacity-50" : ""}`}>
              <div className="mb-1 flex items-center gap-1.5">
                {p.isPinned && <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700"><Pin className="h-2.5 w-2.5" />固定</span>}
                <span className="font-bold">{p.authorName}</span>
                {p.authorRole && <span className="text-muted-foreground">· {p.authorRole}</span>}
                {p.isHidden && <span className="text-[10px] text-muted-foreground">（非表示）</span>}
                <div className="ml-auto flex items-center gap-1">
                  <button type="button" onClick={() => patch(p.id, { isPinned: !p.isPinned })} className="rounded p-0.5 text-muted-foreground hover:text-foreground" title={p.isPinned ? "固定解除" : "固定する"}>
                    {p.isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                  </button>
                  <button type="button" onClick={() => patch(p.id, { isHidden: !p.isHidden })} className="rounded p-0.5 text-muted-foreground hover:text-foreground" title={p.isHidden ? "表示する" : "非表示にする"}>
                    {p.isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button type="button" onClick={() => remove(p.id)} className="rounded p-0.5 text-muted-foreground hover:text-destructive" title="削除"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <p className="whitespace-pre-wrap break-words text-foreground/90">{p.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
