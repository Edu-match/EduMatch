import { NextRequest, NextResponse } from "next/server";
import { recomputeTopicEdges } from "@/lib/interop-topic-edges-ai";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function verifyCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV === "development";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

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
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
