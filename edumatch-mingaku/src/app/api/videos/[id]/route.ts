import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { extractYoutubeId } from "@/lib/youtube";

export const dynamic = "force-dynamic";

/** 動画詳細取得 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const video = await prisma.video.findUnique({
      where: { id },
      include: {
        _count: { select: { comments: { where: { is_hidden: false } } } },
      },
    });
    if (!video) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!video.is_published) {
      const profile = await getCurrentProfile();
      if (!profile || profile.role !== "ADMIN") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    }

    return NextResponse.json({
      video: {
        id: video.id,
        title: video.title,
        description: video.description,
        notes: video.notes,
        youtubeUrl: video.youtube_url,
        youtubeId: video.youtube_id,
        aiSummary: video.ai_summary ?? null,
        isPublished: video.is_published,
        createdAt: video.created_at.toISOString(),
        updatedAt: video.updated_at.toISOString(),
        commentCount: video._count.comments,
      },
    });
  } catch (err) {
    console.error("[videos/:id GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** 動画更新（管理者のみ） */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "ADMIN") {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.video.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const { title, description, notes, youtubeUrl, isPublished, aiSummary } = body as {
      title?: string;
      description?: string;
      notes?: string | null;
      youtubeUrl?: string;
      isPublished?: boolean;
      aiSummary?: string | null;
    };

    let youtubeId = existing.youtube_id;
    let resolvedUrl = existing.youtube_url;
    if (typeof youtubeUrl === "string" && youtubeUrl.trim() && youtubeUrl.trim() !== existing.youtube_url) {
      const ytid = extractYoutubeId(youtubeUrl);
      if (!ytid) {
        return NextResponse.json(
          { error: "YouTube の URL から動画IDを取得できませんでした" },
          { status: 400 }
        );
      }
      youtubeId = ytid;
      resolvedUrl = youtubeUrl.trim();
    }

    const updated = await prisma.video.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description.trim() }),
        ...(notes !== undefined && { notes: notes?.toString().trim() || null }),
        ...(youtubeUrl !== undefined && { youtube_url: resolvedUrl, youtube_id: youtubeId }),
        ...(isPublished !== undefined && { is_published: isPublished }),
        ...(aiSummary !== undefined && { ai_summary: aiSummary?.toString().trim() || null }),
      },
    });

    return NextResponse.json({
      video: {
        id: updated.id,
        title: updated.title,
        description: updated.description,
        notes: updated.notes,
        youtubeUrl: updated.youtube_url,
        youtubeId: updated.youtube_id,
        aiSummary: updated.ai_summary ?? null,
        isPublished: updated.is_published,
        createdAt: updated.created_at.toISOString(),
        updatedAt: updated.updated_at.toISOString(),
      },
    });
  } catch (err) {
    console.error("[videos/:id PUT]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** 動画削除（管理者のみ） */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "ADMIN") {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    }
    const { id } = await params;
    await prisma.video.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[videos/:id DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
