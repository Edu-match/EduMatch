import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** 返信一覧取得 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;

    const replies = await prisma.forumReply.findMany({
      where: { post_id: postId },
      orderBy: { created_at: "asc" },
    });

    const likeCounts = await Promise.all(
      replies.map(async (r) => {
        const count = await prisma.forumLike.count({
          where: { target_id: r.id, target_type: "reply" },
        });
        return { id: r.id, count };
      })
    );
    const likeMap = Object.fromEntries(likeCounts.map((l) => [l.id, l.count]));

    return NextResponse.json({
      replies: replies.map((r) => ({
        id: r.id,
        authorName: r.author_name,
        authorRole: r.author_role,
        body: r.body,
        likeCount: likeMap[r.id] ?? 0,
        postedAt: r.created_at.toISOString(),
      })),
    });
  } catch (err) {
    console.error("[forum/posts/:id/replies GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** 返信投稿 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;

    const post = await prisma.forumPost.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const user = await getCurrentUser();
    const profile = user ? await getCurrentProfile() : null;

    const body = await req.json();
    const { authorName, authorRole, replyBody } = body as {
      authorName: string;
      authorRole: string;
      replyBody: string;
    };

    if (!replyBody?.trim()) {
      return NextResponse.json({ error: "replyBody is required" }, { status: 400 });
    }

    if (!authorName?.trim()) {
      return NextResponse.json({ error: "authorName is required" }, { status: 400 });
    }

    const reply = await prisma.forumReply.create({
      data: {
        post_id: postId,
        author_id: profile?.id ?? null,
        author_name: authorName.trim(),
        author_role: authorRole ?? "一般",
        body: replyBody.trim(),
      },
    });

    return NextResponse.json({
      reply: {
        id: reply.id,
        authorName: reply.author_name,
        authorRole: reply.author_role,
        body: reply.body,
        likeCount: 0,
        postedAt: reply.created_at.toISOString(),
      },
    }, { status: 201 });
  } catch (err) {
    console.error("[forum/posts/:id/replies POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
