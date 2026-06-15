import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 30; // 30秒キャッシュ（投稿数カウントはリアルタイム不要）

type ActivityRow = {
  sub_category_id: string;
  category_id: string;
  post_count: number;
  participant_count: number;
  last_posted_at: string | null;
};

/** サブカテゴリ／大カテゴリごとの掲示板アクティビティ（公開・固定投稿は除外） */
export async function GET() {
  try {
    const rows = await prisma.$queryRaw<
      Array<{
        sub_category_id: string;
        category_id: string;
        post_count: bigint;
        participant_count: bigint;
        last_posted_at: Date | null;
      }>
    >`
      SELECT
        p.sub_category_id,
        s.category_id,
        COUNT(*)::int AS post_count,
        COUNT(DISTINCT p.author_name)::int AS participant_count,
        MAX(p.created_at) AS last_posted_at
      FROM interop_posts p
      JOIN interop_sub_categories s ON s.id = p.sub_category_id
      WHERE p.is_hidden = false
        AND p.is_pinned = false
        AND p.is_ai_reply = false
        AND p.parent_post_id IS NULL
        AND s.is_active = true
      GROUP BY p.sub_category_id, s.category_id
    `;

    const subs: ActivityRow[] = rows.map((r) => ({
      sub_category_id: r.sub_category_id,
      category_id: r.category_id,
      post_count: Number(r.post_count),
      participant_count: Number(r.participant_count),
      last_posted_at: r.last_posted_at?.toISOString() ?? null,
    }));

    const byCategory = new Map<
      string,
      { postCount: number; participantCount: number; lastPostedAt: string | null }
    >();

    for (const row of subs) {
      const cur = byCategory.get(row.category_id) ?? {
        postCount: 0,
        participantCount: 0,
        lastPostedAt: null as string | null,
      };
      cur.postCount += row.post_count;
      cur.participantCount += row.participant_count;
      if (
        row.last_posted_at &&
        (!cur.lastPostedAt || row.last_posted_at > cur.lastPostedAt)
      ) {
        cur.lastPostedAt = row.last_posted_at;
      }
      byCategory.set(row.category_id, cur);
    }

    return NextResponse.json({
      subs: subs.map((s) => ({
        subCategoryId: s.sub_category_id,
        categoryId: s.category_id,
        postCount: s.post_count,
        participantCount: s.participant_count,
        lastPostedAt: s.last_posted_at,
      })),
      categories: [...byCategory.entries()].map(([categoryId, stats]) => ({
        categoryId,
        postCount: stats.postCount,
        participantCount: stats.participantCount,
        lastPostedAt: stats.lastPostedAt,
      })),
    });
  } catch (err) {
    console.error("[interop/activity GET]", err);
    return NextResponse.json({ subs: [], categories: [] }, { status: 200 });
  }
}
