import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { fetchYoutubeMetadata } from "@/lib/youtube-metadata";
import { fetchYoutubeCaptions } from "@/lib/youtube-transcript";
import {
  generateVideoAiSummary,
  VideoAiSummaryError,
} from "@/lib/video-ai-summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 既存動画のAI要約を生成・保存する。
 *
 * Body（任意）:
 * - metadataOnly?: boolean = false  字幕取得をスキップしてメタデータのみで要約
 *
 * metadataOnly=false で字幕が無かった場合は 200 で needsCaptionlessConfirm:true を返し、
 * UI 側で確認後に metadataOnly=true で再リクエストさせる。
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "ADMIN") {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      metadataOnly?: boolean;
    };
    const metadataOnly = body.metadataOnly === true;

    const { id } = await params;
    const video = await prisma.video.findUnique({ where: { id } });
    if (!video) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const metadata = await fetchYoutubeMetadata(video.youtube_id);
    const title = metadata?.title || video.title;
    const description = metadata?.description || video.description;
    const channelTitle = metadata?.channelTitle ?? null;

    if (!metadataOnly) {
      const captions = await fetchYoutubeCaptions(video.youtube_id);
      if (captions) {
        try {
          const result = await generateVideoAiSummary({
            title,
            description,
            channelTitle,
            transcript: captions.text,
            source: "captions",
          });
          const updated = await prisma.video.update({
            where: { id },
            data: { ai_summary: result.summary },
          });
          return NextResponse.json({
            aiSummary: updated.ai_summary,
            analyzedFrom: `${result.analyzedFrom}（${captions.languageCode}）`,
            updatedAt: updated.updated_at.toISOString(),
          });
        } catch (e) {
          if (e instanceof VideoAiSummaryError) {
            return NextResponse.json({ error: e.message }, { status: e.status });
          }
          throw e;
        }
      }

      return NextResponse.json({
        hasCaptions: false,
        needsCaptionlessConfirm: true,
      });
    }

    // metadataOnly モード
    try {
      const result = await generateVideoAiSummary({
        title,
        description,
        channelTitle,
        source: "metadata",
      });
      const updated = await prisma.video.update({
        where: { id },
        data: { ai_summary: result.summary },
      });
      return NextResponse.json({
        aiSummary: updated.ai_summary,
        analyzedFrom: result.analyzedFrom,
        updatedAt: updated.updated_at.toISOString(),
      });
    } catch (e) {
      if (e instanceof VideoAiSummaryError) {
        return NextResponse.json({ error: e.message }, { status: e.status });
      }
      throw e;
    }
  } catch (err) {
    console.error("[videos/:id/ai-summary POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
