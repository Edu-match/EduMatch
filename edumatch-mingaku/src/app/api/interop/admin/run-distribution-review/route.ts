import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { getAxis3 } from "@/lib/interop-axis-db";

export const dynamic = "force-dynamic";

/**
 * 第3軸は固定（interop-topic-axis.ts の DEFAULT_AXIS3）。
 * このエンドポイントは現在の第3軸情報を確認するだけ。
 */
export async function POST() {
  const profile = await getCurrentProfile().catch(() => null);
  if (process.env.NODE_ENV === "production" && profile?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const axis3 = await getAxis3();
  return NextResponse.json({
    ok: true,
    note: "第3軸は固定設定です（週次LLM巡回は廃止）",
    axis3Label: axis3.label,
    topicCount: Object.keys(axis3.values).length,
  });
}
