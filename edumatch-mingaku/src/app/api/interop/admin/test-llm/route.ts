import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { getLocalLLM } from "@/lib/local-llm";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * 裏方LLM（ノード接続・マップ分布見直し・コンテンツ検索に使う getLocalLLM）へ
 * 実際に1回だけ問い合わせて、接続可否・プロバイダ(LOCAL_LLM/Groq or OpenAIフォールバック)・
 * モデル・応答時間・返答を返す。本番では管理者のみ。
 */
export async function POST() {
  const profile = await getCurrentProfile().catch(() => null);
  if (process.env.NODE_ENV === "production" && profile?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const llm = getLocalLLM();
  if (!llm) {
    return NextResponse.json({
      ok: false,
      configured: false,
      note: "LOCAL_LLM も OPENAI_API_KEY も未設定です",
    });
  }

  const t0 = Date.now();
  try {
    const r = await llm.client.chat.completions.create({
      model: llm.model,
      max_tokens: 16,
      temperature: 0,
      messages: [{ role: "user", content: "接続テストです。「OK」とだけ返答してください。" }],
    });
    return NextResponse.json({
      ok: true,
      isLocal: llm.isLocal,
      provider: llm.isLocal ? "LOCAL_LLM（Groq等）" : "OpenAI（フォールバック）",
      model: llm.model,
      latencyMs: Date.now() - t0,
      reply: r.choices[0]?.message?.content?.trim() ?? "",
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      isLocal: llm.isLocal,
      model: llm.model,
      latencyMs: Date.now() - t0,
      error: e instanceof Error ? e.message : "呼び出しに失敗しました",
    });
  }
}
