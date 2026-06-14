import { NextRequest, NextResponse } from "next/server";
import type { VideoVisibility } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { extractYoutubeId } from "@/lib/youtube";

export const dynamic = "force-dynamic";

const VISIBILITY_VALUES: VideoVisibility[] = ["PUBLIC", "UNLISTED", "PRIVATE"];

function parseVisibility(value: unknown, fallback: VideoVisibility = "PRIVATE"): VideoVisibility {
  if (typeof value === "string" && VISIBILITY_VALUES.includes(value as VideoVisibility)) {
    return value as VideoVisibility;
  }
  return fallback;
}

/** 動画一覧取得（公開のみ。管理者は ?includeAll=true で全件） */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const includeAll = url.searchParams.get("includeAll") === "true"
      || url.searchParams.get("includeUnpublished") === "true";

    let isAdmin = false;
    if (includeAll) {
      const profile = await getCurrentProfile();
      isAdmin = profile?.role === "ADMIN";
    }

    const where = isAdmin && includeAll ? {} : { visibility: "PUBLIC" as VideoVisibility };

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
        visibility: v.visibility,
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
      visibility,
      isPublished,
    } = body as {
      title: string;
      description?: string;
      notes?: string;
      youtubeUrl: string;
      visibility?: VideoVisibility;
      /** @deprecated 後方互換 */
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

    const resolvedVisibility = visibility
      ? parseVisibility(visibility)
      : isPublished === true
        ? "PUBLIC"
        : "PRIVATE";

    const video = await prisma.video.create({
      data: {
        title: title.trim(),
        description: description?.trim() ?? "",
        notes: notes?.trim() || null,
        youtube_url: youtubeUrl.trim(),
        youtube_id: youtubeId,
        visibility: resolvedVisibility,
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
          visibility: video.visibility,
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
