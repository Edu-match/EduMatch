import { NextRequest, NextResponse } from "next/server";
import { recomputeTopicEdges } from "@/lib/interop-topic-edges-ai";
import { verifyCron } from "@/lib/security";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** 日次：トピックの議論内容から「内容ベースのノード接続」を Gemma で再生成 */
export async function GET(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await recomputeTopicEdges();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/interop-topic-edges]", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
