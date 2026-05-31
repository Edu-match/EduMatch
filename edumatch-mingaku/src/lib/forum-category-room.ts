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
 * category_id / sub_category_id を SELECT しない共通フィールドセット。
 * これらのカラムが DB にまだ追加されていない環境でも安全に動く。
 */
const BASE_ROOM_SELECT = {
  id: true,
  name: true,
  description: true,
  emoji: true,
  weekly_topic: true,
  ai_discussion: true,
  ai_weekly_topic_enabled: true,
  is_hidden: true,
  created_by: true,
  created_at: true,
  updated_at: true,
} as const;

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

    // まず決定論的 ID で検索（category_id/sub_category_id カラム不要）
    let room = await prisma.forumRoom.findFirst({
      where: { id },
      select: BASE_ROOM_SELECT,
    });

    // ID で見つからない場合、category_id+sub_category_id で検索（カラムがあれば）
    if (!room) {
      try {
        room = await prisma.forumRoom.findFirst({
          where: {
            category_id: category.id,
            sub_category_id: subCategory.id,
          },
          select: BASE_ROOM_SELECT,
        });
      } catch {
        // カラムがまだ存在しない環境では無視して次へ
      }
    }

    // それでも見つからない場合は新規作成
    if (!room) {
      const name = `${category.name} / ${subCategory.name}`;
      const description =
        subCategory.content_kind === "community"
          ? `${category.name} に関する話題を自由に語り合うコミュニティ掲示板です。`
          : `${category.name} に関連する${subCategory.name}について語り合う部屋です。`;

      try {
        // category_id / sub_category_id カラムを含めて作成（カラムがある環境向け）
        room = await prisma.forumRoom.create({
          data: {
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
          select: BASE_ROOM_SELECT,
        });
      } catch {
        // フォールバック: カラムなしで作成（未マイグレーション環境向け）
        room = await prisma.forumRoom.create({
          data: {
            id,
            name,
            description,
            emoji: "",
            weekly_topic: "",
            ai_discussion: true,
            ai_weekly_topic_enabled: false,
          },
          select: BASE_ROOM_SELECT,
        });
      }
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
  } catch (err) {
    console.error("[getOrCreateCategoryRoom]", err);
    return null;
  }
}
