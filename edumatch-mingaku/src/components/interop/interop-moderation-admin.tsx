"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, Eye, Loader2, ShieldAlert, Trash2 } from "lucide-react";

type FlaggedPost = {
  id: string;
  authorName: string;
  authorRole: string;
  body: string;
  isHidden: boolean;
  autoFlagged: boolean;
  flagReason: string;
  categoryName: string;
  subCategoryName: string;
  postedAt: string;
};

async function api(url: string, opts?: RequestInit) {
  const res = await fetch(url, { credentials: "include", ...opts });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

/** AIモデレーションで自動非表示になった投稿のレビュー（公開する / 削除する） */
export function InteropModerationAdmin() {
  const [posts, setPosts] = useState<FlaggedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await api("/api/interop/admin/flagged-posts");
    setPosts(Array.isArray(data.posts) ? data.posts : []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const publish = async (id: string) => {
    setBusy(id);
    const { ok } = await api(`/api/interop/posts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isHidden: false }),
    });
    if (ok) setPosts((prev) => prev.filter((p) => p.id !== id));
    setBusy(null);
  };

  const remove = async (id: string) => {
    if (!confirm("この投稿を完全に削除しますか？")) return;
    setBusy(id);
    const { ok } = await api(`/api/interop/posts/${id}`, { method: "DELETE" });
    if (ok) setPosts((prev) => prev.filter((p) => p.id !== id));
    setBusy(null);
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-amber-300" />
        <h3 className="text-base font-bold text-white">AIモデレーション要確認</h3>
        <span className="text-xs text-white/45">自動非表示・非表示中の投稿</span>
        <button
          type="button"
          onClick={() => void load()}
          className="ml-auto rounded-lg border border-white/15 px-2.5 py-1 text-xs text-white/70 hover:bg-white/10 hover:text-white"
        >
          再読込
        </button>
      </div>

      {loading ? (
        <div className="grid place-items-center py-12 text-white/40">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <p className="py-10 text-center text-sm text-white/45">要確認の投稿はありません。</p>
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => (
            <li key={p.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-white/55">
                {p.autoFlagged && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold text-amber-200">
                    <AlertTriangle className="h-3 w-3" /> AI自動非表示
                  </span>
                )}
                {p.isHidden && !p.autoFlagged && (
                  <span className="rounded-full border border-white/20 bg-white/5 px-2 py-0.5 text-[10px] text-white/50">非表示中</span>
                )}
                <span className="font-bold text-white/85">{p.authorName}</span>
                {p.authorRole && <span className="text-white/40">· {p.authorRole}</span>}
                <span className="text-white/30">／ {p.categoryName} ＞ {p.subCategoryName}</span>
                <span className="ml-auto text-white/30">{new Date(p.postedAt).toLocaleString("ja-JP")}</span>
              </div>

              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-white/90">{p.body}</p>

              {p.flagReason && (
                <p className="mt-2 rounded-md border border-amber-400/20 bg-amber-400/5 px-2.5 py-1.5 text-[11px] text-amber-100/80">
                  <span className="font-bold">AI判定理由:</span> {p.flagReason}
                </p>
              )}

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={busy === p.id}
                  onClick={() => publish(p.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-400/15 px-3 py-1.5 text-xs font-bold text-emerald-200 transition hover:bg-emerald-400/25 disabled:opacity-40"
                >
                  {busy === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  公開する（問題なし）
                </button>
                <button
                  type="button"
                  disabled={busy === p.id}
                  onClick={() => remove(p.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-1.5 text-xs font-bold text-red-200 transition hover:bg-red-400/20 disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" /> 削除
                </button>
                <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-white/30">
                  <Eye className="h-3 w-3" /> 公開すると一般来場者に表示されます
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
