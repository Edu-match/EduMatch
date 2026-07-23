import { prisma } from "@/lib/prisma";
import { FORUM_AI_FACILITATOR_NAME } from "@/lib/forum-constants";
import { FORUM_ARTICLE_SUGGESTION_KIND } from "@/lib/in-app-notification-constants";
import { getSiteOrigin } from "@/lib/site-url";

export { FORUM_AI_FACILITATOR_NAME };

export function parseForumArticleNotifyThresholds(): number[] {
  const raw = process.env.FORUM_ARTICLE_NOTIFY_THRESHOLDS ?? "10,20";
  const nums = raw
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  return [...new Set(nums)].sort((a, b) => a - b);
}

/** 投稿＋返信のうち、AIファシリテーター以外の件数（非表示投稿は除外） */
export async function countHumanForumContributions(roomId: string): Promise<number> {
  const ai = FORUM_AI_FACILITATOR_NAME;
  const [posts, replies] = await Promise.all([
    prisma.forumPost.count({
      where: { room_id: roomId, is_hidden: false, NOT: { author_name: ai } },
    }),
    prisma.forumReply.count({
      where: {
        NOT: { author_name: ai },
        post: { room_id: roomId, is_hidden: false },
      },
    }),
  ]);
  return posts + replies;
}

/**
 * 管理者向け AI 記事生成の入力用テキスト（AI ファシリテーターの発言は含めない）
 */
export async function buildForumTranscriptMarkdown(
  roomId: string,
  maxChars = 12_000
): Promise<{ text: string; roomName: string; sourceUrl: string }> {
  const room = await prisma.forumRoom.findUnique({ where: { id: roomId } });
  if (!room) {
    throw new Error("ROOM_NOT_FOUND");
  }
  const posts = await prisma.forumPost.findMany({
    where: { room_id: roomId, is_hidden: false },
    orderBy: { created_at: "asc" },
    include: {
      replies: { orderBy: { created_at: "asc" } },
    },
  });

  let buf = `# 教育のひろば「${room.name}」\n\n`;
  buf += `## 今週のお題\n${room.weekly_topic}\n\n---\n\n`;
  for (const p of posts) {
    if (p.author_name === FORUM_AI_FACILITATOR_NAME) continue;
    buf += `### ${p.author_name}（${p.author_role}）\n${p.body.trim()}\n\n`;
    for (const r of p.replies) {
      if (r.author_name === FORUM_AI_FACILITATOR_NAME) continue;
      buf += `#### 返信: ${r.author_name}（${r.author_role}）\n${r.body.trim()}\n\n`;
    }
  }

  const text =
    buf.length > maxChars ? `${buf.slice(0, maxChars)}\n\n…（以下省略）` : buf;
  const origin = getSiteOrigin();
  const sourceUrl = `${origin.replace(/\/$/, "")}/forum/${roomId}`;
  return { text, roomName: room.name, sourceUrl };
}

/**
 * 人間の投稿・返信が各しきい値を超えたら、管理者のみにサイト内通知を1回ずつ（source_id で重複防止）
 */
export async function notifyAdminsForumHumanActivityMilestones(roomId: string): Promise<void> {
  const total = await countHumanForumContributions(roomId);
  const thresholds = parseForumArticleNotifyThresholds();
  const room = await prisma.forumRoom.findUnique({
    where: { id: roomId },
    select: { name: true },
  });
  if (!room) return;

  const admins = await prisma.profile.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  if (admins.length === 0) return;

  const link = `/forum/${roomId}?fromNotify=1`;

  for (const T of thresholds) {
    if (total < T) continue;
    const sourceId = `${roomId}:milestone:${T}`;
    const title = `井戸端「${room.name}」の発言（AI除く）が${T}件に達しました`;
    await prisma.inAppNotification.createMany({
      data: admins.map((a) => ({
        user_id: a.id,
        kind: FORUM_ARTICLE_SUGGESTION_KIND,
        title,
        link,
        source_id: sourceId,
      })),
      skipDuplicates: true,
    });
  }
}
