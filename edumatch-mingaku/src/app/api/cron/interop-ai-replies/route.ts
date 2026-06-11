import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInteropAiReplyText, INTEROP_AI_FACILITATOR_NAME } from "@/lib/forum-ai-comment";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MIN_DELAY_MS = 2 * 60 * 60 * 1000;
const MAX_DELAY_MS = 5 * 60 * 60 * 1000;
const SCAN_WINDOW_MS = 24 * 60 * 60 * 1000;
const BATCH_LIMIT = 8;

function verifyCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV === "development";
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

function replyDelayForPost(postId: string): number {
  let h = 0;
  for (let i = 0; i < postId.length; i++) {
    h = (h * 31 + postId.charCodeAt(i)) >>> 0;
  }
  return MIN_DELAY_MS + (h % (MAX_DELAY_MS - MIN_DELAY_MS));
}

/**
 * 定期ジョブ：Interop特設ページの投稿に対してAIファシリテーター返信を付与する。
 * - 2〜5時間経過 & まだAI返信なし の投稿を対象
 * - 返信への返信はしない（parent_post_id IS NULL のもののみ対象）
 */
export async function GET(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const windowStart = new Date(now - SCAN_WINDOW_MS);
  const dueBefore = new Date(now - MIN_DELAY_MS);

  const candidates = await prisma.interopPost.findMany({
    where: {
      is_hidden: false,
      is_ai_reply: false,
      parent_post_id: null,
      created_at: { gte: windowStart, lte: dueBefore },
      author_name: { not: INTEROP_AI_FACILITATOR_NAME },
      replies: { none: {} },
    },
    select: {
      id: true,
      body: true,
      created_at: true,
      subCategory: {
        select: {
          id: true,
          name: true,
          category: { select: { name: true } },
        },
      },
    },
    orderBy: { created_at: "asc" },
    take: 50,
  });

  const due = candidates
    .filter((p) => now - p.created_at.getTime() >= replyDelayForPost(p.id))
    .slice(0, BATCH_LIMIT);

  let created = 0;
  for (const post of due) {
    const replyCount = await prisma.interopPost.count({
      where: { parent_post_id: post.id, is_ai_reply: true },
    });
    if (replyCount > 0) continue;

    const recent = await prisma.interopPost.findMany({
      where: {
        sub_category_id: post.subCategory.id,
        is_hidden: false,
        is_ai_reply: false,
        parent_post_id: null,
        id: { not: post.id },
      },
      orderBy: { created_at: "desc" },
      take: 3,
      select: { author_name: true, body: true },
    });

    const text = await generateInteropAiReplyText({
      postBody: post.body,
      subCategoryName: post.subCategory.name,
      categoryName: post.subCategory.category.name,
      recentPosts: recent.reverse().map((r) => ({ authorName: r.author_name, body: r.body })),
    });
    if (!text) continue;

    await prisma.interopPost.create({
      data: {
        sub_category_id: post.subCategory.id,
        parent_post_id: post.id,
        is_ai_reply: true,
        author_name: INTEROP_AI_FACILITATOR_NAME,
        author_role: "AIファシリテーター",
        body: text,
      },
    });
    created++;
  }

  return NextResponse.json({ ok: true, scanned: candidates.length, due: due.length, created });
}
