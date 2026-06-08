"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, Send, X } from "lucide-react";

type Post = {
  id: string;
  subCategoryId: string;
  authorName: string;
  authorRole: string;
  body: string;
  postedAt: string;
};

type SubCategory = {
  id: string;
  name: string;
  description: string;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "たった今";
  if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間前`;
  const d = Math.floor(h / 24);
  return `${d}日前`;
}

/** サブカテゴリの掲示板（井戸端風）。来場者がログイン不要で投稿できる。 */
export function InteropBoardPanel({
  sub,
  accent,
  onClose,
}: {
  sub: SubCategory;
  accent: string;
  onClose: () => void;
}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/interop/posts?subCategoryId=${sub.id}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled && Array.isArray(d.posts)) setPosts(d.posts); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sub.id]);

  // 名前をローカルに保持
  useEffect(() => {
    try {
      const saved = localStorage.getItem("interop_author_name");
      if (saved) setName(saved);
    } catch { /* noop */ }
  }, []);

  async function submit() {
    const trimmed = bodyText.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/interop/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subCategoryId: sub.id,
          authorName: name.trim() || "匿名",
          postBody: trimmed,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "投稿に失敗しました");
        return;
      }
      setPosts((prev) => [data.post, ...prev]);
      setBodyText("");
      try { localStorage.setItem("interop_author_name", name.trim()); } catch { /* noop */ }
      listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      {/* 背景 */}
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      {/* パネル本体 */}
      <div
        className="relative z-10 flex h-[82dvh] w-full flex-col overflow-hidden rounded-t-3xl border-t bg-[#0b0826] text-white shadow-2xl sm:h-[72vh] sm:max-w-lg sm:rounded-3xl sm:border"
        style={{ borderColor: `${accent}55` }}
      >
        {/* ヘッダー */}
        <div
          className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4"
          style={{ background: `linear-gradient(180deg, ${accent}18 0%, transparent 100%)` }}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: accent }}>
              <MessageCircle className="h-3.5 w-3.5" /> 掲示板
            </div>
            <h3 className="mt-0.5 truncate text-lg font-bold">{sub.name}</h3>
            {sub.description && (
              <p className="mt-0.5 line-clamp-2 text-xs text-white/55">{sub.description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="閉じる"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 投稿一覧 */}
        <div ref={listRef} className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="grid h-full place-items-center text-white/50">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div className="grid h-full place-items-center px-6 text-center text-sm text-white/45">
              まだ投稿がありません。<br />最初のひとことを書いてみよう。
            </div>
          ) : (
            <ul className="space-y-3">
              {posts.map((p) => (
                <li
                  key={p.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
                >
                  <div className="flex items-center gap-2 text-xs text-white/55">
                    <span className="font-bold text-white/85">{p.authorName}</span>
                    {p.authorRole && <span className="text-white/40">· {p.authorRole}</span>}
                    <span className="ml-auto shrink-0">{timeAgo(p.postedAt)}</span>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-white/90">
                    {p.body}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 入力フォーム */}
        <div className="border-t border-white/10 bg-[#0b0826] px-4 py-3">
          {error && <p className="mb-2 text-xs text-rose-300">{error}</p>}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="お名前（任意・空欄なら匿名）"
            maxLength={40}
            className="mb-2 w-full rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-white/30 focus:outline-none"
          />
          <div className="flex items-end gap-2">
            <textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
              }}
              placeholder="ひとこと書く…"
              rows={2}
              maxLength={1000}
              className="flex-1 resize-none rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-white/30 focus:outline-none"
            />
            <button
              type="button"
              onClick={submit}
              disabled={submitting || !bodyText.trim()}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl font-bold text-white transition disabled:opacity-40"
              style={{ background: accent }}
              aria-label="投稿する"
            >
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
