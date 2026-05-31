import { prisma } from "@/lib/prisma";
import type { ForumRoom } from "@/lib/mock-forum";
import {
  SAFE_FORUM_ROOM_SELECT,
  createForumRoomCompat,
  type SafeForumRoomRow,
} from "@/lib/prisma-schema-fallback";

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

export function categoryRoomId(categorySlug: string, subSlug: string): string {
  return `cat-${categorySlug}--${subSlug}`;
}

function toCategoryInfo(category: {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
}): ForumCategoryInfo {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    color: category.color,
  };
}

function toSubCategoryInfo(subCategory: {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  content_kind: string;
}): ForumSubCategoryInfo {
  return {
    id: subCategory.id,
    name: subCategory.name,
    slug: subCategory.slug,
    icon: subCategory.icon,
    contentKind: subCategory.content_kind,
  };
}

async function findCategoryRoomRow(
  category: ForumCategoryInfo,
  subCategory: ForumSubCategoryInfo
): Promise<SafeForumRoomRow | null> {
  const deterministicId = categoryRoomId(category.slug, subCategory.slug);
  const expectedName = `${category.name} / ${subCategory.name}`;

  let room = await prisma.forumRoom.findFirst({
    where: { id: deterministicId },
    select: SAFE_FORUM_ROOM_SELECT,
  });
  if (room) return room;

  try {
    room = await prisma.forumRoom.findFirst({
      where: {
        category_id: category.id,
        sub_category_id: subCategory.id,
      },
      select: SAFE_FORUM_ROOM_SELECT,
    });
  } catch {
    // category_id / sub_category_id が無い環境を許容
  }
  if (room) return room;

  return prisma.forumRoom.findFirst({
    where: { name: expectedName },
    select: SAFE_FORUM_ROOM_SELECT,
  });
}

async function buildCategoryRoomResult(
  room: SafeForumRoomRow,
  category: ForumCategoryInfo,
  subCategory: ForumSubCategoryInfo
): Promise<CategoryRoomResult> {
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
    category,
    subCategory,
  };
}

async function resolveCategoryAndSub(
  categorySlug: string,
  subSlug: string
): Promise<{ category: ForumCategoryInfo; subCategory: ForumSubCategoryInfo } | null> {
  const [category, subCategory] = await Promise.all([
    prisma.forumCategory.findUnique({ where: { slug: categorySlug } }),
    prisma.forumSubCategory.findUnique({ where: { slug: subSlug } }),
  ]);
  if (!category || !subCategory) return null;
  return {
    category: toCategoryInfo(category),
    subCategory: toSubCategoryInfo(subCategory),
  };
}

/** 既存ルームのみ参照（metadata 用。作成しない） */
export async function lookupCategoryRoom(
  categorySlug: string,
  subSlug: string
): Promise<CategoryRoomResult | null> {
  try {
    const resolved = await resolveCategoryAndSub(categorySlug, subSlug);
    if (!resolved) return null;
    const room = await findCategoryRoomRow(resolved.category, resolved.subCategory);
    if (!room) return null;
    return buildCategoryRoomResult(room, resolved.category, resolved.subCategory);
  } catch (err) {
    console.error("[lookupCategoryRoom]", err);
    return null;
  }
}

/**
 * 大カテゴリ × サブカテゴリのルームを取得。存在しなければオンデマンドで作成する。
 * 並行リクエスト時は一意制約衝突後に再取得して 404 を防ぐ。
 */
export async function getOrCreateCategoryRoom(
  categorySlug: string,
  subSlug: string
): Promise<CategoryRoomResult | null> {
  try {
    const resolved = await resolveCategoryAndSub(categorySlug, subSlug);
    if (!resolved) return null;

    const { category, subCategory } = resolved;
    let room = await findCategoryRoomRow(category, subCategory);

    if (!room) {
      const description =
        subCategory.contentKind === "community"
          ? `${category.name} に関する話題を自由に語り合うコミュニティ掲示板です。`
          : `${category.name} に関連する${subCategory.name}について語り合う部屋です。`;

      try {
        room = await createForumRoomCompat({
          id: categoryRoomId(categorySlug, subSlug),
          name: `${category.name} / ${subCategory.name}`,
          description,
          categoryId: category.id,
          subCategoryId: subCategory.id,
        });
      } catch (createErr) {
        console.error("[getOrCreateCategoryRoom] create failed, retrying find", createErr);
      }

      if (!room) {
        room = await findCategoryRoomRow(category, subCategory);
      }
    }

    if (!room) return null;
    return buildCategoryRoomResult(room, category, subCategory);
  } catch (err) {
    console.error("[getOrCreateCategoryRoom]", err);
    return null;
  }
}
