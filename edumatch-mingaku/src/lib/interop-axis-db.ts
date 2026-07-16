import { prisma } from "@/lib/prisma";
import {
  DEFAULT_AXIS_CONFIG,
  DEFAULT_TOPIC_AXIS,
  DEFAULT_AXIS3,
  type AxisConfig,
  type AxisPoint,
} from "@/lib/interop-topic-axis";

/** 軸定義（ラベル）を取得。週次の自動変更は廃止し、固定（初期値 or 管理画面で手動設定した値）を返す。 */
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

/**
 * 各トピックの2軸座標を返す。
 * ※2軸は「固定」方針。週次/日次の自動再分布は廃止したため、常に設計済みの初期座標を返す。
 *   （動的分布は第3軸＝高さ のみが担う。interop_topic_axis3 を参照。）
 */
export async function getTopicPositions(): Promise<Record<number, AxisPoint>> {
  return DEFAULT_TOPIC_AXIS;
}

/** 軸定義を更新（管理画面からの手動設定用。週次自動変更は廃止）。 */
export async function saveAxisConfig(c: AxisConfig): Promise<void> {
  await prisma.$executeRaw`
    UPDATE interop_axis_config
    SET x_left = ${c.xLeft}, x_right = ${c.xRight}, y_top = ${c.yTop}, y_bottom = ${c.yBottom}, updated_at = now()
    WHERE id = 1`;
}

// ───────────────────────── 第3軸（3Dビュー専用・固定） ─────────────────────────

export type Axis3 = { label: string; values: Record<number, number> };

/** 第3軸（固定）。interop-topic-axis.ts の DEFAULT_AXIS3 をそのまま返す。 */
export async function getAxis3(): Promise<Axis3> {
  return DEFAULT_AXIS3;
}

// ───────────────────────── トピック間ノード接続（内容ベース） ─────────────────────────

export type TopicEdge = { a: number; b: number; weight: number };

/** トピック間の内容ベース関連（週次でLLMが生成）。テーブル未作成なら空配列。 */
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
