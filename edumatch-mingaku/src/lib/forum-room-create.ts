import { prisma } from "@/lib/prisma";
import { isPrismaMissingColumn, isPrismaUniqueViolation } from "@/lib/prisma-schema-fallback";

export type CreateForumRoomInput = {
  id: string;
  name: string;
  description: string;
  weeklyTopic: string;
  aiDiscussion: boolean;
  aiWeeklyTopicEnabled: boolean;
  emoji: string;
  createdBy: string;
  categoryId?: string;
  /** コミュニティ内のユーザー作成ルームでは省略（ユニーク制約回避） */
  subCategoryId?: string;
};

type CreatedForumRoom = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  weekly_topic: string;
  ai_discussion: boolean;
  ai_weekly_topic_enabled: boolean;
  created_at: Date;
};

async function insertForumRoomRaw(
  data: CreateForumRoomInput,
  withCategoryLink: boolean
): Promise<void> {
  if (withCategoryLink && data.categoryId) {
    await prisma.$executeRaw`
      INSERT INTO forum_rooms (
        id, name, description, emoji, weekly_topic,
        ai_discussion, ai_weekly_topic_enabled, created_by, category_id
      ) VALUES (
        ${data.id}, ${data.name}, ${data.description}, ${data.emoji}, ${data.weeklyTopic},
        ${data.aiDiscussion}, ${data.aiWeeklyTopicEnabled}, ${data.createdBy}::uuid, ${data.categoryId}::uuid
      )
    `;
    return;
  }

  await prisma.$executeRaw`
    INSERT INTO forum_rooms (
      id, name, description, emoji, weekly_topic,
      ai_discussion, ai_weekly_topic_enabled, created_by
    ) VALUES (
      ${data.id}, ${data.name}, ${data.description}, ${data.emoji}, ${data.weeklyTopic},
      ${data.aiDiscussion}, ${data.aiWeeklyTopicEnabled}, ${data.createdBy}::uuid
    )
  `;
}

export async function createForumRoomSafe(
  data: CreateForumRoomInput
): Promise<CreatedForumRoom> {
  const baseData = {
    id: data.id,
    name: data.name,
    description: data.description,
    emoji: data.emoji,
    weekly_topic: data.weeklyTopic,
    ai_discussion: data.aiDiscussion,
    ai_weekly_topic_enabled: data.aiWeeklyTopicEnabled,
    created_by: data.createdBy,
    ...(data.categoryId ? { category_id: data.categoryId } : {}),
    ...(data.subCategoryId ? { sub_category_id: data.subCategoryId } : {}),
  };

  try {
    return await prisma.forumRoom.create({ data: baseData });
  } catch (err) {
    if (isPrismaUniqueViolation(err) && data.categoryId && data.subCategoryId) {
      // (category_id, sub_category_id) はメインルームが占有済み → sub なしで再試行
      return createForumRoomSafe({ ...data, subCategoryId: undefined });
    }

    if (isPrismaMissingColumn(err)) {
      await insertForumRoomRaw(data, !!data.categoryId);
      const room = await prisma.forumRoom.findUnique({ where: { id: data.id } });
      if (!room) throw new Error("forum room insert failed");
      return room;
    }

    throw err;
  }
}

export function forumRoomCreateErrorMessage(err: unknown): string | null {
  const code = (err as { code?: string })?.code;
  if (code === "P2002") {
    return "同じ名前の部屋が既に存在します";
  }
  if (code === "P2003") {
    return "ログイン情報が無効です。再度ログインしてください";
  }
  return null;
}
