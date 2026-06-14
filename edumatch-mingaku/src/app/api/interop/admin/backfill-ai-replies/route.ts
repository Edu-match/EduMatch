import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { generateInteropAiReplyText, INTEROP_AI_FACILITATOR_NAME } from "@/lib/forum-ai-comment";
import { INTEROP_NO_AI_REPLY_SLUGS, isInteropAiReplyDisabled } from "@/lib/interop-ai-reply-policy";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * 管理者専用：AI返信の是正バックフィル。
 * 1) お知らせ・記事（is_pinned）に誤って付いたAI返信を削除する
 * 2) 一般の投稿（非固定・非表示・トップレベル）でAI返信が無いものへ返信を付与する
 *    （以前は約8割ランダムだったが、一般投稿には全件付与する方針に変更）
 */
export async function POST(_req: NextRequest) {
  const profile = await getCurrentProfile().catch(() => null);
  if (profile?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 1) お知らせ（固定投稿）に付いたAI返信を削除 ──
  const removed = await prisma.interopPost.deleteMany({
    where: {
      is_ai_reply: true,
      parentPost: { is: { is_pinned: true } },
    },
  });

  // ── 1b) 「登壇者への質問」配下のAI返信を削除（今後も付与しない） ──
  const removedSpeakerQa = await prisma.interopPost.deleteMany({
    where: {
      is_ai_reply: true,
      subCategory: { slug: { in: [...INTEROP_NO_AI_REPLY_SLUGS] } },
    },
  });

  // ── 2) 一般投稿（非固定・トップレベル）でAI返信が無いものを対象 ──
  const allPosts = await prisma.interopPost.findMany({
    where: {
      is_hidden: false,
      is_pinned: false,
      is_ai_reply: false,
      parent_post_id: null,
      author_name: { not: INTEROP_AI_FACILITATOR_NAME },
    },
    select: {
      id: true,
      body: true,
      topic_id: true,
      subCategory: {
        select: {
          id: true,
          name: true,
          slug: true,
          category: { select: { name: true } },
        },
      },
      replies: { where: { is_ai_reply: true }, select: { id: true }, take: 1 },
    },
    orderBy: { created_at: "asc" },
  });

  const total = allPosts.length;
  const replyless = allPosts.filter((p) => p.replies.length === 0);

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const post of replyless) {
    if (isInteropAiReplyDisabled(post.subCategory)) continue;

    const recent = await prisma.interopPost.findMany({
      where: {
        sub_category_id: post.subCategory.id,
        ...(post.topic_id ? { topic_id: post.topic_id } : {}),
        is_hidden: false,
        is_ai_reply: false,
        parent_post_id: null,
        id: { not: post.id },
      },
      orderBy: { created_at: "asc" },
      take: 3,
      select: { author_name: true, body: true },
    });

    const text = await generateInteropAiReplyText({
      postBody: post.body,
      subCategoryName: post.subCategory.name,
      categoryName: post.subCategory.category.name,
      recentPosts: recent.map((r) => ({ authorName: r.author_name, body: r.body })),
    });

    if (!text) {
      skipped++;
      errors.push(`post ${post.id}: text generation failed`);
      continue;
    }

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

  return NextResponse.json({
    ok: true,
    removedFromPinned: removed.count,
    removedFromSpeakerQa: removedSpeakerQa.count,
    totalGeneralPosts: total,
    replyless: replyless.length,
    created,
    skipped,
    coverage: total > 0 ? Math.round(((total - replyless.length + created) / total) * 100) : 0,
    errors: errors.slice(0, 10),
  });
}
