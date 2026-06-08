"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, MessageCircle, Send } from "lucide-react";
import { InteropBackdrop } from "@/components/interop/interop-backdrop";
import type { InteropThemeMode } from "@/lib/interop-settings";

type Post = {
  id: string;
  authorName: string;
  authorRole: string;
  body: string;
  postedAt: string;
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

/** サブカテゴリ別ページの掲示板（上＝コンテンツ、下＝投稿欄）。来場者はログイン不要で投稿。 */
export function InteropBoard({
  sub,
  accent,
  themeMode = "auto",
}: {
  sub: { id: string; name: string; description: string; categoryId: string; categoryName: string };
  accent: string;
  themeMode?: InteropThemeMode;
}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/interop/posts?subCategoryId=${sub.id}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled && Array.isArray(d.posts)) setPosts(d.posts); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sub.id]);

  // 名前は入力のたびに保持し、別カテゴリ／別ページでも自動入力する（リロードでも維持）
  useEffect(() => {
    try {
      const saved = localStorage.getItem("interop_author_name");
      if (saved) setName(saved);
    } catch { /* noop */ }
  }, []);

  const updateName = (value: string) => {
    setName(value);
    try { localStorage.setItem("interop_author_name", value); } catch { /* noop */ }
  };

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
      if (!res.ok) { setError(data.error || "投稿に失敗しました"); return; }
      setPosts((prev) => [data.post, ...prev]);
      setBodyText("");
      listTopRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-[100dvh] w-full bg-[#070a1c] text-white">
      <InteropBackdrop themeMode={themeMode} />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col px-4 pb-28 pt-4 sm:px-6">
        {/* 戻る（大カテゴリ／マップ） */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/?cat=${sub.categoryId}`}
            prefetch={false}
            className="inline-flex w-fit items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold text-white/85 backdrop-blur transition-colors hover:brightness-110"
            style={{ background: `${accent}22`, borderColor: `${accent}66` }}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {sub.categoryName}に戻る
          </Link>
          <Link
            href="/"
            prefetch={false}
            className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-xs font-bold text-white/70 backdrop-blur transition-colors hover:bg-white/12 hover:text-white"
          >
            マップ全体
          </Link>
        </div>

        {/* ════ 画面上部：コンテンツ ════ */}
        <header
          className="mt-4 rounded-3xl border px-5 py-6"
          style={{
            background: "rgba(8,11,32,0.72)",
            borderColor: `${accent}44`,
            boxShadow: `0 0 30px ${accent}1f`,
            backdropFilter: "blur(8px)",
          }}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: accent }}>
            <MessageCircle className="h-3.5 w-3.5" /> {sub.categoryName}
          </div>
          <h1 className="mt-1 text-2xl font-bold leading-tight">{sub.name}</h1>
          {sub.description && (
            <p className="mt-2 text-sm leading-relaxed text-white/70">{sub.description}</p>
          )}
        </header>

        {/* ════ その下：投稿一覧 ════ */}
        <div ref={listTopRef} className="mt-6 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white/80">みんなの投稿</h2>
          <span className="text-xs text-white/40">{posts.length}件</span>
        </div>

        <div className="mt-3 flex-1">
          {loading ? (
            <div className="grid place-items-center py-16 text-white/50">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div className="grid place-items-center py-16 text-center text-sm text-white/45">
              まだ投稿がありません。<br />最初のひとことを書いてみよう。
            </div>
          ) : (
            <ul className="space-y-3">
              {posts.map((p) => (
                <li key={p.id} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
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
      </div>

      {/* ════ 最下部：投稿欄（固定） ════ */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#070a1c]/95 backdrop-blur">
        <div className="mx-auto w-full max-w-2xl px-4 py-3 sm:px-6">
          {error && <p className="mb-2 text-xs text-rose-300">{error}</p>}
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-2">
              <input
                value={name}
                onChange={(e) => updateName(e.target.value)}
                placeholder="お名前（任意・空欄なら匿名）"
                maxLength={40}
                className="w-full rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-white/30 focus:outline-none"
              />
              <textarea
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit(); }}
                placeholder="ひとこと書く…"
                rows={2}
                maxLength={1000}
                className="w-full resize-none rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-white/30 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={submitting || !bodyText.trim()}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl font-bold text-white transition disabled:opacity-40"
              style={{ background: accent }}
              aria-label="投稿する"
            >
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
