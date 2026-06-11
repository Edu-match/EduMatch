import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth";
import { getAiKenteiDb } from "@/lib/ai-kentei-db";
import { mapForumReplyForApi } from "@/lib/forum-ai-reply";
import { notifyAdminsForumHumanActivityMilestones } from "@/lib/forum-article-notify";
import { moderateAndNotify } from "@/lib/post-moderation";

export const runtime = "nodejs";
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
    const includeHidden = url.searchParams.get("includeHidden") === "true";

    // includeHidden は管理者のみ許可
    let isAdmin = false;
    if (includeHidden) {
      const { getCurrentProfile } = await import("@/lib/auth");
      const profile = await getCurrentProfile();
      isAdmin = profile?.role === "ADMIN";
    }
    const hiddenFilter = includeHidden && isAdmin ? undefined : false;

    const [posts, total, room] = await Promise.all([
      prisma.forumPost.findMany({
        where: { room_id: roomId, ...(hiddenFilter !== undefined && { is_hidden: hiddenFilter }) },
        orderBy: { created_at: "desc" },
        skip,
        take: PAGE_SIZE,
        include: {
          topic: { select: { id: true, title: true } },
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
      prisma.forumPost.count({ where: { room_id: roomId, ...(hiddenFilter !== undefined && { is_hidden: hiddenFilter }) } }),
      prisma.forumRoom.findUnique({ where: { id: roomId }, select: { ai_discussion: true } }),
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

    const roomAiDiscussion = room?.ai_discussion ?? false;

    const result = posts.map((post) => ({
      id: post.id,
      roomId: post.room_id,
      topicId: post.topic_id ?? undefined,
      topicTitle: post.topic?.title ?? undefined,
      authorName: post.author_name,
      authorUserId: post.author_id ?? undefined,
      authorRole: post.author_role,
      body: post.body,
      likeCount: likeMap[post.id] ?? 0,
      replyCount: post._count.replies,
      postedAt: post.created_at.toISOString(),
      isPinned: post.is_pinned,
      isHidden: post.is_hidden,
      relatedArticleUrl: post.related_article_url ?? undefined,
      aiKenteiPassed: post.ai_kentei_passed,
      replies: post.replies.map((r, replyIndex) =>
        mapForumReplyForApi(r, {
          post: {
            author_id: post.author_id,
            author_name: post.author_name,
            created_at: post.created_at,
          },
          roomAiDiscussion,
          replyIndex,
        })
      ),
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

    // ログイン不要：未ログインでも author_name（ニックネーム）があれば匿名投稿（author_id null）を許可
    const user = await getCurrentUser();
    const profile = user ? await getCurrentProfile() : null;

    // AI検定合格チェック
    let aiKenteiPassed = false;
    if (profile?.id) {
      try {
        const kenteiDb = await getAiKenteiDb();
        const { data } = await kenteiDb
          .from("ai_kentei_exam_sessions")
          .select("passed")
          .eq("user_id", profile.id)
          .eq("passed", true)
          .limit(1);
        aiKenteiPassed = !!(data && data.length > 0);
      } catch {
        // AI検定DBへの接続失敗は無視
      }
    }

    const body = await req.json();
    const { authorName, authorRole, postBody, relatedArticleUrl, topicId } = body as {
      authorName: string;
      authorRole: string;
      postBody: string;
      relatedArticleUrl?: string;
      topicId?: string | null;
    };

    if (!postBody?.trim()) {
      return NextResponse.json({ error: "postBody is required" }, { status: 400 });
    }

    const trimmedName = authorName?.trim() ?? "";
    if (!trimmedName) {
      return NextResponse.json({ error: "ニックネームを入力してください" }, { status: 400 });
    }
    if (trimmedName === "匿名ユーザー" || trimmedName === "匿名") {
      return NextResponse.json({ error: "匿名での投稿はできません" }, { status: 400 });
    }

    const customRole = authorRole?.trim() ?? "";
    if (!customRole || customRole === "一般" || customRole === "匿名") {
      return NextResponse.json({ error: "肩書きを入力してください" }, { status: 400 });
    }
    if (customRole.length > 120) {
      return NextResponse.json({ error: "肩書きは120文字以内で入力してください" }, { status: 400 });
    }

    const resolvedAuthorRole = customRole;

    let resolvedTopicId: string | null = topicId?.trim() || null;
    if (resolvedTopicId) {
      const t = await prisma.forumRoomTopic.findFirst({
        where: { id: resolvedTopicId, room_id: roomId },
        select: { id: true },
      });
      if (!t) resolvedTopicId = null;
    }
    if (!resolvedTopicId) {
      const latest = await prisma.forumRoomTopic.findFirst({
        where: { room_id: roomId },
        orderBy: { period_start: "desc" },
        select: { id: true },
      });
      resolvedTopicId = latest?.id ?? null;
    }

    // モデレーション: AI判定で投稿可否を確認し、必要なら Slack へ通知
    const url = new URL(req.url);
    const origin = `${url.protocol}//${url.host}`;
    const moderation = await moderateAndNotify({
      text: postBody.trim(),
      kind: "comment",
      featureLabel: "井戸端会議",
      userId: user?.id ?? "guest",
      userName: profile?.name || trimmedName || "ゲスト",
      contextUrl: `${origin}/forum/${roomId}`,
    });
    if (moderation.skipped) {
      return NextResponse.json(
        { error: "サーバー設定が不足しています。" },
        { status: 503 }
      );
    }
    if (!moderation.allowed) {
      if (moderation.source === "error") {
        return NextResponse.json(
          {
            error:
              "投稿内容の確認中にエラーが発生しました。しばらく経ってからお試しください。",
          },
          { status: 503 }
        );
      }
      return NextResponse.json(
        {
          error:
            "この内容はコミュニティガイドラインに適合しないため投稿できません。表現を見直してください。",
        },
        { status: 400 }
      );
    }

    const post = await prisma.forumPost.create({
      data: {
        room_id: roomId,
        topic_id: resolvedTopicId,
        author_id: profile?.id ?? null,
        author_name: trimmedName,
        author_role: resolvedAuthorRole,
        body: postBody.trim(),
        related_article_url: relatedArticleUrl?.trim() || null,
        ai_kentei_passed: aiKenteiPassed,
      },
      include: { topic: { select: { id: true, title: true } } },
    });

    void notifyAdminsForumHumanActivityMilestones(roomId).catch((e) =>
      console.error("[forum posts POST] notifyAdminsForumHumanActivityMilestones", e)
    );

    return NextResponse.json({
      post: {
        id: post.id,
        roomId: post.room_id,
        topicId: post.topic_id ?? undefined,
        topicTitle: post.topic?.title ?? undefined,
        authorName: post.author_name,
        authorUserId: post.author_id ?? undefined,
        authorRole: post.author_role,
        body: post.body,
        likeCount: 0,
        replyCount: 0,
        postedAt: post.created_at.toISOString(),
        isPinned: post.is_pinned,
        relatedArticleUrl: post.related_article_url ?? undefined,
        aiKenteiPassed: post.ai_kentei_passed,
        replies: [],
      },
    }, { status: 201 });
  } catch (err) {
    console.error("[forum/rooms/:id/posts POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
