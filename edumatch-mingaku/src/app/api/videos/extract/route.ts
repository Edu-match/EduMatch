import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { extractYoutubeId } from "@/lib/youtube";
import { fetchYoutubeMetadata } from "@/lib/youtube-metadata";
import { fetchYoutubeCaptions } from "@/lib/youtube-transcript";
import { fetchYoutubeVideoFrames } from "@/lib/youtube-video-frames";
import {
  generateVideoAiSummary,
  VideoAiSummaryError,
} from "@/lib/video-ai-summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// 映像フレーム取得 + Vision 推論で最大 60 秒かかることがある
export const maxDuration = 60;

/**
 * 保存前に YouTube URL からタイトル・概要欄・AI要約をまとめて取得する。
 *
 * Body:
 * - youtubeUrl: 必須
 * - generateSummary?: boolean = true  要約も生成する
 * - metadataOnly?: boolean = false    映像取得失敗後の続行モード（メタデータのみで要約）
 *
 * フロー:
 * 1. 字幕あり → 字幕ベース要約
 * 2. 字幕なし → 映像フレーム（storyboard）取得 → Vision ベース要約（ダイアログなし）
 * 3. 映像取得も失敗 → needsCaptionlessConfirm:true を返し UI で確認ダイアログを表示
 * 4. metadataOnly=true → メタデータのみ要約（確認済みフォールバック）
 */
export async function POST(req: NextRequest) {
  try {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "ADMIN") {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      youtubeUrl?: string;
      generateSummary?: boolean;
      metadataOnly?: boolean;
    };

    const youtubeUrl = body.youtubeUrl?.trim();
    if (!youtubeUrl) {
      return NextResponse.json({ error: "youtubeUrl is required" }, { status: 400 });
    }
    const youtubeId = extractYoutubeId(youtubeUrl);
    if (!youtubeId) {
      return NextResponse.json(
        { error: "YouTube の URL から動画IDを取得できませんでした" },
        { status: 400 }
      );
    }

    const metadata = await fetchYoutubeMetadata(youtubeId);
    if (!metadata) {
      return NextResponse.json(
        { error: "YouTube からタイトルを取得できませんでした。URL を確認してください。" },
        { status: 400 }
      );
    }

    const generateSummary = body.generateSummary !== false;
    const metadataOnly = body.metadataOnly === true;

    if (!generateSummary) {
      return NextResponse.json({
        youtubeId,
        title: metadata.title,
        description: metadata.description,
        channelTitle: metadata.channelTitle,
        hasCaptions: null,
      });
    }

    // metadataOnly: 映像・字幕どちらも取得できなかった場合のフォールバック
    if (metadataOnly) {
      try {
        const result = await generateVideoAiSummary({
          title: metadata.title,
          description: metadata.description,
          channelTitle: metadata.channelTitle,
          source: "metadata",
        });
        return NextResponse.json({
          youtubeId,
          title: metadata.title,
          description: metadata.description,
          channelTitle: metadata.channelTitle,
          hasCaptions: false,
          aiSummary: result.summary,
          analyzedFrom: result.analyzedFrom,
        });
      } catch (e) {
        if (e instanceof VideoAiSummaryError) {
          return NextResponse.json({ error: e.message }, { status: e.status });
        }
        throw e;
      }
    }

    // ---- Step 1: 字幕を試みる ----------------------------------------
    const captions = await fetchYoutubeCaptions(youtubeId);
    if (captions) {
      try {
        const result = await generateVideoAiSummary({
          title: metadata.title,
          description: metadata.description,
          channelTitle: metadata.channelTitle,
          transcript: captions.text,
          source: "captions",
        });
        return NextResponse.json({
          youtubeId,
          title: metadata.title,
          description: metadata.description,
          channelTitle: metadata.channelTitle,
          hasCaptions: true,
          aiSummary: result.summary,
          analyzedFrom: `${result.analyzedFrom}（${captions.languageCode}）`,
        });
      } catch (e) {
        if (e instanceof VideoAiSummaryError) {
          return NextResponse.json({ error: e.message }, { status: e.status });
        }
        throw e;
      }
    }

    // ---- Step 2: 映像フレームで Vision 要約 --------------------------
    const frames = await fetchYoutubeVideoFrames(youtubeId, { maxSprites: 3 });
    if (frames) {
      try {
        const result = await generateVideoAiSummary({
          title: metadata.title,
          description: metadata.description,
          channelTitle: metadata.channelTitle,
          frames: frames.images,
          source: "vision",
        });
        return NextResponse.json({
          youtubeId,
          title: metadata.title,
          description: metadata.description,
          channelTitle: metadata.channelTitle,
          hasCaptions: false,
          hasVision: true,
          aiSummary: result.summary,
          analyzedFrom: result.analyzedFrom,
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
      youtubeId,
      title: metadata.title,
      description: metadata.description,
      channelTitle: metadata.channelTitle,
      hasCaptions: false,
      hasVision: false,
      needsCaptionlessConfirm: true,
    });
  } catch (err) {
    console.error("[videos/extract POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
