import { NextResponse } from "next/server";
import { getAxisConfig, getTopicPositions, getAxis3, getTopicEdges } from "@/lib/interop-axis-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** トップマップの2軸（固定）＋第3軸（週次LLM）＋トピック間ノード接続を返す。公開。 */
export async function GET() {
  try {
    const [config, positions, axis3, edges] = await Promise.all([
      getAxisConfig(),
      getTopicPositions(),
      getAxis3(),
      getTopicEdges(),
    ]);
    return NextResponse.json({ config, positions, axis3, edges });
  } catch (err) {
    console.error("[interop/axis GET]", err);
    return NextResponse.json(
      { config: null, positions: {}, axis3: { label: "短期 ↔ 長期", values: {} }, edges: [] },
      { status: 200 }
    );
  }
}
