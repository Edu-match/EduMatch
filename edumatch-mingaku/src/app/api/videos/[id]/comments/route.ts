import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth";
import { getForumAuthorRoleForUser } from "@/lib/forum-author-profile";
import { moderateAndNotify } from "@/lib/post-moderation";
import { canCommentOnVideo, isVideoViewableByVisitor } from "@/lib/video-visibility";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CommentRow = {
  id: string;
  video_id: string;
  parent_id: string | null;
  author_id: string | null;
  author_name: string;
  author_role: string;
  body: string;
  is_hidden: boolean;
  created_at: Date;
};

type CommentNode = {
  id: string;
  videoId: string;
  parentId: string | null;
  authorName: string;
  authorUserId?: string;
  authorRole: string;
  body: string;
  isHidden: boolean;
  postedAt: string;
  replies: CommentNode[];
};

function buildTree(rows: CommentRow[]): CommentNode[] {
  const map = new Map<string, CommentNode>();
  rows.forEach((r) => {
    map.set(r.id, {
      id: r.id,
      videoId: r.video_id,
      parentId: r.parent_id,
      authorName: r.author_name,
      authorUserId: r.author_id ?? undefined,
      authorRole: r.author_role,
      body: r.body,
      isHidden: r.is_hidden,
      postedAt: r.created_at.toISOString(),
      replies: [],
    });
  });

  const roots: CommentNode[] = [];
  rows.forEach((r) => {
    const node = map.get(r.id);
    if (!node) return;
    if (r.parent_id && map.has(r.parent_id)) {
      map.get(r.parent_id)!.replies.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

/** コメント一覧（返信は parent_id でツリー化して返す） */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params;
    const url = new URL(req.url);
    const includeHidden = url.searchParams.get("includeHidden") === "true";

    const profile = await getCurrentProfile();
    const isAdmin = profile?.role === "ADMIN";

    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { id: true, visibility: true },
    });
    if (!video || !isVideoViewableByVisitor(video.visibility, isAdmin)) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const where = {
      video_id: videoId,
      ...(includeHidden && isAdmin ? {} : { is_hidden: false }),
    };

    const comments = await prisma.videoComment.findMany({
      where,
      orderBy: { created_at: "asc" },
    });

    return NextResponse.json({
      comments: buildTree(comments as CommentRow[]),
      total: comments.length,
    });
  } catch (err) {
    console.error("[videos/:id/comments GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** コメント・返信の投稿（ログイン必須 + AIモデレーション） */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params;

    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { id: true, visibility: true, title: true },
    });

    const user = await getCurrentUser();
    const profile = user ? await getCurrentProfile() : null;
    const isAdmin = profile?.role === "ADMIN";

    if (!video || !canCommentOnVideo(video.visibility, isAdmin)) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    if (!user || !profile) {
      return NextResponse.json(
        { error: "コメントするにはログインが必要です" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { commentBody, parentId } = body as {
      commentBody: string;
      parentId?: string | null;
    };

    if (!commentBody?.trim()) {
      return NextResponse.json({ error: "commentBody is required" }, { status: 400 });
    }

    let resolvedParentId: string | null = parentId?.trim() || null;
    if (resolvedParentId) {
      const parent = await prisma.videoComment.findFirst({
        where: { id: resolvedParentId, video_id: videoId },
        select: { id: true },
      });
      if (!parent) resolvedParentId = null;
    }

    const url = new URL(req.url);
    const origin = `${url.protocol}//${url.host}`;
    const moderation = await moderateAndNotify({
      text: commentBody.trim(),
      kind: "comment",
      featureLabel: "動画コメント",
      userId: user.id,
      userName: profile.name || user.email?.split("@")[0] || "（不明）",
      contextUrl: `${origin}/videos/${videoId}`,
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
              "コメントの確認中にエラーが発生しました。しばらく経ってからお試しください。",
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

    const authorRole = await getForumAuthorRoleForUser(profile.id);

    const comment = await prisma.videoComment.create({
      data: {
        video_id: videoId,
        parent_id: resolvedParentId,
        author_id: profile.id,
        author_name: profile.name || "（名無し）",
        author_role: authorRole,
        body: commentBody.trim(),
      },
    });

    return NextResponse.json(
      {
        comment: {
          id: comment.id,
          videoId: comment.video_id,
          parentId: comment.parent_id,
          authorName: comment.author_name,
          authorUserId: comment.author_id ?? undefined,
          authorRole: comment.author_role,
          body: comment.body,
          isHidden: comment.is_hidden,
          postedAt: comment.created_at.toISOString(),
          replies: [],
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[videos/:id/comments POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
