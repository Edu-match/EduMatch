import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 300; // 5分キャッシュ

/** 直近24時間の1時間ごとの投稿数（日本時間） */
export async function GET() {
  try {
    const rows = await prisma.$queryRaw<Array<{ hour: number; count: number }>>`
      SELECT
        EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Tokyo')::int AS hour,
        COUNT(*)::int AS count
      FROM forum_posts
      WHERE created_at >= NOW() - INTERVAL '24 hours'
        AND is_hidden = false
      GROUP BY hour
      ORDER BY hour
    `;

    const hourly = Array.from({ length: 24 }, (_, h) => {
      const row = rows.find((r) => Number(r.hour) === h);
      return row ? Number(row.count) : 0;
    });

    return NextResponse.json({ hourly });
  } catch (err) {
    console.error("[interop/hourly-activity GET]", err);
    return NextResponse.json({ hourly: Array(24).fill(0) });
  }
}
