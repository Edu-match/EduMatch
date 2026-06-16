import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { getLocalLLM } from "@/lib/local-llm";
import { recomputeTopicPositions, reevaluateAxisConfig } from "@/lib/interop-axis-ai";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * 週1で自動実行している「投稿を読んでマップ分布を見直す」処理を、管理者が手動実行する。
 * 実際に投稿本文をローカルLLM(Groq)に読ませて、2軸の意味の再評価＋各トピックの座標再計算を行う。
 * → ローカルLLMが本当に動いているかを「具体的な処理件数」で確認できる。
 */
export async function POST() {
  const profile = await getCurrentProfile().catch(() => null);
  if (process.env.NODE_ENV === "production" && profile?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const llm = getLocalLLM();
  if (!llm) {
    return NextResponse.json({ ok: false, note: "LOCAL_LLM も OPENAI_API_KEY も未設定です" });
  }

  const t0 = Date.now();
  try {
    // 週次：2軸の意味そのものを再評価（投稿を俯瞰）
    const axis = await reevaluateAxisConfig();
    // 日次：各トピックを投稿内容に合わせて再配置
    const positions = await recomputeTopicPositions();
    return NextResponse.json({
      ok: true,
      isLocal: llm.isLocal,
      provider: llm.isLocal ? "LOCAL_LLM（Groq等）" : "OpenAI（フォールバック）",
      model: llm.model,
      latencyMs: Date.now() - t0,
      axisChanged: axis.changed,
      positionsUpdated: positions.updated,
      positionsSkipped: positions.skipped,
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      isLocal: llm.isLocal,
      model: llm.model,
      latencyMs: Date.now() - t0,
      error: e instanceof Error ? e.message : "実行に失敗しました",
    });
  }
}
