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
