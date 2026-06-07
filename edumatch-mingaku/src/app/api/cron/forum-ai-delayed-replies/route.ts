import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FORUM_AI_FACILITATOR_NAME } from "@/lib/forum-constants";
import { generateForumAiReplyText } from "@/lib/forum-ai-comment";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** AIファシリテーターが返信を付けるまでの遅延幅（投稿ごとに 2〜5 時間でランダム） */
const MIN_DELAY_MS = 2 * 60 * 60 * 1000; // 2h
const MAX_DELAY_MS = 5 * 60 * 60 * 1000; // 5h
/** これより古い無返信投稿は掘り起こさない（取りこぼし救済の上限） */
const SCAN_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h
/** 1回の実行で生成する上限（コスト・実行時間のガード） */
const BATCH_LIMIT = 8;

function verifyCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV === "development";
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/** 投稿IDから決定論的に 2〜5 時間の遅延(ms)を算出（投稿ごとにランダムだが安定） */
function replyDelayForPost(postId: string): number {
  let h = 0;
  for (let i = 0; i < postId.length; i++) {
    h = (h * 31 + postId.charCodeAt(i)) >>> 0;
  }
  return MIN_DELAY_MS + (h % (MAX_DELAY_MS - MIN_DELAY_MS));
}

/**
 * 定期ジョブ：AIディスカッション有効ルームで「返信ゼロ」のまま
 * 投稿ごとの遅延（2〜5h）を過ぎた投稿に、AIファシリテーター返信を付与する。
 * 人どうしの返信が先に付いた投稿は対象外（停滞時のみAIが入る）。
 */
export async function GET(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const windowStart = new Date(now - SCAN_WINDOW_MS);
  const dueBefore = new Date(now - MIN_DELAY_MS); // 最低でも2h経過した投稿のみ候補

  const candidates = await prisma.forumPost.findMany({
    where: {
      is_hidden: false,
      created_at: { gte: windowStart, lte: dueBefore },
      author_name: { not: FORUM_AI_FACILITATOR_NAME },
      replies: { none: {} }, // 返信ゼロ（人もAIもまだ返していない）
      room: { is: { ai_discussion: true, is_hidden: false } },
    },
    select: {
      id: true,
      body: true,
      created_at: true,
      room: { select: { id: true, name: true, description: true } },
    },
    orderBy: { created_at: "asc" },
    take: 50,
  });

  const due = candidates
    .filter((p) => now - p.created_at.getTime() >= replyDelayForPost(p.id))
    .slice(0, BATCH_LIMIT);

  let created = 0;
  for (const post of due) {
    // 並行投稿対策：直前に返信が付いていないか再確認
    const replyCount = await prisma.forumReply.count({ where: { post_id: post.id } });
    if (replyCount > 0) continue;

    // 文脈：同ルームの直近投稿（当該投稿を除く最大3件、古い順に整形）
    const recent = await prisma.forumPost.findMany({
      where: { room_id: post.room.id, is_hidden: false, id: { not: post.id } },
      orderBy: { created_at: "desc" },
      take: 3,
      select: { author_name: true, body: true },
    });

    const text = await generateForumAiReplyText({
      postBody: post.body,
      roomName: post.room.name,
      roomContext: post.room.description ?? "",
      recentPosts: recent.reverse().map((r) => ({ authorName: r.author_name, body: r.body })),
    });
    if (!text) continue;

    await prisma.forumReply.create({
      data: {
        post_id: post.id,
        author_id: null,
        author_name: FORUM_AI_FACILITATOR_NAME,
        author_role: "専門家",
        body: text,
        ai_kentei_passed: false,
      },
    });
    created++;
  }

  return NextResponse.json({
    ok: true,
    scanned: candidates.length,
    due: due.length,
    created,
  });
}
