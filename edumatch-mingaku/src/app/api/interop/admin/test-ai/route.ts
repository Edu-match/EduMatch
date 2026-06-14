import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { getLocalLLM } from "@/lib/local-llm";
import { moderateAndNotify } from "@/lib/post-moderation";
import {
  generateInteropAiReplyText,
  INTEROP_AI_REPLY_MODEL,
  INTEROP_AI_FACILITATOR_NAME,
} from "@/lib/forum-ai-comment";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Interop AIパイプラインの動作テスト用エンドポイント（開発・管理者専用）。
 *
 * 本番の投稿フローでは AI返信は after() で非同期生成されるため、ローカル(next dev)では
 * 確認しづらい。このエンドポイントは「モデレーション → AIファシリテーター返信」を
 * 同期実行し、結果と所要時間をまとめて返す。既定は dryRun（DBに書き込まない）。
 *
 *  GET  …各AIサブシステムの設定状況（OpenAI / Groq軽量LLM）を返すヘルスチェック
 *  POST …{ body, subCategoryName?, categoryName? } を渡すと同期でAIパイプラインを実行
 */

function allowAccess(role: string | undefined): boolean {
  // 本番では管理者のみ。ローカル/プレビューでは誰でもテスト可。
  return process.env.NODE_ENV !== "production" || role === "ADMIN";
}

export async function GET() {
  const profile = await getCurrentProfile().catch(() => null);
  if (!allowAccess(profile?.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const openaiConfigured = !!process.env.OPENAI_API_KEY?.trim();
  const llm = getLocalLLM();

  return NextResponse.json({
    env: process.env.NODE_ENV,
    aiFacilitator: {
      configured: openaiConfigured,
      model: INTEROP_AI_REPLY_MODEL,
      provider: "OpenAI",
      note: openaiConfigured ? "AI返信を生成できます" : "OPENAI_API_KEY 未設定のためAI返信は生成されません",
    },
    moderation: {
      configured: openaiConfigured,
      note: openaiConfigured ? "投稿審査が有効です" : "OPENAI_API_KEY 未設定のため審査はスキップされます",
    },
    lightLLM: {
      configured: !!llm,
      model: llm?.model ?? null,
      isLocal: llm?.isLocal ?? false,
      note: llm
        ? `軸再計算・ノード接続に利用（${llm.isLocal ? "LOCAL_LLM" : "OpenAIフォールバック"}）`
        : "LOCAL_LLM 未設定かつ OPENAI_API_KEY 無し → 軸/エッジAIは動作しません",
    },
  });
}

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile().catch(() => null);
  if (!allowAccess(profile?.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: {
    body?: string;
    subCategoryName?: string;
    categoryName?: string;
    recentPosts?: { authorName: string; body: string }[];
  };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = (payload.body ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "body は必須です" }, { status: 400 });
  }
  const subCategoryName = payload.subCategoryName?.trim() || "Education×AIゾーン";
  const categoryName = payload.categoryName?.trim() || "インタロップ";

  // ── 1) モデレーション（投稿審査） ──
  const modStart = Date.now();
  const moderation = await moderateAndNotify({
    text,
    kind: "comment",
    featureLabel: "Interop特設掲示板（テスト）",
    userId: "ai-test",
    userName: profile?.name || "AIテスト",
  }).catch((e) => {
    console.error("[test-ai] moderation", e);
    return null;
  });
  const modMs = Date.now() - modStart;

  // ── 2) AIファシリテーター返信生成 ──
  const replyStart = Date.now();
  const replyText = await generateInteropAiReplyText({
    postBody: text,
    subCategoryName,
    categoryName,
    recentPosts: payload.recentPosts,
  }).catch((e) => {
    console.error("[test-ai] reply", e);
    return null;
  });
  const replyMs = Date.now() - replyStart;

  return NextResponse.json({
    input: { body: text, subCategoryName, categoryName },
    moderation: moderation
      ? {
          skipped: moderation.skipped ?? false,
          allowed: moderation.allowed,
          toneFlag: moderation.toneFlag,
          toneReason: moderation.toneReason,
          slackAlert: moderation.slackAlert,
          summaryJa: moderation.slackSummaryJa,
          wouldAutoHide: !moderation.skipped && !moderation.allowed,
          elapsedMs: modMs,
        }
      : { error: "モデレーション実行に失敗（OPENAI_API_KEY を確認）", elapsedMs: modMs },
    aiReply: {
      facilitatorName: INTEROP_AI_FACILITATOR_NAME,
      model: INTEROP_AI_REPLY_MODEL,
      generated: !!replyText,
      body: replyText,
      elapsedMs: replyMs,
      note: replyText ? null : "返信が生成されませんでした（OPENAI_API_KEY 未設定 or API失敗）",
    },
    dryRun: true,
  });
}
