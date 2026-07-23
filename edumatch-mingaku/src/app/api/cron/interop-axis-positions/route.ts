import { NextRequest, NextResponse } from "next/server";
import { recomputeTopicPositions } from "@/lib/interop-axis-ai";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function verifyCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV === "development";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/** 日次：各トピックのコメント・返信を踏まえて2軸座標を再計算 */
export async function GET(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await recomputeTopicPositions();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/interop-axis-positions]", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
