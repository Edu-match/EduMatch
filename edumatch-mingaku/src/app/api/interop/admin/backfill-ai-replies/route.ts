import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { generateInteropAiReplyText, INTEROP_AI_FACILITATOR_NAME } from "@/lib/forum-ai-comment";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * 管理者専用：既存投稿へのAI返信バックフィル。
 * 全ての既存投稿（AI返信なし・トップレベル）に対してAI返信を生成する。
 * 投稿時刻は 2026-06-11T10:00:00+09:00 として計算（遅延はもう経過済み）。
 */
export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile().catch(() => null);
  if (profile?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const posts = await prisma.interopPost.findMany({
    where: {
      is_hidden: false,
      is_ai_reply: false,
      parent_post_id: null,
      author_name: { not: INTEROP_AI_FACILITATOR_NAME },
      replies: { none: {} },
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
    },
    orderBy: { created_at: "asc" },
  });

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

  return NextResponse.json({ ok: true, total: posts.length, created, skipped, errors });
}
