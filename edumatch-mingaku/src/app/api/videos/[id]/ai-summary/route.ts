import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { fetchYoutubeMetadata } from "@/lib/youtube-metadata";
import { fetchYoutubeCaptions } from "@/lib/youtube-transcript";
import { fetchYoutubeVideoFrames } from "@/lib/youtube-video-frames";
import {
  generateVideoAiSummary,
  VideoAiSummaryError,
} from "@/lib/video-ai-summary";
import { rateLimitResponse } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** AI要約生成のレート制限（サマリー系: 10回/分） */
const AI_SUMMARY_RATE_LIMIT = { windowMs: 60 * 1000, max: 10 };
// 映像フレーム取得 + Vision 推論で最大 60 秒かかることがある
export const maxDuration = 60;

/**
 * 既存動画のAI要約を生成・保存する。
 *
 * Body（任意）:
 * - metadataOnly?: boolean = false  字幕・映像どちらも取得失敗後のフォールバックモード
 *
 * フロー:
 * 1. 字幕あり → 字幕ベース要約
 * 2. 字幕なし → 映像フレーム取得 → Vision ベース要約（ダイアログなし）
 * 3. 映像取得も失敗 → needsCaptionlessConfirm:true を返す
 * 4. metadataOnly=true → メタデータのみ要約（確認済みフォールバック）
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

    // サマリー系レート制限（10回/分・ユーザー単位）
    const rl = rateLimitResponse(`video-ai-summary:${profile.id}`, AI_SUMMARY_RATE_LIMIT);
    if (rl.limited) return rl.response;

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

    // metadataOnly: 映像・字幕どちらも取得できなかった場合のフォールバック
    if (metadataOnly) {
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
    }

    // ---- Step 1: 字幕を試みる ----------------------------------------
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

    // ---- Step 2: 映像フレームで Vision 要約 --------------------------
    const frames = await fetchYoutubeVideoFrames(video.youtube_id, { maxSprites: 3 });
    if (frames) {
      try {
        const result = await generateVideoAiSummary({
          title,
          description,
          channelTitle,
          frames: frames.images,
          source: "vision",
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
    }

    // ---- Step 3: 映像も字幕も取得不可 → UI で確認 ------------------
    return NextResponse.json({
      hasCaptions: false,
      hasVision: false,
      needsCaptionlessConfirm: true,
    });
  } catch (err) {
    console.error("[videos/:id/ai-summary POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
