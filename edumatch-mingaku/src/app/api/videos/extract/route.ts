import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { extractYoutubeId } from "@/lib/youtube";
import { fetchYoutubeMetadata } from "@/lib/youtube-metadata";
import { fetchYoutubeCaptions } from "@/lib/youtube-transcript";
import {
  generateVideoAiSummary,
  VideoAiSummaryError,
} from "@/lib/video-ai-summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 保存前に YouTube URL からタイトル・概要欄・AI要約をまとめて取得する。
 *
 * Body:
 * - youtubeUrl: 必須
 * - generateSummary?: boolean = true  要約も生成する
 * - metadataOnly?: boolean = false    字幕なし続行モード（タイトル＋概要欄のみで要約）
 *
 * 字幕なし時は 200 で needsCaptionlessConfirm:true を返し、UI 側で確認ダイアログを出す。
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

    // メタデータのみ要求された場合（または要約生成しない場合）
    if (!generateSummary) {
      return NextResponse.json({
        youtubeId,
        title: metadata.title,
        description: metadata.description,
        channelTitle: metadata.channelTitle,
        hasCaptions: null,
      });
    }

    if (!metadataOnly) {
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

      // 字幕なし → UI に確認を促す
      return NextResponse.json({
        youtubeId,
        title: metadata.title,
        description: metadata.description,
        channelTitle: metadata.channelTitle,
        hasCaptions: false,
        needsCaptionlessConfirm: true,
      });
    }

    // metadataOnly: 字幕なし続行モード
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
  } catch (err) {
    console.error("[videos/extract POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
