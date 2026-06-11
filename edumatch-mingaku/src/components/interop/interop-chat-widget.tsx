"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, Sparkles, X } from "lucide-react";

type ChatMsg = { id: string; role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "教育現場でのAI活用、どこから始めればいい？",
  "GIGAスクール構想のこれからは？",
  "生成AIを授業で使うときの注意点は？",
];

/** Interop特設ページ向けの来場者AIチャット（ログイン不要・1人24hで15回） */
export function InteropChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/interop/chat")
      .then((r) => r.json())
      .then((d) => { if (typeof d.used === "number") setUsage({ used: d.used, limit: d.limit }); })
      .catch(() => {});
    setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || streaming) return;
    setError(null);
    const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: "user", content: q };
    const aiId = `a-${Date.now()}`;
    const history = [...messages, userMsg];
    setMessages([...history, { id: aiId, role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    try {
      const res = await fetch("/api/interop/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.map((m) => ({ role: m.role, content: m.content })) }),
      });

      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({} as { error?: string }));
        setError(d?.error || "送信に失敗しました。");
        setMessages((prev) => prev.filter((m) => m.id !== aiId));
        setStreaming(false);
        return;
      }

      const used = res.headers.get("X-Usage-Used");
      const limit = res.headers.get("X-Usage-Limit");
      if (used && limit) setUsage({ used: Number(used), limit: Number(limit) });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => prev.map((m) => (m.id === aiId ? { ...m, content: acc } : m)));
      }
    } catch {
      setError("通信エラーが発生しました。");
      setMessages((prev) => prev.filter((m) => m.id !== aiId));
    } finally {
      setStreaming(false);
    }
  };

  const reachedLimit = usage ? usage.used >= usage.limit : false;

  return (
    <>
      {/* 起動ボタン（右下・固定） */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="absolute right-3 top-[5.25rem] z-50 flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold text-white shadow-lg transition hover:scale-105"
          style={{
            background: "linear-gradient(135deg, rgba(120,150,255,0.95) 0%, rgba(90,110,230,0.95) 100%)",
            border: "1px solid rgba(190,205,255,0.5)",
            boxShadow: "0 6px 22px rgba(80,100,230,0.45)",
          }}
        >
          <Sparkles className="h-4 w-4" /> AIに質問
        </button>
      )}

      {/* チャットパネル */}
      {open && (
        <div
          className="absolute inset-x-0 bottom-0 z-50 mx-auto flex h-[78dvh] max-h-[640px] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl sm:inset-x-auto sm:right-4 sm:bottom-4 sm:h-[600px] sm:w-[400px] sm:rounded-3xl"
          style={{
            background: "rgba(8,12,32,0.92)",
            border: "1px solid rgba(255,255,255,0.14)",
            backdropFilter: "blur(28px) saturate(1.4)",
            WebkitBackdropFilter: "blur(28px) saturate(1.4)",
            boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
          }}
        >
          {/* ヘッダ */}
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-500">
              <Bot className="h-4 w-4 text-white" />
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white">教育AIアシスタント</span>
              <span className="text-[10px] text-white/45">ログイン不要 · 公的資料を参照</span>
            </div>
            {usage && (
              <span className="ml-auto rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-bold text-white/55">
                残り {Math.max(0, usage.limit - usage.used)}/{usage.limit}
              </span>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ml-1 grid h-8 w-8 place-items-center rounded-full text-white/55 transition hover:bg-white/10 hover:text-white"
              aria-label="閉じる"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* メッセージ */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <div className="flex flex-col gap-3 pt-6">
                <p className="text-center text-sm text-white/55">
                  教育とAIについて、なんでも聞いてください。
                </p>
                <div className="flex flex-col gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="rounded-xl border border-white/12 bg-white/[0.05] px-3 py-2 text-left text-[12.5px] text-white/80 transition hover:bg-white/10 hover:text-white"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                      m.role === "user" ? "text-white" : "text-white/90"
                    }`}
                    style={
                      m.role === "user"
                        ? { background: "linear-gradient(135deg, rgba(120,150,255,0.9), rgba(90,110,230,0.9))" }
                        : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }
                    }
                  >
                    {m.content || (streaming && <Loader2 className="h-3.5 w-3.5 animate-spin text-white/50" />)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 入力 */}
          <div className="border-t border-white/10 px-3 py-3">
            {error && <p className="mb-2 px-1 text-xs text-rose-300">{error}</p>}
            {reachedLimit ? (
              <p className="px-1 py-2 text-center text-xs text-amber-200/80">
                本日の利用上限に達しました。また明日ご利用ください。
              </p>
            ) : (
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
                  }}
                  placeholder="メッセージを入力…"
                  rows={1}
                  maxLength={1500}
                  className="max-h-28 flex-1 resize-none rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2.5 text-[13px] text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => send(input)}
                  disabled={!input.trim() || streaming}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white transition disabled:opacity-35"
                  style={{ background: "linear-gradient(135deg, rgba(120,150,255,0.95), rgba(90,110,230,0.95))" }}
                  aria-label="送信"
                >
                  {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
