import { NextResponse } from "next/server";
import { getAxisConfig, getTopicPositions } from "@/lib/interop-axis-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** トップマップの2軸（軸ラベル＋各トピック座標）を返す。公開。 */
export async function GET() {
  try {
    const [config, positions] = await Promise.all([getAxisConfig(), getTopicPositions()]);
    return NextResponse.json({ config, positions });
  } catch (err) {
    console.error("[interop/axis GET]", err);
    return NextResponse.json({ config: null, positions: {} }, { status: 200 });
  }
}
