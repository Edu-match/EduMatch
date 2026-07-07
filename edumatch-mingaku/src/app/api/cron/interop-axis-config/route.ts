import { NextRequest, NextResponse } from "next/server";
import { verifyCron } from "@/lib/security";
import { reevaluateAxisConfig } from "@/lib/interop-axis-ai";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

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
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
