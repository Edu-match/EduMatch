"use client";

import { useEffect, useState, useCallback } from "react";
import { Bot, Trash2, Loader2, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

type ChatSession = {
  id: string;
  title: string;
  mode: string;
  messages: unknown[];
  created_at: string;
  updated_at: string;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function messageCount(messages: unknown[]): number {
  if (!Array.isArray(messages)) return 0;
  return messages.filter((m) => typeof m === "object" && m !== null && (m as { role?: string }).role === "user").length;
}

export function ChatHistoryCompact() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const INITIAL_DISPLAY = 3;

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/sessions");
      if (!res.ok) return;
      const data = await res.json();
      setSessions(data.sessions ?? []);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  async function deleteSession(id: string) {
    if (deletingId) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/chat/sessions/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== id));
      }
    } catch {
      // silently ignore
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <Bot className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          AIチャットの履歴はまだありません。<br />
          右下のチャットボタンから会話を始めると、ここに表示されます。
        </p>
      </div>
    );
  }

  const displayedSessions = expanded ? sessions : sessions.slice(0, INITIAL_DISPLAY);
  const hasMore = sessions.length > INITIAL_DISPLAY;

  return (
    <div className="space-y-2">
      {displayedSessions.map((session) => {
        const msgCount = messageCount(session.messages as unknown[]);

        return (
          <div
            key={session.id}
            className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
          >
            <div className="flex-shrink-0 mt-0.5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate leading-snug">
                {session.title || "（タイトルなし）"}
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-[11px] text-muted-foreground">
                  {msgCount}問答
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {formatDate(session.created_at)}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={() => deleteSession(session.id)}
              disabled={deletingId === session.id}
              aria-label="削除"
            >
              {deletingId === session.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        );
      })}

      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground text-xs"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5 mr-1" />
              折りたたむ
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5 mr-1" />
              残り {sessions.length - INITIAL_DISPLAY} 件を表示
            </>
          )}
        </Button>
      )}

      {sessions.length > 0 && (
        <p className="text-[11px] text-muted-foreground text-center pt-1">
          全 {sessions.length} 件の会話
        </p>
      )}
    </div>
  );
}
