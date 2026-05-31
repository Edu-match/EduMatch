import { prisma } from "@/lib/prisma";
import type { ForumRoom } from "@/lib/mock-forum";
import {
  SAFE_FORUM_ROOM_SELECT,
  createForumRoomCompat,
} from "@/lib/prisma-schema-fallback";
import { randomUUID } from "node:crypto";

export type ForumCategoryInfo = {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
};

export type ForumSubCategoryInfo = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  contentKind: string;
};

export type CategoryRoomResult = {
  room: ForumRoom;
  category: ForumCategoryInfo;
  subCategory: ForumSubCategoryInfo;
};

function categoryRoomId(categorySlug: string, subSlug: string): string {
  return `cat-${categorySlug}--${subSlug}`;
}

function newRoomId(): string {
  return randomUUID();
}

/**
 * 大カテゴリ × サブカテゴリのルームを取得。存在しなければオンデマンドで作成する。
 * - slug が DB に存在しない場合は null を返す
 * - DB エラー（カラム未存在を含む）も null に落として 404 扱いにする
 */
export async function getOrCreateCategoryRoom(
  categorySlug: string,
  subSlug: string
): Promise<CategoryRoomResult | null> {
  try {
    const [category, subCategory] = await Promise.all([
      prisma.forumCategory.findUnique({ where: { slug: categorySlug } }),
      prisma.forumSubCategory.findUnique({ where: { slug: subSlug } }),
    ]);
    if (!category || !subCategory) return null;

    const id = categoryRoomId(categorySlug, subSlug);
    const expectedName = `${category.name} / ${subCategory.name}`;

    let room = await prisma.forumRoom.findFirst({
      where: { id },
      select: SAFE_FORUM_ROOM_SELECT,
    });

    if (!room) {
      try {
        room = await prisma.forumRoom.findFirst({
          where: { category_id: category.id, sub_category_id: subCategory.id },
          select: SAFE_FORUM_ROOM_SELECT,
        });
      } catch {
        // category_id / sub_category_id が無い環境を許容
      }
    }

    if (!room) {
      room = await prisma.forumRoom.findFirst({
        where: { name: expectedName },
        select: SAFE_FORUM_ROOM_SELECT,
      });
    }

    if (!room) {
      const description =
        subCategory.content_kind === "community"
          ? `${category.name} に関する話題を自由に語り合うコミュニティ掲示板です。`
          : `${category.name} に関連する${subCategory.name}について語り合う部屋です。`;

      room = await createForumRoomCompat({
        id: newRoomId(),
        name: expectedName,
        description,
        categoryId: category.id,
        subCategoryId: subCategory.id,
      });
    }

    if (!room) return null;

    const [postCountRes, distinctAuthorsRes, latestPostRes, latestTopicRes] =
      await Promise.allSettled([
        prisma.forumPost.count({ where: { room_id: room.id, is_hidden: false } }),
        prisma.forumPost.findMany({
          where: { room_id: room.id, is_hidden: false, author_id: { not: null } },
          select: { author_id: true },
          distinct: ["author_id"],
        }),
        prisma.forumPost.findFirst({
          where: { room_id: room.id, is_hidden: false },
          orderBy: { created_at: "desc" },
          select: { created_at: true },
        }),
        prisma.forumRoomTopic.findFirst({
          where: { room_id: room.id },
          orderBy: { period_start: "desc" },
          select: { id: true, title: true },
        }),
      ]);

    const postCount = postCountRes.status === "fulfilled" ? postCountRes.value : 0;
    const distinctAuthors =
      distinctAuthorsRes.status === "fulfilled" ? distinctAuthorsRes.value : [];
    const latestPost =
      latestPostRes.status === "fulfilled" ? latestPostRes.value : null;
    const latestTopic =
      latestTopicRes.status === "fulfilled" ? latestTopicRes.value : null;

    return {
      room: {
        id: room.id,
        name: room.name,
        description: room.description,
        emoji: room.emoji,
        weeklyTopic: room.weekly_topic,
        aiDiscussion: room.ai_discussion,
        aiWeeklyTopicEnabled: room.ai_weekly_topic_enabled,
        currentTopicId: latestTopic?.id ?? null,
        currentTopicTitle: latestTopic?.title ?? null,
        postCount,
        participantCount: distinctAuthors.length,
        lastPostedAt:
          latestPost?.created_at.toISOString() ?? room.created_at.toISOString(),
        createdBy: room.created_by ?? null,
      },
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        color: category.color,
      },
      subCategory: {
        id: subCategory.id,
        name: subCategory.name,
        slug: subCategory.slug,
        icon: subCategory.icon,
        contentKind: subCategory.content_kind,
      },
    };
  } catch (err) {
    console.error("[getOrCreateCategoryRoom]", err);
    return null;
  }
}
