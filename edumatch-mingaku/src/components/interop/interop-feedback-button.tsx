"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Send } from "lucide-react";

const OPINION_SLUG = "opinion-box";

/** インタロップマップ下部の常設ご意見フォーム（来場者向け・ログイン不要） */
export function InteropFeedbackButton() {
  const [expanded, setExpanded] = useState(false);
  const [subId, setSubId] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [role, setRole] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (expanded) setTimeout(() => textareaRef.current?.focus(), 120);
  }, [expanded]);

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
      setTimeout(() => { setDone(false); setExpanded(false); }, 2800);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="absolute bottom-0 inset-x-0 z-40"
      style={{ animation: "itmFadeIn 0.5s ease-out 0.3s both" }}
    >
      {/* トグルタブ */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mb-0 flex items-center gap-1.5 rounded-t-2xl px-5 py-1.5 text-[12px] font-bold text-white/80 transition hover:text-white"
          style={{
            background: "rgba(10,16,42,0.72)",
            border: "1px solid rgba(255,255,255,0.16)",
            borderBottom: "none",
            backdropFilter: "blur(16px)",
          }}
        >
          💬 ご意見を書く
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* フォーム本体 */}
      <div
        style={{
          background: "rgba(10,16,42,0.78)",
          border: "1px solid rgba(255,255,255,0.16)",
          borderBottom: "none",
          backdropFilter: "blur(28px) saturate(1.4)",
          WebkitBackdropFilter: "blur(28px) saturate(1.4)",
          overflow: "hidden",
          maxHeight: expanded ? "220px" : "0px",
          transition: "max-height 0.3s ease-in-out",
        }}
      >
        {done ? (
          <div className="flex items-center justify-center gap-2 py-4 text-sm font-semibold text-emerald-300">
            <Send className="h-4 w-4" /> ありがとうございました！
          </div>
        ) : (
          <div className="px-4 pb-4 pt-3">
            {/* 上端グロスライン */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.28) 30%, rgba(255,255,255,0.38) 70%, transparent)" }} />

            <div className="mb-2.5 flex gap-2">
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="ニックネーム"
                maxLength={40}
                className="h-9 flex-1 rounded-xl border border-white/20 bg-white/[0.08] px-3 text-sm text-white placeholder:text-white/30 focus:border-white/35 focus:outline-none"
              />
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="肩書き・属性"
                maxLength={60}
                className="h-9 flex-1 rounded-xl border border-white/20 bg-white/[0.08] px-3 text-sm text-white placeholder:text-white/30 focus:border-white/35 focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <textarea
                ref={textareaRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="ご意見・ご感想を入力…（ログイン不要）"
                rows={2}
                maxLength={1000}
                className="flex-1 resize-none rounded-xl border border-white/20 bg-white/[0.08] px-3 py-2 text-sm leading-6 text-white placeholder:text-white/30 focus:border-white/35 focus:outline-none"
              />
              <button
                type="button"
                onClick={submit}
                disabled={!canSubmit}
                className="flex h-[68px] w-12 shrink-0 items-center justify-center rounded-xl text-white transition disabled:opacity-35"
                style={{
                  background: "linear-gradient(135deg, rgba(120,150,255,0.90) 0%, rgba(90,110,230,0.90) 100%)",
                  border: "1px solid rgba(190,205,255,0.45)",
                }}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
            {error && <p className="mt-1.5 text-xs text-red-300">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
