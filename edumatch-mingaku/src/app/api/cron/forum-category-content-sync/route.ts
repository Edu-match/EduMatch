import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateCategoryRoom } from "@/lib/forum-category-room";
import { getCategoryRoomContent } from "@/lib/forum-category-content";
import { FORUM_AI_FACILITATOR_NAME } from "@/lib/forum-constants";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function verifyCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV === "development";
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

const AI_AUTHOR_ROLE = "専門家";
const AUTO_PREFIX = "【自動追加】";

/**
 * 毎日1回:
 * 1) 各カテゴリ × サブカテゴリ（community除く）のルームを確保
 * 2) DBの関連コンテンツ候補を取得
 * 3) 未投稿のものだけAI名義でフォーラム投稿へ投入
 */
export async function GET(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [categories, subCategories] = await Promise.all([
      prisma.forumCategory.findMany({
        where: { is_active: true },
        orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
        select: { id: true, name: true, slug: true },
      }),
      prisma.forumSubCategory.findMany({
        where: { is_active: true, content_kind: { not: "community" } },
        orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
        select: { id: true, name: true, slug: true, content_kind: true },
      }),
    ]);

    const results: {
      categorySlug: string;
      subSlug: string;
      roomId?: string;
      inserted: number;
      skipped: number;
      error?: string;
    }[] = [];

    for (const category of categories) {
      for (const sub of subCategories) {
        const row = {
          categorySlug: category.slug,
          subSlug: sub.slug,
          roomId: undefined as string | undefined,
          inserted: 0,
          skipped: 0,
          error: undefined as string | undefined,
        };

        try {
          const roomResult = await getOrCreateCategoryRoom(category.slug, sub.slug);
          if (!roomResult) {
            row.error = "room-not-available";
            results.push(row);
            continue;
          }
          row.roomId = roomResult.room.id;

          const items = await getCategoryRoomContent(
            category.name,
            sub.content_kind,
            6
          );

          for (const item of items) {
            const existing = await prisma.forumPost.findFirst({
              where: {
                room_id: roomResult.room.id,
                author_name: FORUM_AI_FACILITATOR_NAME,
                related_article_url: item.href,
              },
              select: { id: true },
            });

            if (existing) {
              row.skipped += 1;
              continue;
            }

            await prisma.forumPost.create({
              data: {
                room_id: roomResult.room.id,
                author_name: FORUM_AI_FACILITATOR_NAME,
                author_role: AI_AUTHOR_ROLE,
                body: `${AUTO_PREFIX} ${item.title}\n\n${item.description || ""}`,
                related_article_url: item.href,
              },
            });
            row.inserted += 1;
          }
        } catch (e) {
          row.error = e instanceof Error ? e.message : String(e);
        }

        results.push(row);
      }
    }

    const insertedTotal = results.reduce((n, r) => n + r.inserted, 0);
    const skippedTotal = results.reduce((n, r) => n + r.skipped, 0);
    const failed = results.filter((r) => !!r.error).length;

    return NextResponse.json({
      processedPairs: results.length,
      insertedTotal,
      skippedTotal,
      failed,
      results,
    });
  } catch (e) {
    console.error("[cron/forum-category-content-sync]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

