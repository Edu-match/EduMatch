import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { getLocalLLM } from "@/lib/local-llm";
import { recomputeAxis3 } from "@/lib/interop-axis-ai";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * 週1で自動実行している「投稿を読んで第3軸の分布を見直す」処理を、管理者が手動実行する。
 * 実際に投稿本文をローカルLLM(Gemma)に読ませて、第3軸の意味の再評価＋各トピックの高さを再計算する。
 * → ローカルLLMが本当に動いているかを「具体的な処理件数」で確認できる。
 * ※2軸（X/Z 平面）は固定方針のため、ここでは再分布しない。
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
    // 週次：第3軸の意味を再評価＋各トピックの高さ(0..1)を再計算
    const axis3 = await recomputeAxis3();
    return NextResponse.json({
      ok: true,
      isLocal: llm.isLocal,
      provider: llm.isLocal ? "LOCAL_LLM（Gemma/Groq）" : "OpenAI（フォールバック）",
      model: llm.model,
      latencyMs: Date.now() - t0,
      axis3Label: axis3.label,
      axis3Updated: axis3.updated,
      axis3UsedLLM: axis3.usedLLM,
    });
  } catch (e) {
    console.error("[interop/admin/run-distribution-review]", e);
    return NextResponse.json({
      ok: false,
      isLocal: llm.isLocal,
      model: llm.model,
      latencyMs: Date.now() - t0,
      error: "実行に失敗しました",
    });
  }
}
