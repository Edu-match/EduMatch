import { prisma } from "@/lib/prisma";
import type { ForumRoom } from "@/lib/mock-forum";

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

/**
 * 大カテゴリ × サブカテゴリのルームを取得。存在しなければオンデマンドで作成する。
 * slug が DB に存在しない場合は null を返す。
 */
export async function getOrCreateCategoryRoom(
  categorySlug: string,
  subSlug: string
): Promise<CategoryRoomResult | null> {
  const category = await prisma.forumCategory.findUnique({
    where: { slug: categorySlug },
  });
  const subCategory = await prisma.forumSubCategory.findUnique({
    where: { slug: subSlug },
  });
  if (!category || !subCategory) return null;

  let room = await prisma.forumRoom.findFirst({
    where: { category_id: category.id, sub_category_id: subCategory.id },
  });

  if (!room) {
    const id = categoryRoomId(categorySlug, subSlug);
    const name = `${category.name} / ${subCategory.name}`;
    const description =
      subCategory.content_kind === "community"
        ? `${category.name} に関する話題を自由に語り合うコミュニティ掲示板です。`
        : `${category.name} に関連する${subCategory.name}について語り合う部屋です。`;

    // 重複作成の競合を吸収（UNIQUE 制約 or 同一 id）
    room = await prisma.forumRoom.upsert({
      where: { id },
      update: {},
      create: {
        id,
        name,
        description,
        emoji: "",
        weekly_topic: "",
        ai_discussion: true,
        ai_weekly_topic_enabled: false,
        category_id: category.id,
        sub_category_id: subCategory.id,
      },
    });
  }

  const postCount = await prisma.forumPost.count({
    where: { room_id: room.id, is_hidden: false },
  });
  const distinctAuthors = await prisma.forumPost.findMany({
    where: { room_id: room.id, is_hidden: false, author_id: { not: null } },
    select: { author_id: true },
    distinct: ["author_id"],
  });
  const latestPost = await prisma.forumPost.findFirst({
    where: { room_id: room.id, is_hidden: false },
    orderBy: { created_at: "desc" },
    select: { created_at: true },
  });
  const latestTopic = await prisma.forumRoomTopic.findFirst({
    where: { room_id: room.id },
    orderBy: { period_start: "desc" },
    select: { id: true, title: true },
  });

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
}
