import { prisma } from "@/lib/prisma";
import {
  DEFAULT_AXIS_CONFIG,
  DEFAULT_TOPIC_AXIS,
  type AxisConfig,
  type AxisPoint,
} from "@/lib/interop-topic-axis";

/** 軸定義を取得（テーブル未作成・空なら初期値） */
export async function getAxisConfig(): Promise<AxisConfig> {
  try {
    const rows = await prisma.$queryRaw<
      Array<{ x_left: string; x_right: string; y_top: string; y_bottom: string }>
    >`SELECT x_left, x_right, y_top, y_bottom FROM interop_axis_config WHERE id = 1 LIMIT 1`;
    const r = rows[0];
    if (!r) return DEFAULT_AXIS_CONFIG;
    return { xLeft: r.x_left, xRight: r.x_right, yTop: r.y_top, yBottom: r.y_bottom };
  } catch {
    return DEFAULT_AXIS_CONFIG;
  }
}

/** 各トピックの座標を取得（空なら初期値） */
export async function getTopicPositions(): Promise<Record<number, AxisPoint>> {
  try {
    const rows = await prisma.$queryRaw<
      Array<{ topic_no: number; x: number; y: number }>
    >`SELECT topic_no, x, y FROM interop_topic_position`;
    const map: Record<number, AxisPoint> = {};
    for (const r of rows) map[Number(r.topic_no)] = { x: Number(r.x), y: Number(r.y) };
    return Object.keys(map).length > 0 ? map : DEFAULT_TOPIC_AXIS;
  } catch {
    return DEFAULT_TOPIC_AXIS;
  }
}

/** 1トピックの座標を upsert */
export async function saveTopicPosition(no: number, x: number, y: number): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO interop_topic_position (topic_no, x, y, updated_at)
    VALUES (${no}, ${x}, ${y}, now())
    ON CONFLICT (topic_no) DO UPDATE SET x = ${x}, y = ${y}, updated_at = now()`;
}

/** 軸定義を更新 */
export async function saveAxisConfig(c: AxisConfig): Promise<void> {
  await prisma.$executeRaw`
    UPDATE interop_axis_config
    SET x_left = ${c.xLeft}, x_right = ${c.xRight}, y_top = ${c.yTop}, y_bottom = ${c.yBottom}, updated_at = now()
    WHERE id = 1`;
}

// ───────────────────────── 第3軸（週次ローカルLLM巡回） ─────────────────────────

export type Axis3 = { label: string; values: Record<number, number> };

export async function getAxis3(): Promise<Axis3> {
  let label = "短期 ↔ 長期";
  const values: Record<number, number> = {};
  try {
    const meta = await prisma.$queryRaw<Array<{ label: string }>>`
      SELECT label FROM interop_axis3_meta WHERE id = 1 LIMIT 1`;
    if (meta[0]?.label) label = meta[0].label;
    const rows = await prisma.$queryRaw<Array<{ topic_no: number; v: number }>>`
      SELECT topic_no, v FROM interop_topic_axis3`;
    for (const r of rows) values[Number(r.topic_no)] = Number(r.v);
  } catch {
    /* テーブル未作成時は既定ラベル＋空 */
  }
  return { label, values };
}

export async function saveAxis3Label(label: string): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO interop_axis3_meta (id, label, updated_at)
    VALUES (1, ${label}, now())
    ON CONFLICT (id) DO UPDATE SET label = ${label}, updated_at = now()`;
}

export async function saveTopicAxis3(no: number, v: number): Promise<void> {
  const c = Math.max(0, Math.min(1, v));
  await prisma.$executeRaw`
    INSERT INTO interop_topic_axis3 (topic_no, v, updated_at)
    VALUES (${no}, ${c}, now())
    ON CONFLICT (topic_no) DO UPDATE SET v = ${c}, updated_at = now()`;
}

// ───────────────────────── トピック間ノード接続（内容ベース） ─────────────────────────

export type TopicEdge = { a: number; b: number; weight: number };

/** トピック間の内容ベース関連（Gemmaが日次で生成）。テーブル未作成なら空配列。 */
export async function getTopicEdges(): Promise<TopicEdge[]> {
  try {
    const rows = await prisma.$queryRaw<
      Array<{ topic_no_a: number; topic_no_b: number; weight: number }>
    >`SELECT topic_no_a, topic_no_b, weight FROM interop_topic_edges`;
    return rows.map((r) => ({ a: Number(r.topic_no_a), b: Number(r.topic_no_b), weight: Number(r.weight) }));
  } catch {
    return [];
  }
}

/** 関連エッジを総入れ替え（a<b に正規化・重複排除）。 */
export async function saveTopicEdges(edges: Array<{ a: number; b: number; weight?: number }>): Promise<void> {
  const norm = new Map<string, TopicEdge>();
  for (const e of edges) {
    const a = Math.min(e.a, e.b);
    const b = Math.max(e.a, e.b);
    if (a === b || !Number.isFinite(a) || !Number.isFinite(b)) continue;
    norm.set(`${a}:${b}`, { a, b, weight: Number.isFinite(e.weight) ? Number(e.weight) : 1 });
  }
  await prisma.$executeRaw`DELETE FROM interop_topic_edges`;
  for (const e of norm.values()) {
    await prisma.$executeRaw`
      INSERT INTO interop_topic_edges (topic_no_a, topic_no_b, weight, updated_at)
      VALUES (${e.a}, ${e.b}, ${e.weight}, now())
      ON CONFLICT (topic_no_a, topic_no_b) DO UPDATE SET weight = ${e.weight}, updated_at = now()`;
  }
}
