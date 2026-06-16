"use client";

import { useState, useEffect, useCallback, useRef, useTransition } from "react";
import Link from "next/link";
import {
  CheckCircle, XCircle, FilePlus, FileEdit, Trash2,
  SendHorizonal, EyeOff, Eye, Activity, RefreshCw,
  MessageCircle, Send, Trash, ChevronDown, ChevronUp,
  Search, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// ── Types ──────────────────────────────────────────────────────────────────
type LogEntry = {
  id: string;
  actor_id: string | null;
  actor_name: string;
  action: string;
  target_type: string;
  target_id: string;
  target_title: string;
  detail: string | null;
  created_at: string;
  commentCount: number;
};

type Comment = {
  id: string;
  log_id: string;
  author_id: string | null;
  author_name: string;
  body: string;
  created_at: string;
};

// ── Constants ──────────────────────────────────────────────────────────────
const ACTION_META: Record<string, { label: string; icon: React.ElementType; bg: string; text: string }> = {
  CREATE:  { label: "作成",   icon: FilePlus,      bg: "bg-blue-100",   text: "text-blue-800" },
  UPDATE:  { label: "更新",   icon: FileEdit,      bg: "bg-amber-100",  text: "text-amber-800" },
  DELETE:  { label: "削除",   icon: Trash2,        bg: "bg-red-100",    text: "text-red-800" },
  APPROVE: { label: "承認",   icon: CheckCircle,   bg: "bg-green-100",  text: "text-green-800" },
  REJECT:  { label: "却下",   icon: XCircle,       bg: "bg-rose-100",   text: "text-rose-800" },
  SUBMIT:  { label: "申請",   icon: SendHorizonal, bg: "bg-violet-100", text: "text-violet-800" },
  HIDE:    { label: "非表示", icon: EyeOff,        bg: "bg-slate-100",  text: "text-slate-700" },
  SHOW:    { label: "再表示", icon: Eye,           bg: "bg-teal-100",   text: "text-teal-800" },
};

const TARGET_LABELS: Record<string, string> = {
  POST: "記事", SERVICE: "サービス", SITE_PAGE: "固定ページ",
  EVENT: "イベント", SITE_UPDATE: "運営記事", FORUM_POST: "井戸端会議投稿",
  FORUM_ROOM: "井戸端会議ルーム", AI_KENTEI_QUESTION: "AI検定問題",
  AI_CHAT_PROMPT: "AIチャット設定", HOME_SLIDER: "トップスライダー",
  HOME_TOPICS: "トップトピックス", TEXT_OVERRIDE: "文言編集",
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: "作成", UPDATE: "更新", DELETE: "削除",
  APPROVE: "承認", REJECT: "却下", SUBMIT: "申請",
  HIDE: "非表示", SHOW: "再表示",
};

function getTargetHref(type: string, id: string): string | null {
  switch (type) {
    case "POST": return `/articles/${id}`;
    case "SERVICE": return `/services/${id}`;
    case "EVENT": return `/events/${id}`;
    case "SITE_UPDATE": return `/site-updates/${id}`;
    case "FORUM_ROOM": return `/forum/${id}`;
    default: return null;
  }
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "たった今";
  if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間前`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}日前`;
  return new Date(iso).toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
}

function absoluteTime(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", {
    month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

function avatarLetter(name: string): string {
  return (name[0] ?? "?").toUpperCase();
}

function avatarColor(name: string): string {
  const colors = [
    "bg-blue-500", "bg-violet-500", "bg-green-500", "bg-amber-500",
    "bg-rose-500", "bg-teal-500", "bg-indigo-500", "bg-pink-500",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return colors[Math.abs(h) % colors.length];
}

// ── CommentThread ─────────────────────────────────────────────────────────
function CommentThread({ logId, initialCount, currentUserId }: {
  logId: string;
  initialCount: number;
  currentUserId: string;
}) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [count, setCount] = useState(initialCount);
  const [loaded, setLoaded] = useState(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/activity-log/comments?logId=${logId}`);
    if (res.ok) {
      const data = await res.json() as { comments: Comment[] };
      setComments(data.comments);
      setCount(data.comments.length);
      setLoaded(true);
    }
  }, [logId]);

  function toggle() {
    if (!open && !loaded) {
      void load().then(() => setOpen(true));
    } else {
      setOpen((v) => !v);
    }
  }

  async function submit() {
    const trimmed = body.trim();
    if (!trimmed || sending) return;
    setSending(true);
    const res = await fetch("/api/admin/activity-log/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logId, body: trimmed }),
    });
    if (res.ok) {
      const data = await res.json() as { comment: Comment };
      setComments((prev) => [...prev, data.comment]);
      setCount((c) => c + 1);
      setBody("");
    }
    setSending(false);
    if (!open) setOpen(true);
  }

  async function del(commentId: string) {
    await fetch(`/api/admin/activity-log/comments?commentId=${commentId}`, { method: "DELETE" });
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setCount((c) => Math.max(0, c - 1));
  }

  return (
    <div className="mt-2 pt-2 border-t border-dashed border-muted">
      <button
        type="button"
        onClick={toggle}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        {count > 0 ? `${count}件のメモ` : "メモを追加"}
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {comments.map((c) => (
            <div key={c.id} className="group flex gap-2 text-xs">
              <div className={`shrink-0 w-5 h-5 rounded-full ${avatarColor(c.author_name)} flex items-center justify-center text-white text-[10px] font-bold mt-0.5`}>
                {avatarLetter(c.author_name)}
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold">{c.author_name}</span>
                <span className="text-muted-foreground ml-1.5">{relativeTime(c.created_at)}</span>
                <p className="mt-0.5 text-foreground/80 whitespace-pre-wrap break-words leading-relaxed">{c.body}</p>
              </div>
              {(c.author_id === currentUserId) && (
                <button
                  type="button"
                  onClick={() => void del(c.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all shrink-0"
                >
                  <Trash className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}

          <div className="flex gap-2 pt-1">
            <Textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="メモを入力… (Ctrl+Enter で送信)"
              className="text-xs min-h-[48px] max-h-[120px] resize-none flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void submit();
              }}
            />
            <Button
              type="button" size="sm"
              onClick={() => void submit()}
              disabled={sending || !body.trim()}
              className="shrink-0 self-end h-8 px-2"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── LogItem ───────────────────────────────────────────────────────────────
function LogItem({ log, currentUserId }: { log: LogEntry; currentUserId: string }) {
  const meta = ACTION_META[log.action] ?? ACTION_META.UPDATE;
  const Icon = meta.icon as React.ComponentType<{ className?: string }>;
  const targetHref = getTargetHref(log.target_type, log.target_id);
  const targetLabel = TARGET_LABELS[log.target_type] ?? log.target_type;

  return (
    <li className="flex gap-3 px-4 py-4 hover:bg-muted/20 transition-colors group">
      {/* Avatar */}
      <div className="shrink-0 flex flex-col items-center gap-1">
        <div className={`w-8 h-8 rounded-full ${avatarColor(log.actor_name)} flex items-center justify-center text-white text-sm font-bold`}>
          {avatarLetter(log.actor_name)}
        </div>
        <div className="flex-1 w-px bg-border min-h-[8px]" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-2">
        {/* Header row */}
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="font-semibold text-foreground">{log.actor_name}</span>
          <span className="text-muted-foreground text-xs">が</span>
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${meta.bg} ${meta.text}`}>
            <Icon className="h-3 w-3" />
            {meta.label}
          </span>
          <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">{targetLabel}</Badge>
          {targetHref ? (
            <Link
              href={targetHref}
              target="_blank"
              className="font-medium hover:underline text-primary truncate max-w-[240px]"
            >
              {log.target_title}
            </Link>
          ) : (
            <span className="font-medium truncate max-w-[240px]">{log.target_title}</span>
          )}
        </div>

        {/* Detail */}
        {log.detail && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{log.detail}</p>
        )}

        {/* Timestamp */}
        <p className="text-[11px] text-muted-foreground mt-1" title={absoluteTime(log.created_at)}>
          {relativeTime(log.created_at)} · {absoluteTime(log.created_at)}
        </p>

        {/* Comment thread */}
        <CommentThread logId={log.id} initialCount={log.commentCount} currentUserId={currentUserId} />
      </div>
    </li>
  );
}

// ── Main Feed ─────────────────────────────────────────────────────────────
interface Props {
  currentUserId: string;
}

const LIMIT = 50;

export function ActivityFeed({ currentUserId }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [, startTransition] = useTransition();

  const fetchLogs = useCallback(async (opts?: { page?: number; type?: string; action?: string; search?: string; silent?: boolean }) => {
    const p = opts?.page ?? page;
    const t = opts?.type ?? filterType;
    const a = opts?.action ?? filterAction;
    const s = opts?.search ?? search;
    const offset = (p - 1) * LIMIT;
    const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) });
    if (t) params.set("type", t);
    if (a) params.set("action", a);
    if (s) params.set("search", s);
    if (!opts?.silent) setLoading(true);
    try {
      const res = await fetch(`/api/admin/activity-log?${params.toString()}`);
      if (res.ok) {
        const data = await res.json() as { logs: LogEntry[]; total: number };
        setLogs(data.logs);
        setTotal(data.total);
        setLastRefreshed(new Date());
      }
    } finally {
      setLoading(false);
    }
  }, [page, filterType, filterAction, search]);

  // Initial load + filter changes
  useEffect(() => {
    void fetchLogs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterType, filterAction, search]);

  // Auto-refresh every 60s
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => void fetchLogs({ silent: true }), 60_000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchLogs]);

  function applyFilter(type?: string, action?: string) {
    setPage(1);
    if (type !== undefined) setFilterType(type);
    if (action !== undefined) setFilterAction(action);
  }

  function applySearch() {
    setPage(1);
    setSearch(searchInput);
  }

  const totalPages = Math.ceil(total / LIMIT);
  const offset = (page - 1) * LIMIT;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        {/* Search */}
        <div className="flex gap-2 items-center flex-1 min-w-0 max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applySearch()}
              placeholder="名前・タイトルで検索"
              className="pl-8 h-8 text-xs"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button size="sm" variant="outline" className="h-8 text-xs px-2" onClick={applySearch}>検索</Button>
        </div>

        {/* Refresh controls */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            {lastRefreshed.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} 更新
          </span>
          <Button
            size="sm" variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => void fetchLogs()}
            title="今すぐ更新"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <button
            type="button"
            onClick={() => setAutoRefresh((v) => !v)}
            className={`text-[11px] px-2 py-1 rounded transition-colors ${autoRefresh ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}
          >
            {autoRefresh ? "自動更新 ON" : "自動更新 OFF"}
          </button>
          <Badge variant="secondary" className="text-xs">{total.toLocaleString()} 件</Badge>
        </div>
      </div>

      {/* Type filter chips */}
      <div className="flex flex-wrap gap-1.5">
        <span className="text-xs text-muted-foreground self-center mr-1">種別:</span>
        {["", ...Object.keys(TARGET_LABELS)].map((t) => (
          <button
            key={t || "all"}
            type="button"
            onClick={() => applyFilter(t, undefined)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              filterType === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {t ? TARGET_LABELS[t] : "すべて"}
          </button>
        ))}
      </div>

      {/* Action filter chips */}
      <div className="flex flex-wrap gap-1.5">
        <span className="text-xs text-muted-foreground self-center mr-1">操作:</span>
        {["", ...Object.keys(ACTION_LABELS)].map((a) => {
          const meta = a ? ACTION_META[a] : null;
          return (
            <button
              key={a || "all"}
              type="button"
              onClick={() => applyFilter(undefined, a)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                filterAction === a
                  ? (meta ? `${meta.bg} ${meta.text}` : "bg-primary text-primary-foreground")
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {a ? ACTION_LABELS[a] : "すべて"}
            </button>
          );
        })}
      </div>

      {/* Log list */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="py-16 text-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center">
            <Activity className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">ログはありません</p>
          </div>
        ) : (
          <>
            <div className="px-4 py-2 border-b text-xs text-muted-foreground">
              {offset + 1}–{Math.min(offset + LIMIT, total)} 件 / 全 {total.toLocaleString()} 件
              {(filterType || filterAction || search) && (
                <button
                  type="button"
                  onClick={() => startTransition(() => { setFilterType(""); setFilterAction(""); setSearch(""); setSearchInput(""); setPage(1); })}
                  className="ml-2 text-primary hover:underline"
                >
                  フィルターをクリア
                </button>
              )}
            </div>
            <ol>
              {logs.map((log) => (
                <LogItem key={log.id} log={log} currentUserId={currentUserId} />
              ))}
            </ol>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
          >← 前へ</Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button
            variant="outline" size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
          >次へ →</Button>
        </div>
      )}
    </div>
  );
}
