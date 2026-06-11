"use client";

import { useEffect, useState } from "react";
import { Loader2, MessageSquarePlus, Send, X } from "lucide-react";

const OPINION_SLUG = "opinion-box";

/** トップ常設の「ご意見ボックス」ボタン＋投稿モーダル（来場者向け・ログイン不要） */
export function InteropFeedbackButton() {
  const [open, setOpen] = useState(false);
  const [subId, setSubId] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [role, setRole] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ご意見ボックス用サブカテゴリIDを解決
  useEffect(() => {
    let cancelled = false;
    fetch("/api/interop/categories")
      .then((r) => r.json())
      .then((d) => {
        const cat = Array.isArray(d.categories)
          ? d.categories.find((c: { slug: string }) => c.slug === OPINION_SLUG)
          : null;
        if (!cat || cancelled) return;
        return fetch(`/api/interop/sub-categories?categoryId=${cat.id}`)
          .then((r) => r.json())
          .then((s) => {
            if (!cancelled && Array.isArray(s.subCategories) && s.subCategories[0]) {
              setSubId(s.subCategories[0].id);
            }
          });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const canSubmit = !!nickname.trim() && !!role.trim() && !!body.trim() && !!subId && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/interop/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subCategoryId: subId,
          authorName: nickname.trim(),
          authorRole: role.trim(),
          postBody: body.trim(),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({} as { error?: string }));
        setError(d?.error || "送信に失敗しました。");
        return;
      }
      setDone(true);
      setBody("");
    } finally {
      setSubmitting(false);
    }
  };

  const close = () => {
    setOpen(false);
    setDone(false);
    setError(null);
  };

  return (
    <>
      {/* 常設ボタン */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-4 z-40 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95 sm:bottom-6 sm:right-6"
        style={{
          background: "linear-gradient(135deg, rgba(120,150,255,0.95) 0%, rgba(90,110,230,0.95) 100%)",
          border: "1px solid rgba(190,205,255,0.6)",
          boxShadow: "0 0 24px rgba(120,150,255,0.45), 0 6px 18px rgba(0,0,0,0.3)",
          backdropFilter: "blur(8px)",
        }}
        aria-label="ご意見を書く"
      >
        <MessageSquarePlus className="h-5 w-5" />
        <span className="hidden sm:inline">ご意見を書く</span>
      </button>

      {/* モーダル */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          style={{ background: "rgba(4,6,20,0.6)", backdropFilter: "blur(4px)" }}
          onClick={close}
        >
          <div
            className="relative m-0 w-full max-w-md overflow-hidden rounded-t-3xl sm:m-4 sm:rounded-3xl"
            style={{
              background: "linear-gradient(160deg, #131a36 0%, #0d1225 100%)",
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "0 0 40px rgba(80,110,220,0.3), 0 12px 40px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-2">
                <MessageSquarePlus className="h-5 w-5 text-[#9fb4ff]" />
                <h2 className="text-base font-bold text-white">ご意見ボックス</h2>
              </div>
              <button type="button" onClick={close} className="rounded-full p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white" aria-label="閉じる">
                <X className="h-4 w-4" />
              </button>
            </div>

            {done ? (
              <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-[#4860d8]/30">
                  <Send className="h-6 w-6 text-[#9fb4ff]" />
                </div>
                <p className="text-base font-bold text-white">ありがとうございました！</p>
                <p className="text-sm text-white/60">いただいたご意見は運営の励みになります。</p>
                <button
                  type="button"
                  onClick={close}
                  className="mt-2 rounded-full bg-white/10 px-6 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  閉じる
                </button>
              </div>
            ) : (
              <div className="px-5 py-4">
                <p className="mb-4 text-xs text-white/55">
                  教育AIサミット・ブースの感想やご意見をお寄せください。ログインは不要です。
                </p>
                <div className="mb-3 flex gap-2">
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="ニックネーム"
                    maxLength={40}
                    className="h-10 flex-1 rounded-xl border border-white/20 bg-white/[0.08] px-3 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-white/35"
                  />
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="肩書き・属性"
                    maxLength={60}
                    className="h-10 flex-1 rounded-xl border border-white/20 bg-white/[0.08] px-3 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-white/35"
                  />
                </div>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="ご意見・ご感想を入力…"
                  rows={4}
                  maxLength={1000}
                  className="w-full resize-none rounded-xl border border-white/20 bg-white/[0.08] px-3 py-2.5 text-sm leading-6 text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-white/35"
                />
                {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button type="button" onClick={close} className="rounded-full px-4 py-2 text-sm text-white/60 transition hover:text-white">
                    キャンセル
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={!canSubmit}
                    className="flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-bold text-white transition disabled:opacity-40"
                    style={{
                      background: "linear-gradient(135deg, rgba(120,150,255,0.95) 0%, rgba(90,110,230,0.95) 100%)",
                      border: "1px solid rgba(190,205,255,0.5)",
                    }}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    送信
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
