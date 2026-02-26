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

const CONTEXT_MAX = 1;
const CHAT_WIDTH = 420;
const CHAT_HEIGHT = 700;
const AI_NAV_DISCLAIMER_PATH = "/help/ai-navigator-disclaimer";
const CHAT_USAGE_LIMIT_PATH = "/help/chat-usage-limit";

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

export type ChatMode = "navigator" | "debate" | "discussion";

const MODE_LABELS: Record<ChatMode, string> = {
  navigator: "ナビゲーターモード",
  debate: "ディベートモード",
  discussion: "ディスカッションモード",
};

const MODE_DESCRIPTIONS: Record<ChatMode, string> = {
  navigator: "一般的な質問・案内",
  debate: "賛成・反対の立場で議論",
  discussion: "テーマについて深く議論",
};

const PLACEHOLDERS: Record<ChatMode, string> = {
  navigator: "教育ICTやサービスについて、何でもお聞きください",
  debate: "あなたの立場（賛成/反対）と理由を教えてください",
  discussion: "議論したいテーマや論点を教えてください",
};

const EXAMPLE_QUESTIONS: Record<ChatMode, string[]> = {
  navigator: [
    "ICT教材の選び方のポイントを教えてください",
    "校務効率化におすすめのサービスはありますか？",
    "プログラミング教育の導入事例を知りたいです",
  ],
  debate: [
    "学校へのスマートフォン持ち込みに賛成です。その理由を踏まえて議論してください",
    "AIを授業で使うことには反対です。反対の立場で議論してください",
    "タブレット1人1台に賛成の立場で、メリットとデメリットを議論してください",
  ],
  discussion: [
    "GIGAスクール構想の成果と課題について議論したいです",
    "情報活用能力をどう育成するか、議論を深めたいです",
    "校務DXを進めるうえでの教員の負担軽減について議論してください",
  ],
};

function formatResetIn(resetAt: string | null): string {
  if (!resetAt) return "";
  const now = Date.now();
  const reset = new Date(resetAt).getTime();
  const diff = Math.max(0, reset - now);
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  if (hours > 0) return `あと${hours}時間${minutes}分で0にリセット`;
  if (minutes > 0) return `あと${minutes}分で0にリセット`;
  return "まもなく0にリセット";
}

function ModeSelectScreen({ onSelect }: { onSelect: (mode: ChatMode) => void }) {
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-4">
      <p className="text-sm text-muted-foreground mb-4">チャットのモードを選んでください</p>
      <div className="space-y-3 flex-1 overflow-y-auto">
        {(["navigator", "debate", "discussion"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onSelect(mode)}
            className="w-full flex flex-col items-start gap-1 p-4 rounded-xl border-2 border-primary/20 hover:border-primary/50 hover:bg-primary/5 transition-colors text-left"
          >
            <span className="text-sm font-semibold">{MODE_LABELS[mode]}</span>
            <span className="text-xs text-muted-foreground">{MODE_DESCRIPTIONS[mode]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function parsePageContext(pathname: string): PageContext {
  const articleMatch = pathname.match(/^\/articles\/([^/]+)$/);
  if (articleMatch) return { id: articleMatch[1], type: "article" };
  const serviceMatch = pathname.match(/^\/services\/([^/]+)$/);
  if (serviceMatch) return { id: serviceMatch[1], type: "service" };
  return null;
}

function AgreementScreen({
  onAgree,
  agreeLoading,
  disclaimerPath,
}: {
  onAgree: () => void;
  agreeLoading: boolean;
  disclaimerPath: string;
}) {
  const [checked, setChecked] = useState(false);
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* タイトル */}
      <div className="px-4 pt-4 pb-2 border-b shrink-0">
        <p className="text-sm font-semibold">AIナビゲーターご利用上の留意点</p>
        <p className="text-xs text-muted-foreground mt-0.5">以下をご確認のうえ、同意してからご利用ください。</p>
      </div>

      {/* 留意点本文（スクロール可能） */}
      <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0 text-sm text-muted-foreground space-y-3 leading-relaxed">
        <p>
          本サイトのAIナビゲーターは、エデュマッチが提供する教育サービス・ICTツール等の情報検索・相談支援の補助機能です。
        </p>
        <p>
          本AIによる応答は、教育サービス選びや情報整理の参考を目的に自動生成されたものであり、内容の正確性・最新性・完全性を保証するものではありません。
        </p>
        <p>
          回答内容に基づく最終的な判断（資料請求・契約・導入等）は、必ず各サービス提供元の公式情報・担当者への確認を行ってください。
        </p>
        <p>
          本AIの回答や解析内容により利用者または第三者に発生した損害について、当サイトおよび運営者は一切責任を負いません。
        </p>
        <p>
          本AIはすべての利用ケースに対応するものではなく、AIが誤った情報を生成する可能性（いわゆる「ハルシネーション」）をご了承ください。
        </p>
        <div className="pt-1">
          <Link
            href={disclaimerPath}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary underline hover:no-underline"
          >
            留意点の全文を確認する →
          </Link>
        </div>
      </div>

      {/* チェックボックス＋同意ボタン */}
      <div className="border-t px-4 py-3 shrink-0 space-y-3">
        <label className="flex items-start gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer"
          />
          <span className="text-xs text-foreground leading-relaxed">
            上記の留意点を確認しました
          </span>
        </label>
        <Button
          onClick={onAgree}
          size="sm"
          className="w-full"
          disabled={!checked || agreeLoading}
        >
          {agreeLoading ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5 mr-1.5" />
          )}
          {agreeLoading ? "保存中…" : "同意してチャットを開始する"}
        </Button>
      </div>
    </div>
  );
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
  const [pendingHistorySelection, setPendingHistorySelection] = useState<string | null>(null);
  const [usage, setUsage] = useState<{ used: number; limit: number; resetAt: string | null } | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [hasAgreed, setHasAgreed] = useState(false);
  const [agreeLoading, setAgreeLoading] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode | null>(null);

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
          setUsage({ used: d.used, limit: d.limit, resetAt: d.resetAt ?? null });
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

  const welcomeMessage =
    chatMode === "navigator"
      ? "今日は何を話しましょうか？教育ICTやサービスについて何でもお聞きください。"
      : chatMode === "debate"
        ? "賛成・反対の立場で議論しましょう。あなたの立場と理由を教えてください。"
        : "テーマについて深く議論しましょう。議論したいテーマや論点を教えてください。";

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
      setPendingHistorySelection(contextItems[0]?.id ?? null);
    } catch (e) {
      console.error("Failed to fetch view history:", e);
    } finally {
      setHistoryLoading(false);
    }
  }

  function selectHistoryItem(item: RecentViewItem) {
    setPendingHistorySelection(item.id);
  }

  function confirmHistorySelection() {
    if (!pendingHistorySelection) {
      setView("chat");
      return;
    }
    const selected = viewHistory.find((h) => h.id === pendingHistorySelection);
    if (selected) {
      setContextItems([{ id: selected.id, type: selected.type, title: selected.title }]);
    }
    setView("chat");
  }

  function addPageToContext() {
    if (!pageContext) return;
    setContextItems([{ id: pageContext.id, type: pageContext.type, title: pageContext.type === "article" ? "現在の記事" : "現在のサービス" }]);
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
      mode: chatMode ?? "navigator",
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
        body: JSON.stringify({ messages: allMessages, contextItems: ctxPayload, mode: chatMode }),
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
            if (typeof d.used === "number" && typeof d.limit === "number") setUsage({ used: d.used, limit: d.limit, resetAt: d.resetAt ?? null });
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
        if (typeof d.used === "number" && typeof d.limit === "number") setUsage({ used: d.used, limit: d.limit, resetAt: d.resetAt ?? null });
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
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => {
              setOpen(false);
              setChatMode(null);
            }}
            aria-label="閉じる"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {view === "chat" && userId && hasAgreed && chatMode && (
        <div className="px-3 py-2 border-b bg-muted/20 flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[11px] text-muted-foreground">
            {usage ? `${usage.used}/${usage.limit}` : "0/30"} 回
            {usage?.resetAt && usage.used > 0 && (
              <span className="ml-1.5">・{formatResetIn(usage.resetAt)}</span>
            )}
          </span>
          <Link
            href={CHAT_USAGE_LIMIT_PATH}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-primary underline hover:no-underline shrink-0"
          >
            詳細を見る
          </Link>
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
        <AgreementScreen
          onAgree={() => handleAgree()}
          agreeLoading={agreeLoading}
          disclaimerPath={AI_NAV_DISCLAIMER_PATH}
        />
      )}

      {view === "chat" && userId && hasAgreed && !chatMode && (
        <ModeSelectScreen onSelect={(mode) => setChatMode(mode)} />
      )}

      {view === "chat" && userId && hasAgreed && chatMode && (
        <>
          <div ref={listRef} className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 min-h-0">
            <div className="space-y-4">
              {messages.length === 0 && (
                <>
                  <div className="flex justify-start items-start gap-0">
                    <div className="w-3 h-3 shrink-0 mt-5 rounded-bl-full bg-muted/80" aria-hidden />
                    <div className="relative max-w-[88%] rounded-2xl rounded-tl-md rounded-bl-none bg-muted/80 px-4 py-3 text-sm leading-relaxed whitespace-pre-line shadow-sm">
                      {welcomeMessage}
                    </div>
                  </div>
                  <div className="space-y-2 mt-1">
                    <p className="text-xs text-muted-foreground mb-2">例：</p>
                    {EXAMPLE_QUESTIONS[chatMode].map((q, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setInput(q)}
                        className="block w-full text-left text-sm px-4 py-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/60 hover:border-primary/40 transition-colors text-foreground"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start items-start gap-0"}`}>
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
                    <>
                      {m.role === "assistant" && (
                        <div className="w-3 h-3 shrink-0 mt-5 rounded-bl-full bg-muted/80" aria-hidden />
                      )}
                      <div
                        className={`max-w-[88%] px-4 py-2.5 rounded-2xl ${
                          m.role === "user"
                            ? "bg-primary text-primary-foreground rounded-tr-md shadow-sm group relative"
                            : "rounded-tl-md rounded-bl-none shadow-sm bg-muted/80 text-foreground"
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
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t p-3 flex-shrink-0 bg-muted/20">
            <div className="mb-2">
              {contextItems.length > 0 ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-muted-foreground font-medium">参照中:</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border bg-background text-xs max-w-full">
                    <span className="truncate">{contextItems[0].title}</span>
                    <button
                      type="button"
                      onClick={() => removeContextItem(contextItems[0].id)}
                      className="shrink-0 p-0.5 rounded hover:bg-muted"
                      aria-label="添付を外す"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="ghost" size="sm" className="h-7 text-[11px] px-2">
                        変更
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" side="top" className="min-w-[200px]">
                      {pageContext && !contextItems.some((c) => c.id === pageContext.id) && (
                        <DropdownMenuItem onClick={addPageToContext}>
                          <BookOpen className="h-3.5 w-3.5 mr-2 shrink-0" />
                          この{pageContext.type === "article" ? "記事" : "サービス"}に差し替え
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => { fetchHistory(); setView("history-select"); }}>
                        <History className="h-3.5 w-3.5 mr-2 shrink-0" />
                        閲覧履歴から選び直す
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { removeContextItem(contextItems[0].id); }}>
                        <Trash2 className="h-3.5 w-3.5 mr-2 shrink-0" />
                        添付を外す
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full justify-start gap-2 h-9 text-xs text-muted-foreground border-dashed"
                    >
                      <Plus className="h-3.5 w-3.5 shrink-0" />
                      記事・サービスを添付して質問する（任意）
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" side="top" className="min-w-[240px]">
                    {pageContext && (
                      <DropdownMenuItem onClick={addPageToContext}>
                        <BookOpen className="h-3.5 w-3.5 mr-2 shrink-0" />
                        この{pageContext.type === "article" ? "記事" : "サービス"}を参照する
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => { fetchHistory(); setView("history-select"); }}>
                      <History className="h-3.5 w-3.5 mr-2 shrink-0" />
                      閲覧履歴から1件選ぶ
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                placeholder={PLACEHOLDERS[chatMode]}
                rows={1}
                disabled={isStreaming}
                className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50 max-h-[140px] min-h-[52px] leading-[1.5]"
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
            <p className="text-[11px] text-muted-foreground mt-2 text-center">
              AIは間違えることもあります。
              <Link href={AI_NAV_DISCLAIMER_PATH} target="_blank" rel="noopener noreferrer" className="ml-1 text-primary underline hover:no-underline">
                詳細を見る
              </Link>
            </p>
          </div>
        </>
      )}

      {view === "context-select" && (
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <p className="text-sm text-muted-foreground mb-4">特定のコンテンツに基づいて質問する場合は、以下から1件選択してください。</p>
          {pageContext && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">現在のページ</h4>
              <div className="space-y-2">
                {!contextItems.some((c) => c.id === pageContext.id) && (
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
            <p className="text-xs text-muted-foreground">1件のみ選択できます</p>
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
                  const selected = pendingHistorySelection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectHistoryItem(item)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition-colors text-left ${
                        selected ? "border-primary/40 bg-primary/5" : "hover:border-primary/30 hover:bg-muted/50"
                      }`}
                    >
                      <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                        {selected && <span className="w-2 h-2 rounded-full bg-primary-foreground" />}
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
            <Button className="flex-1 text-sm" disabled={!pendingHistorySelection} onClick={confirmHistorySelection}>
              {pendingHistorySelection ? "この1件で質問する" : "選択してください"}
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
            <Bot className="h-14 w-14 text-white" />
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
