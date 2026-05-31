import { prisma } from "@/lib/prisma";
import type { PublishStatus, Service, ServiceSortOrderTier } from "@prisma/client";

export function isPrismaMissingColumn(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: string }).code === "P2022"
  );
}

type PublishedServiceOptions = {
  memberOnlyPublic?: boolean;
  take?: number;
};

type RawServiceRow = {
  id: string;
  provider_id: string;
  title: string;
  description: string;
  content: string;
  thumbnail_url: string | null;
  category: string;
  price_info: string;
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
  images: string[];
  youtube_url: string | null;
  approved_at: Date | null;
  rejected_at: Date | null;
  rejection_reason: string | null;
  status: PublishStatus;
  submitted_at: Date | null;
  is_member_only: boolean;
  view_count: number;
  favorite_count: number;
  request_count: number;
  tags: string[];
  sort_order: ServiceSortOrderTier;
  provider_display_name: string | null;
  wp_product_id: number | null;
  review_count: number;
};

function mapRawService(row: RawServiceRow): Service {
  return {
    id: row.id,
    provider_id: row.provider_id,
    title: row.title,
    description: row.description,
    content: row.content,
    thumbnail_url: row.thumbnail_url,
    category: row.category,
    price_info: row.price_info,
    is_published: row.is_published,
    created_at: row.created_at,
    updated_at: row.updated_at,
    images: row.images,
    youtube_url: row.youtube_url,
    approved_at: row.approved_at,
    rejected_at: row.rejected_at,
    rejection_reason: row.rejection_reason,
    status: row.status,
    submitted_at: row.submitted_at,
    is_member_only: row.is_member_only,
    view_count: row.view_count,
    favorite_count: row.favorite_count,
    request_count: row.request_count,
    display_order: 999,
    tags: row.tags,
    sort_order: row.sort_order,
    provider_display_name: row.provider_display_name,
    provider_display_avatar_url: null,
    wp_product_id: row.wp_product_id,
    review_count: row.review_count,
    show_material_request_button: true,
    request_notification_emails: [],
  };
}

/** Prod2 など DB が Prisma より古い環境向けの公開サービス取得 */
export async function findPublishedServicesLegacy(
  options: PublishedServiceOptions = {}
): Promise<Service[]> {
  const memberFilter = options.memberOnlyPublic ? "AND is_member_only = false" : "";
  const limitSql = options.take ? `LIMIT ${options.take}` : "";

  const rows = await prisma.$queryRawUnsafe<RawServiceRow[]>(`
    SELECT
      id, provider_id, title, description, content, thumbnail_url, category, price_info,
      is_published, created_at, updated_at, images, youtube_url, approved_at, rejected_at,
      rejection_reason, status, submitted_at, is_member_only, view_count, favorite_count,
      request_count, tags, sort_order, provider_display_name, wp_product_id, review_count
    FROM "Service"
    WHERE (status = 'APPROVED' OR is_published = true)
    ${memberFilter}
    ORDER BY created_at DESC
    ${limitSql}
  `);

  return rows.map(mapRawService);
}

export async function findPublishedServicesWithProviders<
  TProvider extends {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
    corporateProfile: {
      notification_email_2: string | null;
      notification_email_3: string | null;
    } | null;
  },
  TOut,
>(options: PublishedServiceOptions & {
  mapProvider: (provider: TProvider | null, providerId: string) => TOut;
}): Promise<Array<Service & { provider: TOut }>> {
  const where = options.memberOnlyPublic
    ? {
        AND: [
          { OR: [{ status: "APPROVED" as const }, { is_published: true }] },
          { is_member_only: false },
        ],
      }
    : { OR: [{ status: "APPROVED" as const }, { is_published: true }] };

  try {
    const services = await prisma.service.findMany({
      where,
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
            corporateProfile: {
              select: {
                notification_email_2: true,
                notification_email_3: true,
              },
            },
          },
        },
      },
      orderBy: [
        { display_order: "asc" },
        { sort_order: "asc" },
        { created_at: "desc" },
      ],
      ...(options.take ? { take: options.take } : {}),
    });

    return services.map((s) => {
      const { provider, ...rest } = s;
      return {
        ...rest,
        provider: options.mapProvider(provider as TProvider | null, s.provider_id),
      };
    });
  } catch (err) {
    if (!isPrismaMissingColumn(err)) throw err;

    const legacy = await findPublishedServicesLegacy(options);
    const providerIds = [...new Set(legacy.map((s) => s.provider_id))];
    const profiles =
      providerIds.length > 0
        ? await prisma.profile.findMany({
            where: { id: { in: providerIds } },
            select: {
              id: true,
              name: true,
              email: true,
              avatar_url: true,
              corporateProfile: {
                select: {
                  notification_email_2: true,
                  notification_email_3: true,
                },
              },
            },
          })
        : [];
    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    return legacy.map((s) => ({
      ...s,
      provider: options.mapProvider(
        (profileMap.get(s.provider_id) as TProvider | undefined) ?? null,
        s.provider_id
      ),
    }));
  }
}

export type SafeForumRoomRow = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  weekly_topic: string;
  ai_discussion: boolean;
  ai_weekly_topic_enabled: boolean;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
};

export const SAFE_FORUM_ROOM_SELECT = {
  id: true,
  name: true,
  description: true,
  emoji: true,
  weekly_topic: true,
  ai_discussion: true,
  ai_weekly_topic_enabled: true,
  created_by: true,
  created_at: true,
  updated_at: true,
} as const;

export async function createForumRoomCompat(data: {
  id: string;
  name: string;
  description: string;
  categoryId?: string;
  subCategoryId?: string;
}): Promise<SafeForumRoomRow> {
  try {
    return await prisma.forumRoom.create({
      data: {
        id: data.id,
        name: data.name,
        description: data.description,
        emoji: "",
        weekly_topic: "",
        ai_discussion: true,
        ai_weekly_topic_enabled: false,
        category_id: data.categoryId,
        sub_category_id: data.subCategoryId,
      },
      select: SAFE_FORUM_ROOM_SELECT,
    });
  } catch (err) {
    if (!isPrismaMissingColumn(err)) throw err;

    if (data.categoryId && data.subCategoryId) {
      await prisma.$executeRaw`
        INSERT INTO forum_rooms (
          id, name, description, emoji, weekly_topic,
          ai_discussion, ai_weekly_topic_enabled,
          category_id, sub_category_id
        ) VALUES (
          ${data.id}, ${data.name}, ${data.description}, '', '',
          true, false,
          ${data.categoryId}::uuid, ${data.subCategoryId}::uuid
        )
        ON CONFLICT (id) DO NOTHING
      `;
    } else {
      await prisma.$executeRaw`
        INSERT INTO forum_rooms (
          id, name, description, emoji, weekly_topic,
          ai_discussion, ai_weekly_topic_enabled
        ) VALUES (
          ${data.id}, ${data.name}, ${data.description}, '', '',
          true, false
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }

    const room = await prisma.forumRoom.findFirst({
      where: { id: data.id },
      select: SAFE_FORUM_ROOM_SELECT,
    });
    if (!room) throw new Error("forum room insert failed");
    return room;
  }
}
