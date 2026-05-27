import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { extractYoutubeId } from "@/lib/youtube";

export const dynamic = "force-dynamic";

/** 動画一覧取得（公開済みのみ。管理者は ?includeUnpublished=true で全件） */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const includeUnpublished = url.searchParams.get("includeUnpublished") === "true";

    let isAdmin = false;
    if (includeUnpublished) {
      const profile = await getCurrentProfile();
      isAdmin = profile?.role === "ADMIN";
    }

    const where = isAdmin && includeUnpublished ? {} : { is_published: true };

    const videos = await prisma.video.findMany({
      where,
      orderBy: { created_at: "desc" },
      include: {
        _count: { select: { comments: { where: { is_hidden: false } } } },
      },
    });

    return NextResponse.json({
      videos: videos.map((v) => ({
        id: v.id,
        title: v.title,
        description: v.description,
        youtubeUrl: v.youtube_url,
        youtubeId: v.youtube_id,
        aiSummary: v.ai_summary ?? null,
        isPublished: v.is_published,
        createdAt: v.created_at.toISOString(),
        updatedAt: v.updated_at.toISOString(),
        commentCount: v._count.comments,
      })),
    });
  } catch (err) {
    console.error("[videos GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** 動画作成（管理者のみ） */
export async function POST(req: NextRequest) {
  try {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "ADMIN") {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      description,
      notes,
      youtubeUrl,
      isPublished,
    } = body as {
      title: string;
      description?: string;
      notes?: string;
      youtubeUrl: string;
      isPublished?: boolean;
    };

    if (!title?.trim()) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    if (!youtubeUrl?.trim()) {
      return NextResponse.json({ error: "youtubeUrl is required" }, { status: 400 });
    }
    const youtubeId = extractYoutubeId(youtubeUrl);
    if (!youtubeId) {
      return NextResponse.json(
        { error: "YouTube の URL から動画IDを取得できませんでした" },
        { status: 400 }
      );
    }

    const video = await prisma.video.create({
      data: {
        title: title.trim(),
        description: description?.trim() ?? "",
        notes: notes?.trim() || null,
        youtube_url: youtubeUrl.trim(),
        youtube_id: youtubeId,
        is_published: isPublished ?? false,
        author_id: profile.id,
      },
    });

    return NextResponse.json(
      {
        video: {
          id: video.id,
          title: video.title,
          description: video.description,
          notes: video.notes,
          youtubeUrl: video.youtube_url,
          youtubeId: video.youtube_id,
          aiSummary: video.ai_summary,
          isPublished: video.is_published,
          createdAt: video.created_at.toISOString(),
          updatedAt: video.updated_at.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[videos POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
