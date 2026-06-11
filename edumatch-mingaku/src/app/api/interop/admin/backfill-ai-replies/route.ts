import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { generateInteropAiReplyText, INTEROP_AI_FACILITATOR_NAME } from "@/lib/forum-ai-comment";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * 管理者専用：既存投稿へのAI返信バックフィル。
 * 「全体の約8割」に返信が付くよう、未返信の投稿からランダムに選んで生成する
 * （既に返信が付いている投稿はカウントに含める）。
 */
export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile().catch(() => null);
  if (profile?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const TARGET_RATIO = 0.8;

  // トップレベルの全投稿（返信の有無も把握）
  const allPosts = await prisma.interopPost.findMany({
    where: {
      is_hidden: false,
      is_ai_reply: false,
      parent_post_id: null,
      author_name: { not: INTEROP_AI_FACILITATOR_NAME },
    },
    select: {
      id: true,
      body: true,
      subCategory: {
        select: {
          id: true,
          name: true,
          category: { select: { name: true } },
        },
      },
      _count: { select: { replies: true } },
    },
    orderBy: { created_at: "asc" },
  });

  const total = allPosts.length;
  const alreadyReplied = allPosts.filter((p) => p._count.replies > 0).length;
  const target = Math.ceil(total * TARGET_RATIO);
  const need = Math.max(0, target - alreadyReplied);

  // 未返信の投稿をシャッフルし、必要数だけ選ぶ（＝ランダムで約8割に返信が付く）
  const replyless = allPosts.filter((p) => p._count.replies === 0);
  for (let i = replyless.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [replyless[i], replyless[j]] = [replyless[j], replyless[i]];
  }
  const posts = replyless.slice(0, need);

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const post of posts) {
    const recent = await prisma.interopPost.findMany({
      where: {
        sub_category_id: post.subCategory.id,
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
    totalPosts: total,
    alreadyReplied,
    target,
    selected: posts.length,
    created,
    skipped,
    // 目安：返信が付いた投稿の割合
    coverage: total > 0 ? Math.round(((alreadyReplied + created) / total) * 100) : 0,
    errors,
  });
}
