"use client";

import { useEffect, useState } from "react";
import { Loader2, MessageSquare, Send, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { RelativeTime } from "@/components/community/relative-time";

type CommentNode = {
  id: string;
  videoId: string;
  parentId: string | null;
  authorName: string;
  authorUserId?: string;
  authorRole: string;
  body: string;
  isHidden: boolean;
  postedAt: string;
  replies: CommentNode[];
};

type LoggedInUser = {
  id: string;
  name: string;
} | null;

interface Props {
  videoId: string;
}

export function VideoCommentSection({ videoId }: Props) {
  const [comments, setComments] = useState<CommentNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<LoggedInUser>(null);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<{ id: string; authorName: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.profile?.id) {
          setUser({ id: data.profile.id, name: data.profile.name ?? "（名無し）" });
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null));
  }, []);

  const reload = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/videos/${videoId}/comments`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setComments(data.comments ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  const submit = async () => {
    if (!body.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/videos/${videoId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          commentBody: body.trim(),
          parentId: replyTarget?.id ?? null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "投稿に失敗しました。");
        return;
      }
      setBody("");
      setReplyTarget(null);
      await reload();
    } catch (e) {
      console.error(e);
      setError("通信に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  const totalCount = (() => {
    let n = 0;
    const walk = (nodes: CommentNode[]) => {
      nodes.forEach((c) => {
        n += 1;
        walk(c.replies);
      });
    };
    walk(comments);
    return n;
  })();

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">コメント（{totalCount}）</h2>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          {!user ? (
            <p className="text-sm text-muted-foreground">
              コメントするには
              <a href="/login" className="text-primary underline ml-1">ログイン</a>
              が必要です。
            </p>
          ) : (
            <>
              {replyTarget && (
                <div className="flex items-center justify-between gap-2 text-xs bg-muted px-3 py-2 rounded">
                  <span>
                    <strong>{replyTarget.authorName}</strong> さんに返信中
                  </span>
                  <button
                    type="button"
                    onClick={() => setReplyTarget(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    キャンセル
                  </button>
                </div>
              )}
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={
                  replyTarget
                    ? "返信を入力…"
                    : "動画への感想・質問を投稿しましょう（AIによる自動審査が入ります）"
                }
                rows={3}
                disabled={submitting}
              />
              {error && (
                <p className="text-xs text-destructive flex items-start gap-1">
                  <ShieldAlert className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </p>
              )}
              <div className="flex items-center justify-end">
                <Button
                  type="button"
                  onClick={submit}
                  disabled={submitting || !body.trim()}
                  size="sm"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {replyTarget ? "返信を投稿" : "コメントを投稿"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          読み込み中…
        </div>
      ) : comments.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            まだコメントはありません。最初のコメントを投稿してみましょう。
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id}>
              <CommentItem
                node={c}
                canReply={!!user}
                onReply={(target) =>
                  setReplyTarget({ id: target.id, authorName: target.authorName })
                }
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CommentItem({
  node,
  canReply,
  onReply,
  depth = 0,
}: {
  node: CommentNode;
  canReply: boolean;
  onReply: (target: { id: string; authorName: string }) => void;
  depth?: number;
}) {
  return (
    <Card className={depth > 0 ? "border-l-4 border-l-muted" : ""}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold">{node.authorName}</span>
            <span className="text-xs text-muted-foreground">({node.authorRole})</span>
          </div>
          <span className="text-xs text-muted-foreground">
            <RelativeTime iso={node.postedAt} />
          </span>
        </div>
        <p className="text-sm whitespace-pre-wrap break-words">{node.body}</p>
        {canReply && depth < 2 && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => onReply({ id: node.id, authorName: node.authorName })}
              className="text-xs text-primary hover:underline"
            >
              返信
            </button>
          </div>
        )}
      </CardContent>
      {node.replies.length > 0 && (
        <div className="px-4 pb-4 space-y-2">
          {node.replies.map((r) => (
            <CommentItem
              key={r.id}
              node={r}
              canReply={canReply}
              onReply={onReply}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
