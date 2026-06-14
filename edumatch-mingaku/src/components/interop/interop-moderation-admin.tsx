"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Bot, Eye, EyeOff, Loader2, ShieldAlert, Trash2 } from "lucide-react";

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
  // 全投稿表示モード（要確認のみ ↔ 全投稿の表示/非表示管理）
  const [showAll, setShowAll] = useState(false);
  // 既存投稿へのAI返信バックフィル
  const [backfilling, setBackfilling] = useState(false);
  const [backfillMsg, setBackfillMsg] = useState<string | null>(null);

  const runBackfill = async () => {
    if (!confirm("お知らせ（固定投稿）の誤AI返信を削除し、「登壇者への質問」のAI返信も削除します。一般投稿の未返信分にAI返信を付与します（登壇者への質問は除く）。実行しますか？")) return;
    setBackfilling(true);
    setBackfillMsg(null);
    const { ok, data } = await api("/api/interop/admin/backfill-ai-replies", { method: "POST" });
    setBackfilling(false);
    if (ok) {
      setBackfillMsg(
        `完了：お知らせから${data.removedFromPinned}件・登壇者への質問から${data.removedFromSpeakerQa ?? 0}件のAI返信を削除／一般投稿に${data.created}件を生成（返信率 約${data.coverage}％ / 全${data.totalGeneralPosts}件）`
      );
    } else {
      setBackfillMsg(data.error || "実行に失敗しました。");
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await api(`/api/interop/admin/flagged-posts${showAll ? "?all=1" : ""}`);
    setPosts(Array.isArray(data.posts) ? data.posts : []);
    setLoading(false);
  }, [showAll]);

  // マウント時・showAll 切替時に一覧を取得（取得中ローディング表示のため意図的に setState する）
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  // 表示/非表示の切替。全投稿モードでは一覧に残してフラグだけ更新、
  // 要確認モードでは「公開」したら一覧から外す。
  const setHidden = async (id: string, hidden: boolean) => {
    setBusy(id);
    const { ok } = await api(`/api/interop/posts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isHidden: hidden }),
    });
    if (ok) {
      if (showAll) {
        setPosts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isHidden: hidden, autoFlagged: hidden ? p.autoFlagged : false } : p))
        );
      } else if (!hidden) {
        setPosts((prev) => prev.filter((p) => p.id !== id));
      }
    }
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
    <div className="space-y-4">
      {/* 既存投稿へのAI返信バックフィル */}
      <div className="rounded-xl border border-indigo-300/20 bg-indigo-400/[0.06] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Bot className="h-5 w-5 text-indigo-300" />
          <h3 className="text-base font-bold text-white">AI返信の是正・付与</h3>
          <span className="text-xs text-white/45">お知らせの誤返信を削除・登壇者への質問はAI返信なし・一般投稿に付与</span>
          <button
            type="button"
            onClick={runBackfill}
            disabled={backfilling}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-indigo-300/40 bg-indigo-400/15 px-3 py-1.5 text-xs font-bold text-indigo-100 transition hover:bg-indigo-400/25 disabled:opacity-50"
          >
            {backfilling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
            是正＋AI返信を付与
          </button>
        </div>
        {backfillMsg && <p className="mt-2 text-xs font-medium text-indigo-100/85">{backfillMsg}</p>}
      </div>

    <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-amber-300" />
        <h3 className="text-base font-bold text-white">{showAll ? "全投稿の表示管理" : "AIモデレーション要確認"}</h3>
        <span className="text-xs text-white/45">{showAll ? "すべての投稿を表示/非表示" : "自動非表示・非表示中の投稿"}</span>
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="ml-auto rounded-lg border border-white/15 px-2.5 py-1 text-xs font-bold text-white/80 hover:bg-white/10 hover:text-white"
        >
          {showAll ? "要確認のみ表示" : "全投稿を表示"}
        </button>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-white/15 px-2.5 py-1 text-xs text-white/70 hover:bg-white/10 hover:text-white"
        >
          再読込
        </button>
      </div>

      {loading ? (
        <div className="grid place-items-center py-12 text-white/40">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <p className="py-10 text-center text-sm text-white/45">{showAll ? "投稿がありません。" : "要確認の投稿はありません。"}</p>
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
                {p.isHidden ? (
                  <button
                    type="button"
                    disabled={busy === p.id}
                    onClick={() => setHidden(p.id, false)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-400/15 px-3 py-1.5 text-xs font-bold text-emerald-200 transition hover:bg-emerald-400/25 disabled:opacity-40"
                  >
                    {busy === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                    公開する
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy === p.id}
                    onClick={() => setHidden(p.id, true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-400/15 px-3 py-1.5 text-xs font-bold text-amber-200 transition hover:bg-amber-400/25 disabled:opacity-40"
                  >
                    {busy === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <EyeOff className="h-3.5 w-3.5" />}
                    非表示にする
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy === p.id}
                  onClick={() => remove(p.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-1.5 text-xs font-bold text-red-200 transition hover:bg-red-400/20 disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" /> 削除
                </button>
                <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-white/30">
                  <Eye className="h-3 w-3" /> {p.isHidden ? "公開すると一般来場者に表示されます" : "表示中"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
    </div>
  );
}
