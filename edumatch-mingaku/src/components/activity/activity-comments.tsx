"use client";

import { useState, useTransition } from "react";
import { MessageCircle, Trash2, Send, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addActivityComment, deleteActivityComment, getActivityComments } from "@/app/_actions/activity-log";
import type { ActivityComment } from "@/app/_actions/activity-log";

function formatTime(date: Date | string): string {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "たった今";
  if (mins < 60) return `${mins}分前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}日前`;
  return d.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
}

interface Props {
  logId: string;
  initialComments: ActivityComment[];
  initialCount: number;
  isLoggedIn: boolean;
  currentUserId?: string | null;
  isAdmin?: boolean;
}

export function ActivityComments({ logId, initialComments, initialCount, isLoggedIn, currentUserId, isAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<ActivityComment[]>(initialComments);
  const [count, setCount] = useState(initialCount);
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(initialComments.length > 0);

  function handleToggle() {
    if (!open && !loaded) {
      startTransition(async () => {
        const fetched = await getActivityComments(logId);
        setComments(fetched);
        setLoaded(true);
        setOpen(true);
      });
    } else {
      setOpen((v) => !v);
    }
  }

  function handleSubmit() {
    const trimmed = body.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      const res = await addActivityComment(logId, trimmed);
      if (res.success && res.comment) {
        setComments((prev) => [...prev, res.comment!]);
        setCount((c) => c + 1);
        setBody("");
        setOpen(true);
      } else {
        setError(res.error ?? "投稿に失敗しました");
      }
    });
  }

  function handleDelete(commentId: string) {
    startTransition(async () => {
      const res = await deleteActivityComment(commentId);
      if (res.success) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        setCount((c) => Math.max(0, c - 1));
      }
    });
  }

  return (
    <div className="mt-2">
      {/* toggle button */}
      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        <span>{count > 0 ? `${count}件のコメント` : "コメント"}</span>
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {open && (
        <div className="mt-2 pl-2 border-l-2 border-muted space-y-2">
          {comments.map((c) => (
            <div key={c.id} className="group flex gap-2">
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-foreground">{c.author_name}</span>
                <span className="text-xs text-muted-foreground ml-1.5">{formatTime(c.created_at)}</span>
                <p className="text-xs text-foreground mt-0.5 whitespace-pre-wrap break-words">{c.body}</p>
              </div>
              {(c.author_id === currentUserId || isAdmin) && (
                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
                  disabled={isPending}
                  className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all shrink-0"
                  aria-label="削除"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}

          {comments.length === 0 && !isPending && (
            <p className="text-xs text-muted-foreground">まだコメントがありません</p>
          )}

          {isLoggedIn ? (
            <div className="flex gap-2 pt-1">
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="コメントを追加..."
                className="text-xs min-h-[56px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
                }}
              />
              <Button
                type="button"
                size="sm"
                onClick={handleSubmit}
                disabled={isPending || !body.trim()}
                className="shrink-0 self-end h-8 px-2"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">コメントするには<a href="/login" className="underline text-primary">ログイン</a>が必要です</p>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}
