"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, FileText, Loader2, Search, Send, X } from "lucide-react";

type DocRef = { title: string; url: string | null };
type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  ragHits?: number;
  ragDocRefs?: DocRef[];
};

// エデュマッチ本サイトに合わせたオレンジ配色
const ORANGE_GRAD = "linear-gradient(135deg, rgba(255,150,56,0.97) 0%, rgba(236,104,26,0.97) 100%)";

// 思考プロセスの段階表示（リアルタイム検索→考え→回答）
const THINK_STEPS = [
  "質問を読み取っています…",
  "関連する公的資料をリアルタイム検索中…",
  "資料を読み込んで考えています…",
  "回答を作成しています…",
];

function parseDocRefs(raw: string | null): DocRef[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(decodeURIComponent(raw));
    if (!Array.isArray(arr)) return [];
    return arr.filter((r) => r && typeof r.title === "string");
  } catch {
    return [];
  }
}

const SUGGESTIONS = [
  "教育現場でのAI活用、どこから始めればいい？",
  "GIGAスクール構想のこれからは？",
  "生成AIを授業で使うときの注意点は？",
];

/** Interop特設ページ向けの来場者AIチャット（ログイン不要・1人24hで15回）。
 *  全ページ共通で出すため fixed 配置。下部に投稿バーがあるページは mobileRaise で
 *  スマホの起動ボタンを少し上げてバーとの重なりを防ぐ。 */
export function InteropChatWidget({
  mobileRaise = false,
  context,
}: {
  mobileRaise?: boolean;
  /** 来場者が今見ている場所（カテゴリ/サブカテゴリ/論点名など）。AIに文脈として渡す。 */
  context?: string;
} = {}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  // 思考プロセス（回答の最初の文字が来るまでの「検索中／考え中」表示）
  const [thinking, setThinking] = useState(false);
  const [thinkStep, setThinkStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!thinking) return;
    setThinkStep(0);
    const t = setInterval(() => setThinkStep((s) => Math.min(s + 1, THINK_STEPS.length - 1)), 1100);
    return () => clearInterval(t);
  }, [thinking]);

  useEffect(() => {
    if (!open) return;
    // 回数制限なし。開いたら入力にフォーカスするだけ。
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
    setThinking(true);

    try {
      const res = await fetch("/api/interop/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          context: context?.trim() || undefined,
        }),
      });

      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({} as { error?: string }));
        setError(d?.error || "送信に失敗しました。");
        setMessages((prev) => prev.filter((m) => m.id !== aiId));
        setStreaming(false);
        setThinking(false);
        return;
      }

      // リアルタイム検索の結果（参照した公的文書）をメッセージに付与
      const ragHits = parseInt(res.headers.get("X-RAG-Knowledge-Hits") ?? "0", 10);
      const ragDocRefs = parseDocRefs(res.headers.get("X-RAG-Doc-Refs"));
      if (ragHits > 0) {
        setMessages((prev) => prev.map((m) => (m.id === aiId ? { ...m, ragHits, ragDocRefs } : m)));
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        if (acc) setThinking(false); // 最初の文字が来たら思考表示を終了
        setMessages((prev) => prev.map((m) => (m.id === aiId ? { ...m, content: acc } : m)));
      }
    } catch {
      setError("通信エラーが発生しました。");
      setMessages((prev) => prev.filter((m) => m.id !== aiId));
    } finally {
      setStreaming(false);
      setThinking(false);
    }
  };

  return (
    <>
      {/* 起動ボタン：スマホ＝右下の丸ピル／PC＝画面右端に貼り付く縦長オレンジバー（本サイトのAIナビゲーター風） */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`group fixed right-4 z-50 flex items-center justify-center rounded-full px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:scale-105 ${mobileRaise ? "bottom-28" : "bottom-5"} sm:inset-y-0 sm:bottom-0 sm:right-0 sm:h-full sm:w-12 sm:rounded-none sm:px-0 sm:py-0 sm:hover:scale-100 sm:hover:w-14`}
          style={{
            background: ORANGE_GRAD,
            borderLeft: "1px solid rgba(255,205,150,0.6)",
            boxShadow: "-4px 0 22px rgba(235,120,30,0.4)",
          }}
          aria-label="AIに質問"
        >
          <span className="flex items-center gap-2 sm:flex-col sm:gap-3">
            <Bot className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" />
            <span className="sm:[writing-mode:vertical-rl] sm:[text-orientation:upright] sm:text-[15px] sm:tracking-[0.14em]">
              AIに質問
            </span>
          </span>
        </button>
      )}

      {/* チャットパネル */}
      {open && (
        <div
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex h-[80dvh] max-h-[680px] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl sm:inset-y-0 sm:left-auto sm:right-0 sm:bottom-0 sm:mx-0 sm:h-full sm:max-h-none sm:w-[400px] sm:rounded-none sm:rounded-l-3xl"
          style={{
            background: "rgba(8,12,32,0.94)",
            border: "1px solid rgba(255,180,110,0.28)",
            backdropFilter: "blur(28px) saturate(1.4)",
            WebkitBackdropFilter: "blur(28px) saturate(1.4)",
            boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
          }}
        >
          {/* ヘッダ */}
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-orange-400 to-amber-500">
              <Bot className="h-4 w-4 text-white" />
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white">教育AIアシスタント</span>
              <span className="text-[10px] text-white/45">ログイン不要 · 公的資料を参照</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ml-auto grid h-8 w-8 place-items-center rounded-full text-white/55 transition hover:bg-white/10 hover:text-white"
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
              messages.map((m, idx) => {
                const isLast = idx === messages.length - 1;
                const showThinking = m.role === "assistant" && !m.content && thinking && isLast;
                return (
                  <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] break-words rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                        m.role === "user" ? "whitespace-pre-wrap text-white" : "text-white/90"
                      }`}
                      style={
                        m.role === "user"
                          ? { background: ORANGE_GRAD }
                          : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }
                      }
                    >
                      {showThinking ? (
                        /* 思考プロセス（リアルタイム検索→考え→回答） */
                        <div className="flex flex-col gap-1.5 py-0.5">
                          <span className="flex items-center gap-1.5 text-[12px] font-medium text-amber-200/90">
                            <Search className="h-3.5 w-3.5 animate-pulse" />
                            {THINK_STEPS[thinkStep]}
                          </span>
                          <span className="flex items-center gap-1 pl-0.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:0ms]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:150ms]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:300ms]" />
                          </span>
                        </div>
                      ) : (
                        <span className="whitespace-pre-wrap">
                          {m.content || (streaming && isLast && <Loader2 className="h-3.5 w-3.5 animate-spin text-white/50" />)}
                        </span>
                      )}

                      {/* リアルタイム検索で参照した公的文書（出典） */}
                      {m.role === "assistant" && (m.ragHits ?? 0) > 0 && (
                        <div className="mt-2 rounded-xl border border-amber-300/25 bg-amber-300/[0.07] px-2.5 py-2">
                          <p className="flex items-center gap-1.5 text-[11px] font-bold text-amber-200/90">
                            <FileText className="h-3 w-3" /> 公的文書を参照して回答（{m.ragHits}件）
                          </p>
                          {(m.ragDocRefs ?? []).length > 0 && (
                            <ul className="mt-1.5 space-y-1">
                              {(m.ragDocRefs ?? []).map((ref, i) =>
                                ref.url ? (
                                  <li key={i}>
                                    <a
                                      href={ref.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="line-clamp-1 text-[11.5px] text-amber-100/80 underline-offset-2 hover:text-amber-100 hover:underline"
                                    >
                                      ・{ref.title}
                                    </a>
                                  </li>
                                ) : (
                                  <li key={i} className="line-clamp-1 text-[11.5px] text-amber-100/70">・{ref.title}</li>
                                )
                              )}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 入力 */}
          <div className="border-t border-white/10 px-3 py-3">
            {error && <p className="mb-2 px-1 text-xs text-rose-300">{error}</p>}
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
                  style={{ background: ORANGE_GRAD }}
                  aria-label="送信"
                >
                  {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
