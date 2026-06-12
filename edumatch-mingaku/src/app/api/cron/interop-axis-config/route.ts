import { NextRequest, NextResponse } from "next/server";
import { reevaluateAxisConfig } from "@/lib/interop-axis-ai";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function verifyCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV === "development";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/** 週次：議論を俯瞰して2軸そのものを再評価し、必要なら更新（更新時は座標も再計算） */
export async function GET(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await reevaluateAxisConfig();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/interop-axis-config]", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
