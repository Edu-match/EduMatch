import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInteropAiReplyText, INTEROP_AI_FACILITATOR_NAME } from "@/lib/forum-ai-comment";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// AI返信は投稿直後に posts API 側で即時付与する方針。
// この cron は「即時生成に失敗した投稿」を拾うフォールバック（遅延なし・直近24h対象）。
const SCAN_WINDOW_MS = 24 * 60 * 60 * 1000;
const BATCH_LIMIT = 8;

function verifyCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV === "development";
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/**
 * 定期ジョブ：AI返信がまだ付いていないInterop投稿に返信を付与する（フォールバック）。
 * - 直近24h以内 & まだAI返信なし の投稿を対象（遅延なし）
 * - 返信への返信はしない（parent_post_id IS NULL のもののみ対象）
 */
export async function GET(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const windowStart = new Date(now - SCAN_WINDOW_MS);

  const candidates = await prisma.interopPost.findMany({
    where: {
      is_hidden: false,
      is_pinned: false,
      is_ai_reply: false,
      parent_post_id: null,
      created_at: { gte: windowStart },
      author_name: { not: INTEROP_AI_FACILITATOR_NAME },
      replies: { none: {} },
    },
    select: {
      id: true,
      body: true,
      topic_id: true,
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

  const due = candidates.slice(0, BATCH_LIMIT);

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
        topic_id: post.topic_id,
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
