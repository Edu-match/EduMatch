"use client";

import { useMemo, useState } from "react";
import {
  Award,
  CornerDownRight,
  MessageSquare,
  Send,
  ThumbsUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  COMMUNITY_ROLE_LABELS,
  type CommunityComment,
  type CommunityRole,
} from "@/lib/mock-community";
import { cn } from "@/lib/utils";
import { RoleBadge } from "./role-badge";

type ComposerState = {
  name: string;
  body: string;
  role: CommunityRole;
  anonymous: boolean;
};

const roleOptions: CommunityRole[] = [
  "teacher",
  "student",
  "expert",
  "guardian",
  "general",
];

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(new Date(dateString));
}

function createDefaultComposerState(): ComposerState {
  return {
    name: "",
    body: "",
    role: "general",
    anonymous: false,
  };
}

function updateCommentTree(
  comments: CommunityComment[],
  targetId: string,
  updater: (comment: CommunityComment) => CommunityComment
): CommunityComment[] {
  return comments.map((comment) => {
    if (comment.id === targetId) {
      return updater(comment);
    }

    if (!comment.replies?.length) {
      return comment;
    }

    return {
      ...comment,
      replies: updateCommentTree(comment.replies, targetId, updater),
    };
  });
}

function buildAuthorName(form: ComposerState) {
  if (form.anonymous) {
    return "匿名ユーザー";
  }

  if (form.name.trim()) {
    return form.name.trim();
  }

  return `${COMMUNITY_ROLE_LABELS[form.role]}ユーザー`;
}

function buildAuthorRole(form: ComposerState): CommunityRole {
  return form.anonymous ? "anonymous" : form.role;
}

function CommentComposer({
  title,
  description,
  submitLabel,
  form,
  onFormChange,
  onSubmit,
  compact = false,
}: {
  title: string;
  description?: string;
  submitLabel: string;
  form: ComposerState;
  onFormChange: (form: ComposerState) => void;
  onSubmit: () => void;
  compact?: boolean;
}) {
  return (
    <div className={cn("space-y-4", compact && "rounded-lg border bg-muted/30 p-4")}>
      <div className="space-y-1">
        <h3 className={cn("font-semibold", compact ? "text-sm" : "text-base")}>{title}</h3>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <div className={cn("grid gap-4", compact ? "md:grid-cols-1" : "md:grid-cols-2")}>
        <div className="space-y-2">
          <Label htmlFor={`${title}-name`}>表示名</Label>
          <Input
            id={`${title}-name`}
            placeholder="例: 教育現場の先生"
            value={form.name}
            disabled={form.anonymous}
            onChange={(event) => onFormChange({ ...form, name: event.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>投稿者属性</Label>
          <Select
            value={form.role}
            onValueChange={(value) =>
              onFormChange({ ...form, role: value as CommunityRole })
            }
            disabled={form.anonymous}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="属性を選択" />
            </SelectTrigger>
            <SelectContent>
              {roleOptions.map((role) => (
                <SelectItem key={role} value={role}>
                  {COMMUNITY_ROLE_LABELS[role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id={`${title}-anonymous`}
          checked={form.anonymous}
          onCheckedChange={(checked) =>
            onFormChange({ ...form, anonymous: checked === true })
          }
        />
        <Label htmlFor={`${title}-anonymous`}>匿名で投稿する</Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${title}-body`}>本文</Label>
        <Textarea
          id={`${title}-body`}
          value={form.body}
          onChange={(event) => onFormChange({ ...form, body: event.target.value })}
          placeholder="コミュニティに共有したい意見や体験を書いてください"
          rows={compact ? 3 : 5}
        />
      </div>

      <Button
        type="button"
        onClick={onSubmit}
        disabled={!form.body.trim()}
        className="w-full sm:w-auto"
      >
        <Send className="h-4 w-4" />
        {submitLabel}
      </Button>
    </div>
  );
}

function CommentCard({
  comment,
  depth = 0,
  bestAnswerId,
  likedCommentIds,
  onHelpfulToggle,
  onReplyClick,
  onBestAnswerToggle,
  allowBestAnswer,
}: {
  comment: CommunityComment;
  depth?: number;
  bestAnswerId?: string;
  likedCommentIds: Set<string>;
  onHelpfulToggle: (id: string) => void;
  onReplyClick: (id: string) => void;
  onBestAnswerToggle?: (id: string) => void;
  allowBestAnswer?: boolean;
}) {
  const isBestAnswer = bestAnswerId === comment.id;
  const isLiked = likedCommentIds.has(comment.id);

  return (
    <div className={cn("space-y-3 rounded-xl border bg-card p-4", depth > 0 && "ml-6")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{comment.authorName}</span>
            <RoleBadge role={comment.authorRole} />
            {isBestAnswer ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                <Award className="h-3.5 w-3.5" />
                ベストアンサー
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">{formatDate(comment.postedAt)}</p>
        </div>
      </div>

      <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/90">
        {comment.body}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={isLiked ? "default" : "outline"}
          onClick={() => onHelpfulToggle(comment.id)}
        >
          <ThumbsUp className="h-4 w-4" />
          参考になった {comment.helpfulCount}
        </Button>

        {depth === 0 ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onReplyClick(comment.id)}
          >
            <CornerDownRight className="h-4 w-4" />
            返信する
          </Button>
        ) : null}

        {allowBestAnswer && depth === 0 && onBestAnswerToggle ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onBestAnswerToggle(comment.id)}
          >
            <Award className="h-4 w-4" />
            {isBestAnswer ? "ベストアンサー解除" : "ベストアンサーにする"}
          </Button>
        ) : null}
      </div>

      {comment.replies?.length ? (
        <div className="space-y-3 border-l border-dashed border-border/80 pl-2">
          {comment.replies.map((reply) => (
            <CommentCard
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              bestAnswerId={bestAnswerId}
              likedCommentIds={likedCommentIds}
              onHelpfulToggle={onHelpfulToggle}
              onReplyClick={onReplyClick}
              onBestAnswerToggle={onBestAnswerToggle}
              allowBestAnswer={allowBestAnswer}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function CommentSection({
  title = "コメント",
  description,
  initialComments,
  emptyMessage,
  composerTitle,
  composerDescription,
  submitLabel,
  allowBestAnswer = false,
  initialBestAnswerId,
}: {
  title?: string;
  description?: string;
  initialComments: CommunityComment[];
  emptyMessage?: string;
  composerTitle?: string;
  composerDescription?: string;
  submitLabel?: string;
  allowBestAnswer?: boolean;
  initialBestAnswerId?: string;
}) {
  const [comments, setComments] = useState(initialComments);
  const [bestAnswerId, setBestAnswerId] = useState(initialBestAnswerId);
  const [likedCommentIds, setLikedCommentIds] = useState<Set<string>>(new Set());
  const [composerForm, setComposerForm] = useState(createDefaultComposerState());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyForm, setReplyForm] = useState(createDefaultComposerState());

  const commentCount = useMemo(() => {
    return comments.reduce((count, comment) => {
      return count + 1 + (comment.replies?.length ?? 0);
    }, 0);
  }, [comments]);

  const handleHelpfulToggle = (id: string) => {
    const isLiked = likedCommentIds.has(id);

    setLikedCommentIds((prev) => {
      const next = new Set(prev);
      if (isLiked) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

    setComments((prev) =>
      updateCommentTree(prev, id, (comment) => ({
        ...comment,
        helpfulCount: Math.max(0, comment.helpfulCount + (isLiked ? -1 : 1)),
      }))
    );
  };

  const handleCommentSubmit = () => {
    if (!composerForm.body.trim()) {
      return;
    }

    const nextComment: CommunityComment = {
      id: `comment-${Date.now()}`,
      authorName: buildAuthorName(composerForm),
      authorRole: buildAuthorRole(composerForm),
      postedAt: new Date().toISOString(),
      body: composerForm.body.trim(),
      helpfulCount: 0,
      replies: [],
    };

    setComments((prev) => [nextComment, ...prev]);
    setComposerForm(createDefaultComposerState());
  };

  const handleReplySubmit = () => {
    if (!replyingTo || !replyForm.body.trim()) {
      return;
    }

    const reply: CommunityComment = {
      id: `reply-${Date.now()}`,
      authorName: buildAuthorName(replyForm),
      authorRole: buildAuthorRole(replyForm),
      postedAt: new Date().toISOString(),
      body: replyForm.body.trim(),
      helpfulCount: 0,
    };

    setComments((prev) =>
      updateCommentTree(prev, replyingTo, (comment) => ({
        ...comment,
        replies: [...(comment.replies ?? []), reply],
      }))
    );
    setReplyingTo(null);
    setReplyForm(createDefaultComposerState());
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-primary" />
            {composerTitle ?? "コメントを投稿する"}
          </CardTitle>
          <CardDescription>
            {composerDescription ?? "教育現場での経験や意見を共有できます。"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CommentComposer
            title={composerTitle ?? "新しいコメント"}
            description={composerDescription}
            submitLabel={submitLabel ?? "コメントを投稿"}
            form={composerForm}
            onFormChange={setComposerForm}
            onSubmit={handleCommentSubmit}
          />
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <div className="rounded-full border bg-muted/40 px-3 py-1 text-sm text-muted-foreground">
            {commentCount}件
          </div>
        </div>

        {comments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              {emptyMessage ?? "まだコメントはありません。最初の投稿をしてみましょう。"}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="space-y-3">
                <CommentCard
                  comment={comment}
                  bestAnswerId={bestAnswerId}
                  likedCommentIds={likedCommentIds}
                  onHelpfulToggle={handleHelpfulToggle}
                  onReplyClick={setReplyingTo}
                  onBestAnswerToggle={
                    allowBestAnswer
                      ? (id) => setBestAnswerId((prev) => (prev === id ? undefined : id))
                      : undefined
                  }
                  allowBestAnswer={allowBestAnswer}
                />

                {replyingTo === comment.id ? (
                  <CommentComposer
                    title="返信を入力"
                    submitLabel="返信を投稿"
                    form={replyForm}
                    onFormChange={setReplyForm}
                    onSubmit={handleReplySubmit}
                    compact
                  />
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
