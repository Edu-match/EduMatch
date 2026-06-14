import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { dbRowToTopic } from "@/lib/interop-priority-topics";
import { getTopicEdges } from "@/lib/interop-axis-db";

export const dynamic = "force-dynamic";

/** トップマップの話題玉一覧（公開）。?all=true は管理者のみ非アクティブも含む。
 *  topics は InteropPriorityTopic 形、positions は no→{x,y} の軸座標。
 *  テーブル未作成（マイグレーション前）や0件のときは空配列を返し、クライアントは
 *  ハードコードのデフォルトにフォールバックする。 */
export async function GET(req: NextRequest) {
  try {
    let includeInactive = false;
    if (req.nextUrl.searchParams.get("all") === "true") {
      try { await requireAdmin(); includeInactive = true; } catch { includeInactive = false; }
    }
    const rows = await prisma.interopTopic.findMany({
      where: includeInactive ? {} : { is_active: true },
      orderBy: [{ sort_order: "asc" }, { no: "asc" }],
    });
    const topics = rows.map((r) =>
      dbRowToTopic({
        no: r.no, major: r.major, name: r.name, room_id: r.room_id,
        topic1: r.topic1, topic2: r.topic2, topic3: r.topic3,
      })
    );
    const positions: Record<number, { x: number; y: number }> = {};
    for (const r of rows) positions[r.no] = { x: r.axis_x, y: r.axis_y };
    // 管理画面用の生データも返す（編集に使う）
    const rawTopics = rows.map((r) => ({
      id: r.id, no: r.no, major: r.major, name: r.name, roomId: r.room_id,
      topic1: r.topic1, topic2: r.topic2, topic3: r.topic3, url: r.url,
      pointLinks: Array.isArray(r.point_links) ? r.point_links : [],
      axisX: r.axis_x, axisY: r.axis_y, sortOrder: r.sort_order, isActive: r.is_active,
    }));
    // 内容ベースのノード接続（Gemma生成。未生成なら空＝マップは幾何接続にフォールバック）
    const edges = await getTopicEdges();
    return NextResponse.json({ topics, positions, rawTopics, edges });
  } catch (err) {
    console.error("[interop/topics GET]", err);
    return NextResponse.json({ topics: [], positions: {}, rawTopics: [], edges: [] }, { status: 200 });
  }
}

/** 話題玉の新規作成（ADMIN のみ） */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const b = (await req.json()) as {
    no?: number; major?: string; name?: string; roomId?: string;
    topic1?: string; topic2?: string; topic3?: string; url?: string;
    axisX?: number; axisY?: number; sortOrder?: number; isActive?: boolean;
  };
  if (!b.name?.trim()) {
    return NextResponse.json({ error: "名称を入力してください" }, { status: 400 });
  }
  // no 未指定なら既存最大+1
  let no = typeof b.no === "number" ? b.no : 0;
  if (!no) {
    const max = await prisma.interopTopic.aggregate({ _max: { no: true } });
    no = (max._max.no ?? 0) + 1;
  }
  const exists = await prisma.interopTopic.findUnique({ where: { no } });
  if (exists) {
    return NextResponse.json({ error: `番号 ${no} は既に使われています` }, { status: 400 });
  }
  const created = await prisma.interopTopic.create({
    data: {
      no,
      major: (b.major ?? "F").toUpperCase().slice(0, 1),
      name: b.name.trim(),
      room_id: b.roomId?.trim() ?? "",
      topic1: b.topic1?.trim() ?? "",
      topic2: b.topic2?.trim() ?? "",
      topic3: b.topic3?.trim() ?? "",
      url: b.url?.trim() ?? "",
      axis_x: clampAxis(b.axisX),
      axis_y: clampAxis(b.axisY),
      sort_order: b.sortOrder ?? no,
      is_active: b.isActive ?? true,
    },
  });
  return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
}

function clampAxis(v: number | undefined): number {
  const n = typeof v === "number" && isFinite(v) ? v : 0;
  return Math.max(-1, Math.min(1, n));
}
