import { FORUM_AI_FACILITATOR_NAME } from "@/lib/forum-constants";

type ReplyLike = {
  author_id: string | null;
  author_name: string;
  created_at: Date;
};

type PostLike = {
  author_id: string | null;
  author_name: string;
  created_at: Date;
};

/** トリガー修正前に投稿者名で保存されてしまった AI 返信の判定期限（ミリ秒） */
const LEGACY_AI_REPLY_MAX_DELAY_MS = 10 * 60 * 1000;

/**
 * AIファシリテーター返信かどうか。
 * 旧データは author_name / author_id が投稿者と同一になっていることがある。
 */
export function isForumAiFacilitatorReply(
  reply: ReplyLike,
  context?: {
    post?: PostLike;
    roomAiDiscussion?: boolean;
    /** 投稿内の返信順（0 = 最初の返信） */
    replyIndex?: number;
  }
): boolean {
  if (reply.author_name === FORUM_AI_FACILITATOR_NAME || reply.author_id === null) {
    return true;
  }

  const { post, roomAiDiscussion, replyIndex } = context ?? {};
  if (!roomAiDiscussion || !post || replyIndex !== 0) {
    return false;
  }

  if (!reply.author_id || !post.author_id || reply.author_id !== post.author_id) {
    return false;
  }

  if (reply.author_name !== post.author_name) {
    return false;
  }

  const delayMs = reply.created_at.getTime() - post.created_at.getTime();
  return delayMs >= 0 && delayMs <= LEGACY_AI_REPLY_MAX_DELAY_MS;
}

export function mapForumReplyForApi(
  reply: ReplyLike & {
    id: string;
    author_role: string;
    body: string;
    ai_kentei_passed: boolean;
  },
  context?: {
    post?: PostLike;
    roomAiDiscussion?: boolean;
    replyIndex?: number;
  }
) {
  const isAi = isForumAiFacilitatorReply(reply, context);
  return {
    id: reply.id,
    authorName: isAi ? FORUM_AI_FACILITATOR_NAME : reply.author_name,
    authorUserId: isAi ? undefined : reply.author_id ?? undefined,
    authorRole: isAi ? "専門家" : reply.author_role,
    body: reply.body,
    likeCount: 0,
    postedAt: reply.created_at.toISOString(),
    aiKenteiPassed: isAi ? false : reply.ai_kentei_passed,
    isAi,
  };
}
