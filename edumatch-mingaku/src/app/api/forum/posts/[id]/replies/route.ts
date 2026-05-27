import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth";
import { getAiKenteiDb } from "@/lib/ai-kentei-db";
import { getForumAuthorRoleForUser } from "@/lib/forum-author-profile";
import { FORUM_AI_FACILITATOR_NAME } from "@/lib/forum-constants";
import { mapForumReplyForApi } from "@/lib/forum-ai-reply";
import { notifyAdminsForumHumanActivityMilestones } from "@/lib/forum-article-notify";
import { moderateAndNotify } from "@/lib/post-moderation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 返信一覧取得 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;

    const post = await prisma.forumPost.findUnique({
      where: { id: postId },
      select: {
        author_id: true,
        author_name: true,
        created_at: true,
        room: { select: { ai_discussion: true } },
      },
    });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

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

    const replyContext = {
      post: {
        author_id: post.author_id,
        author_name: post.author_name,
        created_at: post.created_at,
      },
      roomAiDiscussion: post.room.ai_discussion,
    };

    return NextResponse.json({
      replies: replies.map((r, replyIndex) => ({
        ...mapForumReplyForApi(r, { ...replyContext, replyIndex }),
        likeCount: likeMap[r.id] ?? 0,
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
      select: {
        id: true,
        room_id: true,
        author_id: true,
        author_name: true,
        created_at: true,
        room: { select: { ai_discussion: true } },
      },
    });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const user = await getCurrentUser();
    const profile = user ? await getCurrentProfile() : null;
    if (!user || !profile) {
      return NextResponse.json({ error: "返信するにはログインが必要です" }, { status: 401 });
    }

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

    const trimmedName = authorName.trim();
    const isAnon = trimmedName === "匿名ユーザー" || authorRole === "匿名";
    const isAiFacilitator = trimmedName === FORUM_AI_FACILITATOR_NAME;

    // AIファシリテーター以外はモデレーション対象
    if (!isAiFacilitator) {
      const url = new URL(req.url);
      const origin = `${url.protocol}//${url.host}`;
      const moderation = await moderateAndNotify({
        text: replyBody.trim(),
        kind: "comment",
        featureLabel: "井戸端会議",
        userId: user.id,
        userName: profile.name || user.email?.split("@")[0] || "（不明）",
        contextUrl: `${origin}/forum/${post.room_id}`,
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
                "返信内容の確認中にエラーが発生しました。しばらく経ってからお試しください。",
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
    }

    let resolvedAuthorRole = "一般";
    if (isAiFacilitator) {
      resolvedAuthorRole = "専門家";
    } else if (isAnon) {
      resolvedAuthorRole = "匿名";
    } else if (profile?.id) {
      resolvedAuthorRole = await getForumAuthorRoleForUser(profile.id);
    } else {
      const guest = authorRole?.trim();
      resolvedAuthorRole =
        guest && guest.length <= 120 && guest !== "匿名" ? guest : "一般";
    }

    const priorReplyCount = await prisma.forumReply.count({ where: { post_id: postId } });

    const reply = await prisma.forumReply.create({
      data: {
        post_id: postId,
        author_id: isAiFacilitator ? null : profile?.id ?? null,
        author_name: isAiFacilitator ? FORUM_AI_FACILITATOR_NAME : trimmedName,
        author_role: resolvedAuthorRole,
        body: replyBody.trim(),
        ai_kentei_passed: isAiFacilitator ? false : aiKenteiPassed,
      },
    });

    void notifyAdminsForumHumanActivityMilestones(post.room_id).catch((e) =>
      console.error("[forum replies POST] notifyAdminsForumHumanActivityMilestones", e)
    );

    return NextResponse.json({
      reply: {
        ...mapForumReplyForApi(reply, {
          post: {
            author_id: post.author_id,
            author_name: post.author_name,
            created_at: post.created_at,
          },
          roomAiDiscussion: post.room.ai_discussion,
          replyIndex: priorReplyCount,
        }),
        likeCount: 0,
      },
    }, { status: 201 });
  } catch (err) {
    console.error("[forum/posts/:id/replies POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
