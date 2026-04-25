import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

/** 投稿一覧取得（ページネーションあり） */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params;
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const skip = (page - 1) * PAGE_SIZE;

    const [posts, total] = await Promise.all([
      prisma.forumPost.findMany({
        where: { room_id: roomId, is_hidden: false },
        orderBy: { created_at: "desc" },
        skip,
        take: PAGE_SIZE,
        include: {
          replies: {
            orderBy: { created_at: "asc" },
          },
          _count: {
            select: {
              replies: true,
            },
          },
        },
      }),
      prisma.forumPost.count({ where: { room_id: roomId, is_hidden: false } }),
    ]);

    const likesByPost = await Promise.all(
      posts.map(async (post) => {
        const count = await prisma.forumLike.count({
          where: { target_id: post.id, target_type: "post" },
        });
        return { id: post.id, count };
      })
    );
    const likeMap = Object.fromEntries(likesByPost.map((l) => [l.id, l.count]));

    const result = posts.map((post) => ({
      id: post.id,
      roomId: post.room_id,
      authorName: post.author_name,
      authorRole: post.author_role,
      body: post.body,
      likeCount: likeMap[post.id] ?? 0,
      replyCount: post._count.replies,
      postedAt: post.created_at.toISOString(),
      isPinned: post.is_pinned,
      relatedArticleUrl: post.related_article_url ?? undefined,
      replies: post.replies.map((r) => ({
        id: r.id,
        authorName: r.author_name,
        authorRole: r.author_role,
        body: r.body,
        likeCount: 0,
        postedAt: r.created_at.toISOString(),
      })),
    }));

    return NextResponse.json({
      posts: result,
      total,
      page,
      pageSize: PAGE_SIZE,
      hasMore: skip + posts.length < total,
    });
  } catch (err) {
    console.error("[forum/rooms/:id/posts GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** 投稿作成 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params;

    // 部屋の存在確認
    const room = await prisma.forumRoom.findUnique({ where: { id: roomId } });
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const user = await getCurrentUser();
    const profile = user ? await getCurrentProfile() : null;

    const body = await req.json();
    const { authorName, authorRole, postBody, relatedArticleUrl } = body as {
      authorName: string;
      authorRole: string;
      postBody: string;
      relatedArticleUrl?: string;
    };

    if (!postBody?.trim()) {
      return NextResponse.json({ error: "postBody is required" }, { status: 400 });
    }

    if (!authorName?.trim()) {
      return NextResponse.json({ error: "authorName is required" }, { status: 400 });
    }

    const post = await prisma.forumPost.create({
      data: {
        room_id: roomId,
        author_id: profile?.id ?? null,
        author_name: authorName.trim(),
        author_role: authorRole ?? "一般",
        body: postBody.trim(),
        related_article_url: relatedArticleUrl?.trim() || null,
      },
    });

    return NextResponse.json({
      post: {
        id: post.id,
        roomId: post.room_id,
        authorName: post.author_name,
        authorRole: post.author_role,
        body: post.body,
        likeCount: 0,
        replyCount: 0,
        postedAt: post.created_at.toISOString(),
        isPinned: post.is_pinned,
        relatedArticleUrl: post.related_article_url ?? undefined,
        replies: [],
      },
    }, { status: 201 });
  } catch (err) {
    console.error("[forum/rooms/:id/posts POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
