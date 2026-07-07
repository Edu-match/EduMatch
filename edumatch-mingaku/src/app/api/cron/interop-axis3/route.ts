import { NextRequest, NextResponse } from "next/server";
import { recomputeAxis3 } from "@/lib/interop-axis-ai";
import { verifyCron } from "@/lib/security";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** 週次：井戸端の議論を俯瞰し、第3軸（高さ）の意味と各トピックの値をローカルLLM(Gemma)で再計算。 */
export async function GET(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await recomputeAxis3();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/interop-axis3]", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
