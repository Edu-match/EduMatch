"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  Send,
  X,
  ChevronLeft,
  BookOpen,
  Package,
  History,
  Trash2,
  Check,
  Loader2,
  MessageSquare,
  Plus,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { RecentViewItem } from "@/app/_actions/view-history";

const CONTEXT_MAX = 10;
const CHAT_WIDTH = 420;
const CHAT_HEIGHT = 700;
const AI_NAV_DISCLAIMER_PATH = "/help/ai-navigator-disclaimer";

type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
};

type ContextItem = {
  id: string;
  type: "article" | "service";
  title: string;
};

type PageContext = {
  id: string;
  type: "article" | "service";
} | null;

type View = "chat" | "context-select" | "history-select";

function parsePageContext(pathname: string): PageContext {
  const articleMatch = pathname.match(/^\/articles\/([^/]+)$/);
  if (articleMatch) return { id: articleMatch[1], type: "article" };
  const serviceMatch = pathname.match(/^\/services\/([^/]+)$/);
  if (serviceMatch) return { id: serviceMatch[1], type: "service" };
  return null;
}

function MarkdownContent({ text }: { text: string }) {
  const html = useMemo(() => {
    let result = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    result = result.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    result = result.replace(
      /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g,
      "<em>$1</em>"
    );
    result = result.replace(/`([^`]+)`/g, '<code class="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>');

    const lines = result.split("\n");
    const processed: string[] = [];
    let inList = false;
    let listType: "ul" | "ol" | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      if (/^#{1,3}\s/.test(trimmed)) {
        if (inList) { processed.push(listType === "ol" ? "</ol>" : "</ul>"); inList = false; listType = null; }
        const level = trimmed.match(/^(#{1,3})/)?.[1].length ?? 1;
        const content = trimmed.replace(/^#{1,3}\s+/, "");
        const size = level === 1 ? "text-base font-bold" : level === 2 ? "text-sm font-bold" : "text-sm font-semibold";
        processed.push(`<p class="${size} mt-2 mb-1">${content}</p>`);
        continue;
      }

      if (/^[-*]\s/.test(trimmed)) {
        if (!inList || listType !== "ul") {
          if (inList) processed.push(listType === "ol" ? "</ol>" : "</ul>");
          processed.push('<ul class="list-disc pl-5 space-y-0.5 my-1">');
          inList = true;
          listType = "ul";
        }
        processed.push(`<li>${trimmed.replace(/^[-*]\s+/, "")}</li>`);
        continue;
      }

      if (/^\d+\.\s/.test(trimmed)) {
        if (!inList || listType !== "ol") {
          if (inList) processed.push(listType === "ol" ? "</ol>" : "</ul>");
          processed.push('<ol class="list-decimal pl-5 space-y-0.5 my-1">');
          inList = true;
          listType = "ol";
        }
        processed.push(`<li>${trimmed.replace(/^\d+\.\s+/, "")}</li>`);
        continue;
      }

      if (inList) {
        processed.push(listType === "ol" ? "</ol>" : "</ul>");
        inList = false;
        listType = null;
      }

      if (trimmed === "") {
        processed.push("<br/>");
      } else {
        processed.push(`<p class="my-0.5">${trimmed}</p>`);
      }
    }

    if (inList) {
      processed.push(listType === "ol" ? "</ol>" : "</ul>");
    }

    return processed.join("");
  }, [text]);

  return (
    <div
      className="text-sm leading-relaxed [&_p]:mb-0.5 [&_ul]:mb-1 [&_ol]:mb-1 [&_br]:leading-tight prose prose-sm dark:prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function ChatbotWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("chat");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [viewHistory, setViewHistory] = useState<RecentViewItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [pendingHistorySelection, setPendingHistorySelection] = useState<Set<string>>(new Set());
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [hasAgreed, setHasAgreed] = useState(false);
  const [agreeLoading, setAgreeLoading] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const pageContext = useMemo(() => parsePageContext(pathname), [pathname]);

  const fetchAuth = useCallback(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.profile?.id) {
          setUserId(d.profile.id);
          setHasAgreed(!!d.ai_navigator_agreed);
        } else {
          setUserId(null);
          setHasAgreed(false);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchAuth();
  }, [fetchAuth]);

  useEffect(() => {
    if (open) fetchAuth();
  }, [open, fetchAuth]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    });
  }, []);

  useEffect(() => {
    if (open) scrollToBottom();
  }, [open, messages.length, scrollToBottom]);

  useEffect(() => {
    if (open && view === "chat" && textareaRef.current) textareaRef.current.focus();
  }, [open, view]);

  useEffect(() => {
    if (!open || !userId) return;
    fetch("/api/chat")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.used === "number" && typeof d.limit === "number") {
          setUsage({ used: d.used, limit: d.limit });
        }
      })
      .catch(() => {});
  }, [open, userId, messages.length]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // 問い合わせフォーム等の「AIチャットを開く」ボタンから開けるようにする
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-ai-chat", handler);
    return () => window.removeEventListener("open-ai-chat", handler);
  }, []);

  const welcomeMessage = "今日は何を話しましょうか？教育ICTやサービスについて何でもお聞きください。";

  async function handleAgree() {
    setAgreeLoading(true);
    try {
      const res = await fetch("/api/auth/ai-navigator-agree", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && !data.error) {
        setHasAgreed(true);
      } else {
        console.error("同意の保存に失敗:", data.error || res.statusText);
      }
    } catch (e) {
      console.error("同意の保存に失敗:", e);
    } finally {
      setAgreeLoading(false);
    }
  }

  async function fetchHistory() {
    if (!userId) return;
    setHistoryLoading(true);
    try {
      const { getRecentViewHistory } = await import("@/app/_actions/view-history");
      const items = await getRecentViewHistory(userId, 20);
      setViewHistory(items);
      setPendingHistorySelection(new Set(contextItems.map((c) => c.id)));
    } catch (e) {
      console.error("Failed to fetch view history:", e);
    } finally {
      setHistoryLoading(false);
    }
  }

  function toggleHistoryItem(item: RecentViewItem) {
    setPendingHistorySelection((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else if (next.size < CONTEXT_MAX) next.add(item.id);
      return next;
    });
  }

  function confirmHistorySelection() {
    const selected = viewHistory.filter((h) => pendingHistorySelection.has(h.id));
    setContextItems((prev) => {
      const ids = new Set(prev.map((c) => c.id));
      const next = [...prev];
      for (const h of selected) {
        if (next.length >= CONTEXT_MAX) break;
        if (!ids.has(h.id)) {
          ids.add(h.id);
          next.push({ id: h.id, type: h.type, title: h.title });
        }
      }
      return next;
    });
    setView("chat");
  }

  function addPageToContext() {
    if (!pageContext || contextItems.length >= CONTEXT_MAX) return;
    const exists = contextItems.some((c) => c.id === pageContext.id);
    if (exists) return;
    setContextItems((prev) => [...prev, { id: pageContext.id, type: pageContext.type, title: pageContext.type === "article" ? "現在の記事" : "現在のサービス" }]);
  }

  function setPageAsContext() {
    if (!pageContext) return;
    setContextItems([{ id: pageContext.id, type: pageContext.type, title: pageContext.type === "article" ? "現在の記事" : "現在のサービス" }]);
    setMessages([]);
    setView("chat");
  }

  function removeContextItem(id: string) {
    setContextItems((prev) => prev.filter((c) => c.id !== id));
  }

  function startEditingMessage(msg: ChatMsg) {
    if (msg.role !== "user" || isStreaming) return;
    setEditingMessageId(msg.id);
    setEditDraft(msg.content);
  }

  function cancelEditingMessage() {
    setEditingMessageId(null);
    setEditDraft("");
  }

  function submitEditedMessage() {
    const trimmed = editDraft.trim();
    if (!trimmed || isStreaming) return;
    const idx = messages.findIndex((m) => m.id === editingMessageId);
    if (idx === -1) return;
    const truncated = messages.slice(0, idx);
    setMessages(truncated);
    sendMessage(trimmed, truncated);
    setEditingMessageId(null);
    setEditDraft("");
  }

  function clearContext() {
    setContextItems([]);
    setMessages([]);
  }

  async function saveSession(finalMessages: ChatMsg[]) {
    if (!userId || finalMessages.length === 0) return;
    const userMessages = finalMessages.filter((m) => m.role === "user");
    if (userMessages.length === 0) return;
    const title = userMessages[0].content.slice(0, 60);
    const payload = {
      id: sessionId ?? undefined,
      title,
      mode: "fast",
      messages: finalMessages.filter((m) => !m.streaming).map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
      })),
    };
    try {
      const res = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.session?.id) setSessionId(data.session.id);
      }
    } catch {
      // セッション保存エラーはサイレントに無視
    }
  }

  async function sendMessage(overrideText?: string, messagesToUse?: ChatMsg[]) {
    const baseMessages = messagesToUse ?? messages;
    const trimmed = (overrideText ?? input).trim();
    if (!trimmed || isStreaming) return;

    const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: "user", content: trimmed };
    const botMsgId = `a-${Date.now()}`;
    const botMsg: ChatMsg = { id: botMsgId, role: "assistant", content: "", streaming: true };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    if (!overrideText) setInput("");
    setEditingMessageId(null);
    setIsStreaming(true);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const allMessages = [...baseMessages.filter((m) => !m.streaming), userMsg].map((m) => ({ role: m.role, content: m.content }));
    const ctxPayload = contextItems.length > 0 ? contextItems.map((c) => ({ id: c.id, type: c.type })) : undefined;
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: allMessages, contextItems: ctxPayload }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "通信エラー" }));
        const message = err.error ?? "通信エラー";
        setMessages((prev) =>
          prev.map((m) => (m.id === botMsgId ? { ...m, content: message, streaming: false } : m))
        );
        if (resp.status === 429) {
          fetch("/api/chat").then((r) => r.json()).then((d) => {
            if (typeof d.used === "number" && typeof d.limit === "number") setUsage({ used: d.used, limit: d.limit });
          }).catch(() => {});
        }
        setIsStreaming(false);
        return;
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No reader");
      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages((prev) => prev.map((m) => (m.id === botMsgId ? { ...m, content: accumulated } : m)));
        scrollToBottom();
      }
      setMessages((prev) => {
        const updated = prev.map((m) => (m.id === botMsgId ? { ...m, streaming: false } : m));
        saveSession(updated);
        return updated;
      });
      fetch("/api/chat").then((r) => r.json()).then((d) => {
        if (typeof d.used === "number" && typeof d.limit === "number") setUsage({ used: d.used, limit: d.limit });
      }).catch(() => {});
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setMessages((prev) => prev.map((m) => (m.id === botMsgId ? { ...m, content: m.content || "（中断されました）", streaming: false } : m)));
      } else {
        setMessages((prev) => prev.map((m) => (m.id === botMsgId ? { ...m, content: "通信エラーが発生しました。もう一度お試しください。", streaming: false } : m)));
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter" || e.shiftKey) return;
    if (e.nativeEvent.isComposing) return;
    e.preventDefault();
    sendMessage();
  }

  function handleTextareaInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }

  function resetChat() {
    if (abortRef.current) abortRef.current.abort();
    setMessages([]);
    setContextItems([]);
    setView("chat");
    setIsStreaming(false);
    setSessionId(null);
  }

  const panelContent = (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl max-h-[90dvh] max-w-[calc(100vw-2rem)]"
      style={{ width: CHAT_WIDTH, height: CHAT_HEIGHT }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2.5 flex-shrink-0">
        {view !== "chat" && (
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-lg" onClick={() => setView("chat")} aria-label="戻る">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
          <Bot className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate">
            {view === "chat" ? "AIナビゲーター（ベータ版）" : view === "context-select" ? "コンテキスト選択" : "閲覧履歴から選択"}
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {view === "chat" && messages.length > 0 && (
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={resetChat} title="会話をリセット">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setOpen(false)} aria-label="閉じる">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {view === "chat" && userId && hasAgreed && (
        <div className="px-3 py-2 border-b bg-muted/20 flex items-center justify-end">
          <span className="text-[11px] text-muted-foreground">
            {usage ? `${usage.used}/${usage.limit}` : "0/30"} 回
          </span>
        </div>
      )}

      {view === "chat" && !userId && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center min-h-0">
          <p className="text-sm text-muted-foreground mb-4">
            AIチャットは会員限定です。<br />ログインまたは会員登録するとご利用いただけます。
          </p>
          <Button asChild size="sm">
            <Link href="/auth/login">ログイン・会員登録</Link>
          </Button>
        </div>
      )}

      {view === "chat" && userId && !hasAgreed && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 min-h-0 text-center">
          <p className="text-sm text-foreground mb-2">
            今日は何を話しましょうか？
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            ご利用の際は必ず
            <Link
              href={AI_NAV_DISCLAIMER_PATH}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:no-underline font-medium mx-1"
            >
              こちら
            </Link>
            をご確認ください。
          </p>
          <Button
            onClick={() => handleAgree()}
            size="lg"
            className="min-w-[180px]"
            disabled={agreeLoading}
          >
            {agreeLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            {agreeLoading ? "保存中…" : "同意する"}
          </Button>
        </div>
      )}

      {view === "chat" && userId && hasAgreed && (
        <>
          <div ref={listRef} className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 min-h-0">
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="flex justify-start">
                  <div className="max-w-[88%] rounded-2xl rounded-tl-md bg-muted/80 px-4 py-3 text-sm leading-relaxed whitespace-pre-line shadow-sm">
                    {welcomeMessage}
                  </div>
                </div>
              )}

              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  {m.role === "user" && editingMessageId === m.id ? (
                    <div className="max-w-[88%] w-full flex flex-col gap-2 rounded-2xl rounded-tr-md bg-primary/10 border border-primary/20 p-3">
                      <textarea
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        rows={3}
                        className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="メッセージを編集…"
                      />
                      <div className="flex justify-end gap-1.5">
                        <Button type="button" variant="ghost" size="sm" onClick={cancelEditingMessage}>
                          キャンセル
                        </Button>
                        <Button type="button" size="sm" onClick={submitEditedMessage} disabled={!editDraft.trim() || isStreaming}>
                          保存して再送信
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`max-w-[88%] px-4 py-2.5 rounded-2xl ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-md shadow-sm group relative"
                          : "bg-muted/80 text-foreground rounded-tl-md shadow-sm"
                      }`}
                    >
                      {m.role === "assistant" ? (
                        m.content ? (
                          <MarkdownContent text={m.content} />
                        ) : m.streaming ? (
                          <div className="flex items-center gap-1.5 py-0.5">
                            <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:0ms]" />
                            <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:150ms]" />
                            <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:300ms]" />
                          </div>
                        ) : null
                      ) : (
                        <>
                          <div className="text-sm leading-relaxed whitespace-pre-wrap pr-8">{m.content}</div>
                          {!isStreaming && (
                            <button
                              type="button"
                              onClick={() => startEditingMessage(m)}
                              className="absolute top-2 right-2 p-1 rounded-md opacity-70 hover:opacity-100 hover:bg-primary-foreground/10"
                              aria-label="編集"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t p-3 flex-shrink-0 bg-muted/20">
            {contextItems.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2 min-h-0">
                {contextItems.map((c) => (
                  <span
                    key={c.id}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border bg-background text-xs max-w-full"
                  >
                    <span className="truncate">{c.title}</span>
                    <button
                      type="button"
                      onClick={() => removeContextItem(c.id)}
                      className="shrink-0 p-0.5 rounded hover:bg-muted"
                      aria-label="削除"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 rounded-xl shrink-0"
                    aria-label="記事・サービスを追加"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="top" className="min-w-[200px]">
                  {pageContext && contextItems.length < CONTEXT_MAX && !contextItems.some((c) => c.id === pageContext.id) && (
                    <DropdownMenuItem onClick={addPageToContext}>
                      <BookOpen className="h-3.5 w-3.5 mr-2 shrink-0" />
                      この{pageContext.type === "article" ? "記事" : "サービス"}を追加
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => {
                      fetchHistory();
                      setView("history-select");
                    }}
                  >
                    <History className="h-3.5 w-3.5 mr-2 shrink-0" />
                    閲覧履歴から選ぶ
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                placeholder={contextItems.length > 0 ? "選択したコンテンツについて質問…" : "メッセージを入力…"}
                rows={1}
                disabled={isStreaming}
                className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50 max-h-[140px] min-h-[44px] leading-relaxed"
              />
              <Button
                type="button"
                size="icon"
                className="h-11 w-11 rounded-xl shrink-0"
                aria-label="送信"
                disabled={!input.trim() || isStreaming || (usage != null && usage.used >= usage.limit)}
                onClick={() => sendMessage()}
              >
                {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 text-center">AIは間違えることもあります</p>
          </div>
        </>
      )}

      {view === "context-select" && (
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <p className="text-sm text-muted-foreground mb-4">特定のコンテンツに基づいて質問する場合は、以下から選択してください（最大{CONTEXT_MAX}件）。</p>
          {pageContext && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">現在のページ</h4>
              <div className="space-y-2">
                {contextItems.length < CONTEXT_MAX && !contextItems.some((c) => c.id === pageContext.id) && (
                  <button
                    type="button"
                    onClick={() => { addPageToContext(); setView("chat"); }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
                  >
                    <Plus className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm">このページを追加してチャットへ</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={setPageAsContext}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
                >
                  {pageContext.type === "article" ? <BookOpen className="h-4 w-4 text-primary shrink-0" /> : <Package className="h-4 w-4 text-primary shrink-0" />}
                  <span className="text-sm">{pageContext.type === "article" ? "この記事だけにして質問する" : "このサービスだけにして質問する"}</span>
                </button>
              </div>
            </div>
          )}
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">閲覧履歴から選択</h4>
            {userId ? (
              <button
                type="button"
                onClick={() => { setView("history-select"); fetchHistory(); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl border hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
              >
                <History className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm">最近見た記事・サービスから選択</span>
              </button>
            ) : (
              <div className="p-3 rounded-xl border border-dashed text-sm text-muted-foreground">ログインすると閲覧履歴から選択できます</div>
            )}
          </div>
          <button
            type="button"
            onClick={() => { clearContext(); setView("chat"); }}
            className="w-full flex items-center gap-3 p-3 rounded-xl border hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
          >
            <MessageSquare className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm">コンテキストなしで質問する</span>
          </button>
        </div>
      )}

      {view === "history-select" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 pt-3 pb-2 flex-shrink-0">
            <p className="text-xs text-muted-foreground">最大{CONTEXT_MAX}件まで選択できます（{pendingHistorySelection.size}/{CONTEXT_MAX} 選択中）</p>
          </div>
          <div className="flex-1 overflow-y-auto px-4">
            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : viewHistory.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">閲覧履歴がありません</div>
            ) : (
              <div className="space-y-1.5 pb-3">
                {viewHistory.map((item) => {
                  const selected = pendingHistorySelection.has(item.id);
                  const atLimit = pendingHistorySelection.size >= CONTEXT_MAX && !selected;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleHistoryItem(item)}
                      disabled={atLimit}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition-colors text-left ${
                        selected ? "border-primary/40 bg-primary/5" : atLimit ? "opacity-40 cursor-not-allowed" : "hover:border-primary/30 hover:bg-muted/50"
                      }`}
                    >
                      <div className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 ${selected ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                        {selected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm truncate">{item.title}</div>
                        <div className="text-[11px] text-muted-foreground">{item.type === "article" ? "記事" : "サービス"}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="border-t p-3 flex-shrink-0 flex gap-2">
            <Button variant="outline" className="flex-1 text-sm" onClick={() => setView("chat")}>キャンセル</Button>
            <Button className="flex-1 text-sm" disabled={pendingHistorySelection.size === 0} onClick={confirmHistorySelection}>
              {pendingHistorySelection.size > 0 ? `${pendingHistorySelection.size}件で質問する` : "選択してください"}
            </Button>
          </div>
        </div>
      )}

    </div>
  );

  return (
    <>
      {open ? (
        panelContent
      ) : (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col items-center gap-1">
          <Button
            onClick={() => setOpen(true)}
            className="h-20 w-20 rounded-full shadow-xl hover:shadow-2xl transition-all hover:scale-110 bg-orange-500 hover:bg-orange-400 border-4 border-orange-300"
            aria-label="AIナビゲーターを開く"
            size="icon"
          >
            <Bot className="h-10 w-10 text-white" />
          </Button>
          <span className="text-xs font-semibold text-orange-600 hidden sm:inline bg-white/90 px-2 py-1 rounded-full shadow-sm">AIナビゲーター</span>
          <Link
            href={AI_NAV_DISCLAIMER_PATH}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-muted-foreground hover:text-foreground underline hidden sm:inline"
          >
            利用上の注意
          </Link>
        </div>
      )}
    </>
  );
}
