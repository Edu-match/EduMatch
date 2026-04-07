"use client";

import { useMemo, useState } from "react";
import {
  Award,
  ChevronDown,
  ChevronUp,
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
import { Separator } from "@/components/ui/separator";
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
  return { name: "", body: "", role: "general", anonymous: false };
}

function updateCommentTree(
  comments: CommunityComment[],
  targetId: string,
  updater: (comment: CommunityComment) => CommunityComment
): CommunityComment[] {
  return comments.map((comment) => {
    if (comment.id === targetId) return updater(comment);
    if (!comment.replies?.length) return comment;
    return {
      ...comment,
      replies: updateCommentTree(comment.replies, targetId, updater),
    };
  });
}

function buildAuthorName(form: ComposerState) {
  if (form.anonymous) return "匿名ユーザー";
  if (form.name.trim()) return form.name.trim();
  return `${COMMUNITY_ROLE_LABELS[form.role]}ユーザー`;
}

function buildAuthorRole(form: ComposerState): CommunityRole {
  return form.anonymous ? "anonymous" : form.role;
}

function CommentComposer({
  composerKey,
  submitLabel,
  form,
  onFormChange,
  onSubmit,
  compact = false,
}: {
  composerKey: string;
  submitLabel: string;
  form: ComposerState;
  onFormChange: (form: ComposerState) => void;
  onSubmit: () => void;
  compact?: boolean;
}) {
  return (
    <div className={cn("space-y-4", compact && "rounded-xl border bg-muted/30 p-4")}>
      {!compact && (
        <div className={cn("grid gap-3", "md:grid-cols-2")}>
          <div className="space-y-1.5">
            <Label htmlFor={`${composerKey}-name`} className="text-sm">
              表示名
            </Label>
            <Input
              id={`${composerKey}-name`}
              placeholder="例: 教育現場の先生"
              value={form.name}
              disabled={form.anonymous}
              onChange={(e) => onFormChange({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">投稿者属性</Label>
            <Select
              value={form.role}
              onValueChange={(v) => onFormChange({ ...form, role: v as CommunityRole })}
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
      )}

      <div className="space-y-1.5">
        <Label htmlFor={`${composerKey}-body`} className="text-sm">
          {compact ? "返信内容" : "本文"}
        </Label>
        <Textarea
          id={`${composerKey}-body`}
          value={form.body}
          onChange={(e) => onFormChange({ ...form, body: e.target.value })}
          placeholder={
            compact
              ? "返信内容を入力してください"
              : "コミュニティに共有したい意見や体験を書いてください"
          }
          rows={compact ? 3 : 5}
          className="resize-none"
        />
      </div>

      {!compact && (
        <div className="flex items-center gap-2">
          <Checkbox
            id={`${composerKey}-anon`}
            checked={form.anonymous}
            onCheckedChange={(c) => onFormChange({ ...form, anonymous: c === true })}
          />
          <Label htmlFor={`${composerKey}-anon`} className="cursor-pointer text-sm">
            匿名で投稿する
          </Label>
        </div>
      )}

      <div className="flex items-center justify-between">
        {compact && (
          <div className="flex items-center gap-2">
            <Checkbox
              id={`${composerKey}-anon`}
              checked={form.anonymous}
              onCheckedChange={(c) => onFormChange({ ...form, anonymous: c === true })}
            />
            <Label htmlFor={`${composerKey}-anon`} className="cursor-pointer text-xs">
              匿名
            </Label>
          </div>
        )}
        <Button
          type="button"
          size={compact ? "sm" : "default"}
          onClick={onSubmit}
          disabled={!form.body.trim()}
          className={cn(!compact && "w-full sm:w-auto", compact && "ml-auto")}
        >
          <Send className="h-3.5 w-3.5" />
          {submitLabel}
        </Button>
      </div>
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
  isReplyOpen,
}: {
  comment: CommunityComment;
  depth?: number;
  bestAnswerId?: string;
  likedCommentIds: Set<string>;
  onHelpfulToggle: (id: string) => void;
  onReplyClick: (id: string | null) => void;
  onBestAnswerToggle?: (id: string) => void;
  allowBestAnswer?: boolean;
  isReplyOpen?: boolean;
}) {
  const isBestAnswer = bestAnswerId === comment.id;
  const isLiked = likedCommentIds.has(comment.id);

  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border bg-card p-4 shadow-xs",
        depth > 0 && "ml-4 border-l-2 border-l-primary/15 bg-muted/20 shadow-none",
        isBestAnswer && "border-emerald-200 bg-emerald-50/40"
      )}
    >
      {/* ヘッダー */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-sm">{comment.authorName}</span>
            <RoleBadge role={comment.authorRole} />
            {isBestAnswer && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                <Award className="h-3 w-3" />
                ベストアンサー
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{formatDate(comment.postedAt)}</p>
        </div>
      </div>

      {/* 本文 */}
      <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/90">
        {comment.body}
      </p>

      {/* アクションボタン */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button
          type="button"
          size="sm"
          variant={isLiked ? "default" : "outline"}
          className="h-7 gap-1.5 rounded-full px-3 text-xs"
          onClick={() => onHelpfulToggle(comment.id)}
        >
          <ThumbsUp className="h-3 w-3" />
          参考になった {comment.helpfulCount}
        </Button>

        {depth === 0 && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 gap-1.5 rounded-full px-3 text-xs"
            onClick={() => onReplyClick(isReplyOpen ? null : comment.id)}
          >
            <CornerDownRight className="h-3 w-3" />
            返信する
            {isReplyOpen ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>
        )}

        {allowBestAnswer && depth === 0 && onBestAnswerToggle && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 gap-1.5 rounded-full px-3 text-xs"
            onClick={() => onBestAnswerToggle(comment.id)}
          >
            <Award className="h-3 w-3" />
            {isBestAnswer ? "解除" : "ベストアンサーに選ぶ"}
          </Button>
        )}
      </div>

      {/* ネストした返信 */}
      {comment.replies?.length ? (
        <div className="space-y-3 pt-1">
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

  const commentCount = useMemo(
    () =>
      comments.reduce((count, comment) => count + 1 + (comment.replies?.length ?? 0), 0),
    [comments]
  );

  const handleHelpfulToggle = (id: string) => {
    const isLiked = likedCommentIds.has(id);
    setLikedCommentIds((prev) => {
      const next = new Set(prev);
      if (isLiked) { next.delete(id); } else { next.add(id); }
      return next;
    });
    setComments((prev) =>
      updateCommentTree(prev, id, (c) => ({
        ...c,
        helpfulCount: Math.max(0, c.helpfulCount + (isLiked ? -1 : 1)),
      }))
    );
  };

  const handleCommentSubmit = () => {
    if (!composerForm.body.trim()) return;
    const next: CommunityComment = {
      id: `comment-${Date.now()}`,
      authorName: buildAuthorName(composerForm),
      authorRole: buildAuthorRole(composerForm),
      postedAt: new Date().toISOString(),
      body: composerForm.body.trim(),
      helpfulCount: 0,
      replies: [],
    };
    setComments((prev) => [next, ...prev]);
    setComposerForm(createDefaultComposerState());
  };

  const handleReplySubmit = () => {
    if (!replyingTo || !replyForm.body.trim()) return;
    const reply: CommunityComment = {
      id: `reply-${Date.now()}`,
      authorName: buildAuthorName(replyForm),
      authorRole: buildAuthorRole(replyForm),
      postedAt: new Date().toISOString(),
      body: replyForm.body.trim(),
      helpfulCount: 0,
    };
    setComments((prev) =>
      updateCommentTree(prev, replyingTo, (c) => ({
        ...c,
        replies: [...(c.replies ?? []), reply],
      }))
    );
    setReplyingTo(null);
    setReplyForm(createDefaultComposerState());
  };

  return (
    <div className="space-y-6">
      {/* 投稿フォームカード */}
      <Card className="border-primary/20 bg-primary/5 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-primary" />
            {composerTitle ?? "コメントを投稿する"}
          </CardTitle>
          <CardDescription className="text-xs">
            {composerDescription ?? "教育現場での経験や意見を共有できます。"}
          </CardDescription>
        </CardHeader>
        <Separator className="bg-primary/10" />
        <CardContent className="pt-5">
          <CommentComposer
            composerKey="main"
            submitLabel={submitLabel ?? "コメントを投稿"}
            form={composerForm}
            onFormChange={setComposerForm}
            onSubmit={handleCommentSubmit}
          />
        </CardContent>
      </Card>

      {/* コメント一覧 */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {description && (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <span className="rounded-full border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            {commentCount} 件
          </span>
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
                  onReplyClick={(id) => {
                    setReplyingTo(id);
                    if (id === null) setReplyForm(createDefaultComposerState());
                  }}
                  onBestAnswerToggle={
                    allowBestAnswer
                      ? (id) => setBestAnswerId((prev) => (prev === id ? undefined : id))
                      : undefined
                  }
                  allowBestAnswer={allowBestAnswer}
                  isReplyOpen={replyingTo === comment.id}
                />

                {replyingTo === comment.id && (
                  <div className="ml-4">
                    <CommentComposer
                      composerKey={`reply-${comment.id}`}
                      submitLabel="返信を投稿"
                      form={replyForm}
                      onFormChange={setReplyForm}
                      onSubmit={handleReplySubmit}
                      compact
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
