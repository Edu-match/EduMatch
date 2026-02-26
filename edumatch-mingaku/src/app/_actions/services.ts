"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { sortServicesByDisplayOrder } from "@/lib/service-display-order";
import type { Service, Profile, Role } from "@prisma/client";

export type ServiceWithProvider = Service & {
  provider: Pick<Profile, "id" | "name" | "email" | "avatar_url" | "notification_email_2" | "notification_email_3">;
};

export type ContentBlock = {
  id: string;
  type: "heading1" | "heading2" | "heading3" | "paragraph" | "image" | "video" | "quote" | "divider" | "list" | "ordered-list";
  content: string;
  align?: "left" | "center" | "right";
  url?: string;
  caption?: string;
  items?: string[];
};

export type CreateServiceInput = {
  title: string;
  description: string;
  category: string;
  priceInfo: string;
  youtubeUrl?: string;
  thumbnailUrl: string;
  blocks: ContentBlock[];
  publishType: "draft" | "submit";
};

export type CreateServiceResult = { success: boolean; serviceId?: string; error?: string };
type SimpleResult = { success: boolean; error?: string };

function blocksToContent(blocks: ContentBlock[]): string {
  const parts: string[] = [];
  for (const block of blocks) {
    switch (block.type) {
      case "heading1":
        parts.push(`# ${block.content}`);
        break;
      case "heading2":
        parts.push(`## ${block.content}`);
        break;
      case "heading3":
        parts.push(`### ${block.content}`);
        break;
      case "paragraph":
        parts.push(block.content);
        break;
      case "quote":
        parts.push(`> ${block.content}`);
        break;
      case "list":
        block.items?.forEach((item) => parts.push(`- ${item}`));
        break;
      case "ordered-list":
        block.items?.forEach((item, i) => parts.push(`${i + 1}. ${item}`));
        break;
      case "image":
        if (block.url) parts.push(`![${block.caption || "画像"}](${block.url})`);
        break;
      case "video":
        if (block.url) parts.push(`[動画](${block.url})`);
        break;
      case "divider":
        parts.push("---");
        break;
    }
    parts.push("");
  }
  return parts.join("\n");
}

function extractImagesFromBlocks(blocks: ContentBlock[]): string[] {
  return blocks
    .filter((b) => b.type === "image" && b.url)
    .map((b) => b.url!)
    .filter((u) => u.length > 0);
}

async function requireAuthedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, error: "ログインが必要です" } as const;
  return { user, error: null } as const;
}

async function requireAdmin(): Promise<SimpleResult & { userId?: string }> {
  const { user, error } = await requireAuthedUser();
  if (!user) return { success: false, error };

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  if (!profile || profile.role !== ("ADMIN" as Role)) {
    return { success: false, error: "権限がありません（管理者のみ）" };
  }

  return { success: true, userId: user.id };
}

function isDbUnavailable(error: unknown): boolean {
  if (error instanceof Error) {
    return error.name === "PrismaClientInitializationError" || /Can't reach database server/.test(String(error.message));
  }
  return false;
}

// デモデータ（DB接続不可時に表示）
const DEMO_SERVICES: ServiceWithProvider[] = [
  {
    id: "demo-service-1",
    provider_id: "demo-provider",
    title: "スタディプラス for School",
    description: "生徒の学習記録を可視化し、個別指導を支援する学習管理プラットフォーム",
    content: "スタディプラス for Schoolは、生徒の学習記録をリアルタイムで把握し、効果的な指導を実現する学習管理システムです。\n\n【主な機能】\n・学習時間の自動記録\n・教科別の学習状況把握\n・生徒との1on1面談支援\n・保護者への共有機能\n\n全国5,000校以上で導入され、多くの教育現場で活用されています。",
    thumbnail_url: "https://placehold.co/400x300/3b82f6/white?text=Studyplus",
    youtube_url: null,
    images: [],
    category: "学習管理",
    tags: [],
    price_info: "月額500円/生徒〜",
    view_count: 850,
    favorite_count: 38,
    request_count: 52,
    sort_order: 9999,
    wp_product_id: null,
    provider_display_name: null,
    review_count: 0,
    is_published: true,
    is_member_only: false,
    status: "APPROVED",
    submitted_at: new Date(Date.now() - 1000 * 60 * 60 * 25),
    approved_at: new Date(Date.now() - 1000 * 60 * 60 * 24),
    rejected_at: null,
    rejection_reason: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24),
    updated_at: new Date(),
    provider: { id: "demo-provider", name: "スタディプラス株式会社", email: "demo@example.com", avatar_url: null, notification_email_2: null, notification_email_3: null },
  },
  {
    id: "demo-service-2",
    provider_id: "demo-provider",
    title: "Classi",
    description: "学校と生徒・保護者をつなぐ総合教育プラットフォーム",
    content: "Classiは、学校・生徒・保護者間のコミュニケーションを円滑にする総合教育プラットフォームです。\n\n【主な機能】\n・連絡配信・欠席連絡\n・学習動画配信\n・テスト・課題配信\n・ポートフォリオ機能\n\n高校を中心に2,500校以上で利用されています。",
    thumbnail_url: "https://placehold.co/400x300/10b981/white?text=Classi",
    youtube_url: null,
    images: [],
    category: "校務支援",
    tags: [],
    price_info: "お問い合わせ",
    view_count: 720,
    favorite_count: 29,
    request_count: 44,
    sort_order: 9999,
    wp_product_id: null,
    provider_display_name: null,
    review_count: 0,
    is_published: true,
    is_member_only: false,
    status: "APPROVED",
    submitted_at: new Date(Date.now() - 1000 * 60 * 60 * 49),
    approved_at: new Date(Date.now() - 1000 * 60 * 60 * 48),
    rejected_at: null,
    rejection_reason: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48),
    updated_at: new Date(),
    provider: { id: "demo-provider", name: "Classi株式会社", email: "demo@example.com", avatar_url: null, notification_email_2: null, notification_email_3: null },
  },
  {
    id: "demo-service-3",
    provider_id: "demo-provider",
    title: "atama+",
    description: "AIが一人ひとりに最適な学習を提案するアダプティブラーニング教材",
    content: "atama+は、AIが生徒一人ひとりの理解度を分析し、最適な学習カリキュラムを自動生成する次世代型学習教材です。\n\n【対応教科】\n・数学（中学・高校）\n・英語（中学・高校）\n・物理・化学\n\n塾・予備校を中心に3,000教室以上で導入されています。",
    thumbnail_url: "https://placehold.co/400x300/8b5cf6/white?text=atama%2B",
    youtube_url: null,
    images: [],
    category: "AI教材",
    tags: [],
    price_info: "月額3,000円〜",
    view_count: 650,
    favorite_count: 35,
    request_count: 38,
    sort_order: 9999,
    wp_product_id: null,
    provider_display_name: null,
    review_count: 0,
    is_published: true,
    is_member_only: false,
    status: "APPROVED",
    submitted_at: new Date(Date.now() - 1000 * 60 * 60 * 73),
    approved_at: new Date(Date.now() - 1000 * 60 * 60 * 72),
    rejected_at: null,
    rejection_reason: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 72),
    updated_at: new Date(),
    provider: { id: "demo-provider", name: "atama plus株式会社", email: "demo@example.com", avatar_url: null, notification_email_2: null, notification_email_3: null },
  },
  {
    id: "demo-service-4",
    provider_id: "demo-provider",
    title: "Google Workspace for Education",
    description: "学校向けに最適化されたGoogleの教育向けクラウドサービス",
    content: "Google Workspace for Educationは、Gmail、ドライブ、Classroom、Meetなど、教育に必要なツールを一括提供するクラウドサービスです。\n\n【含まれるサービス】\n・Google Classroom\n・Google Meet\n・Google Drive（無制限）\n・Googleドキュメント/スプレッドシート/スライド\n\nGIGAスクール構想で多くの自治体が採用しています。",
    thumbnail_url: "https://placehold.co/400x300/f59e0b/white?text=Google+Workspace",
    youtube_url: null,
    images: [],
    category: "グループウェア",
    tags: [],
    price_info: "Education版は無料",
    view_count: 980,
    favorite_count: 42,
    request_count: 61,
    sort_order: 9999,
    wp_product_id: null,
    provider_display_name: null,
    review_count: 0,
    is_published: true,
    is_member_only: false,
    status: "APPROVED",
    submitted_at: new Date(Date.now() - 1000 * 60 * 60 * 97),
    approved_at: new Date(Date.now() - 1000 * 60 * 60 * 96),
    rejected_at: null,
    rejection_reason: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 96),
    updated_at: new Date(),
    provider: { id: "demo-provider", name: "Google", email: "demo@example.com", avatar_url: null, notification_email_2: null, notification_email_3: null },
  },
  {
    id: "demo-service-5",
    provider_id: "demo-provider",
    title: "ロイロノート・スクール",
    description: "直感的な操作で協働学習を実現するクラウド型授業支援ツール",
    content: "ロイロノート・スクールは、カードを使った直感的なUIで、思考の可視化と協働学習を支援する授業支援アプリです。\n\n【主な機能】\n・カード型ノート作成\n・提出箱（課題回収）\n・シンキングツール\n・プレゼンテーション\n\n全国10,000校以上で活用されています。",
    thumbnail_url: "https://placehold.co/400x300/ec4899/white?text=LoiLo+Note",
    youtube_url: null,
    images: [],
    category: "授業支援",
    tags: [],
    price_info: "年額6,600円/教員",
    view_count: 790,
    favorite_count: 33,
    request_count: 47,
    sort_order: 9999,
    wp_product_id: null,
    provider_display_name: null,
    review_count: 0,
    is_published: true,
    is_member_only: false,
    status: "APPROVED",
    submitted_at: new Date(Date.now() - 1000 * 60 * 60 * 121),
    approved_at: new Date(Date.now() - 1000 * 60 * 60 * 120),
    rejected_at: null,
    rejection_reason: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 120),
    updated_at: new Date(),
    provider: { id: "demo-provider", name: "株式会社LoiLo", email: "demo@example.com", avatar_url: null, notification_email_2: null, notification_email_3: null },
  },
];

/**
 * 全てのサービスを取得（公開済みのみ）
 * 未ログイン時は会員限定サービスを除外する
 */
export async function getAllServices(): Promise<ServiceWithProvider[]> {
  try {
    const user = await getCurrentUser();
    const where = !user
      ? {
          AND: [
            { OR: [{ status: "APPROVED" as const }, { is_published: true }] },
            { is_member_only: false },
          ],
        }
      : { OR: [{ status: "APPROVED" as const }, { is_published: true }] };

    const services = await prisma.service.findMany({
      where,
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
            notification_email_2: true,
            notification_email_3: true,
          },
        },
      },
      orderBy: [
        { sort_order: "asc" },
        { created_at: "desc" },
      ],
    });

    const sorted = sortServicesByDisplayOrder(services);

    return sorted.map((s) => ({
      ...s,
      provider: s.provider || { id: s.provider_id, name: "提供者", email: "", avatar_url: null, notification_email_2: null, notification_email_3: null },
    }));
  } catch (error) {
    if (isDbUnavailable(error)) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[services] Database unavailable; showing demo content.");
      }
      return DEMO_SERVICES;
    }
    console.error("Error fetching services:", error);
    return DEMO_SERVICES;
  }
}

/**
 * 人気のサービスを取得（作成日順、将来的にはview_count等で並び替え）
 * 未ログイン時は会員限定サービスを除外する
 * @param limit 取得件数（デフォルト: 5）
 */
export async function getPopularServices(limit: number = 5): Promise<ServiceWithProvider[]> {
  try {
    const user = await getCurrentUser();
    const where = !user
      ? {
          AND: [
            { OR: [{ status: "APPROVED" as const }, { is_published: true }] },
            { is_member_only: false },
          ],
        }
      : { OR: [{ status: "APPROVED" as const }, { is_published: true }] };

    const services = await prisma.service.findMany({
      where,
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
            notification_email_2: true,
            notification_email_3: true,
          },
        },
      },
    });
    const sorted = sortServicesByDisplayOrder(services);

    return sorted.slice(0, limit).map((s) => ({
      ...s,
      provider: s.provider || { id: s.provider_id, name: "提供者", email: "", avatar_url: null, notification_email_2: null, notification_email_3: null },
    }));
  } catch (error) {
    if (isDbUnavailable(error)) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[services] Database unavailable; showing demo content.");
      }
      return DEMO_SERVICES.slice(0, limit);
    }
    console.error("Error fetching popular services:", error);
    return DEMO_SERVICES.slice(0, limit);
  }
}

/**
 * サービスを1件取得
 * @param id サービスID
 */
export async function getServiceById(id: string): Promise<ServiceWithProvider | null> {
  try {
    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
            notification_email_2: true,
            notification_email_3: true,
          },
        },
      },
    });

    if (!service) return null;

    // 公開済み（APPROVED）以外は、投稿者本人 or 管理者のみ閲覧可
    const isPublic = service.status === "APPROVED" || service.is_published === true;
    if (!isPublic) {
      const { user } = await requireAuthedUser();
      if (!user) return null;

      if (user.id !== service.provider_id) {
        const profile = await prisma.profile.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        if (!profile || profile.role !== ("ADMIN" as Role)) {
          return null;
        }
      }
    }

    // 会員限定サービスは未ログインなら非公開
    if (service.is_member_only) {
      const { user } = await requireAuthedUser();
      if (!user) return null;
    }

    return {
      ...service,
      provider: service.provider || { id: service.provider_id, name: "提供者", email: "", avatar_url: null, notification_email_2: null, notification_email_3: null },
    };
  } catch (error) {
    if (isDbUnavailable(error)) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[services] Database unavailable; checking demo data.");
      }
      return DEMO_SERVICES.find((s) => s.id === id) || null;
    }
    console.error("Error fetching service:", error);
    return DEMO_SERVICES.find((s) => s.id === id) || null;
  }
}

/**
 * カテゴリ別にサービスを取得
 * 未ログイン時は会員限定サービスを除外する
 * @param category カテゴリ名
 */
export async function getServicesByCategory(category: string): Promise<ServiceWithProvider[]> {
  try {
    const { user } = await requireAuthedUser();
    const where = !user
      ? {
          AND: [
            { OR: [{ status: "APPROVED" as const }, { is_published: true }] },
            { category },
            { is_member_only: false },
          ],
        }
      : {
          OR: [{ status: "APPROVED" as const }, { is_published: true }],
          category,
        };

    const services = await prisma.service.findMany({
      where,
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
            notification_email_2: true,
            notification_email_3: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return services.map((s) => ({
      ...s,
      provider: s.provider || { id: s.provider_id, name: "提供者", email: "", avatar_url: null, notification_email_2: null, notification_email_3: null },
    }));
  } catch (error) {
    if (isDbUnavailable(error)) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[services] Database unavailable; showing demo content.");
      }
      return DEMO_SERVICES.filter((s) => s.category === category);
    }
    console.error("Error fetching services by category:", error);
    return DEMO_SERVICES.filter((s) => s.category === category);
  }
}

/**
 * 提供者: サービスを作成（下書き or 申請）
 */
export async function createService(input: CreateServiceInput): Promise<CreateServiceResult> {
  try {
    const { user, error } = await requireAuthedUser();
    if (!user) return { success: false, error };

    // Profileが存在しない場合は作成
    try {
      let profile = await prisma.profile.findUnique({ where: { id: user.id } });
      if (!profile) {
        const meta = user.user_metadata || {};
        const name = meta.name || meta.full_name || user.email?.split("@")[0] || "ユーザー";
        profile = await prisma.profile.create({
          data: {
            id: user.id,
            name,
            email: user.email || "",
            role: "PROVIDER",
            subscription_status: "INACTIVE",
            avatar_url: meta.avatar_url || meta.picture || null,
          },
        });
      }
    } catch (e) {
      if (isDbUnavailable(e)) {
        return { success: false, error: "データベースに接続できません。しばらく待ってから再度お試しください。" };
      }
      console.error("Profile ensure error:", e);
      return { success: false, error: "ユーザー情報の取得に失敗しました。プロフィールを登録してください。" };
    }

    const status = input.publishType === "draft" ? "DRAFT" : "PENDING";
    const now = new Date();
    const content = blocksToContent(input.blocks);
    const images = extractImagesFromBlocks(input.blocks);

    const service = await prisma.service.create({
      data: {
        provider_id: user.id,
        title: input.title,
        description: input.description,
        content,
        thumbnail_url: input.thumbnailUrl || null,
        youtube_url: input.youtubeUrl || null,
        images,
        category: input.category,
        price_info: input.priceInfo,
        is_published: false,
        status,
        submitted_at: status === "PENDING" ? now : null,
        approved_at: null,
        rejected_at: null,
        rejection_reason: null,
      },
    });

    return { success: true, serviceId: service.id };
  } catch (e) {
    console.error("Error creating service:", e);
    if (isDbUnavailable(e)) {
      return { success: false, error: "データベースに接続できません。しばらく待ってから再度お試しください。" };
    }
    return { success: false, error: "サービスの作成に失敗しました" };
  }
}

/**
 * 管理者: 承認待ちサービス一覧
 */
export async function getPendingServices(): Promise<ServiceWithProvider[]> {
  const auth = await requireAdmin();
  if (!auth.success) return [];

  try {
    const services = await prisma.service.findMany({
      where: { status: "PENDING" },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
            notification_email_2: true,
            notification_email_3: true,
          },
        },
      },
      orderBy: { submitted_at: "asc" },
      take: 100,
    });

    return services.map((s) => ({
      ...s,
      provider: s.provider || { id: s.provider_id, name: "提供者", email: "", avatar_url: null, notification_email_2: null, notification_email_3: null },
    }));
  } catch (e) {
    console.error("Error fetching pending services:", e);
    return [];
  }
}

/**
 * 管理者: サービスを承認して公開
 */
export async function approveService(serviceId: string): Promise<SimpleResult> {
  const auth = await requireAdmin();
  if (!auth.success) return auth;

  try {
    await prisma.service.update({
      where: { id: serviceId },
      data: {
        status: "APPROVED",
        is_published: true,
        approved_at: new Date(),
        rejected_at: null,
        rejection_reason: null,
      },
    });
    return { success: true };
  } catch (e) {
    console.error("Error approving service:", e);
    return { success: false, error: "承認に失敗しました" };
  }
}

/**
 * 管理者: サービスを却下
 */
export async function rejectService(serviceId: string, reason?: string): Promise<SimpleResult> {
  const auth = await requireAdmin();
  if (!auth.success) return auth;

  try {
    await prisma.service.update({
      where: { id: serviceId },
      data: {
        status: "REJECTED",
        is_published: false,
        rejected_at: new Date(),
        approved_at: null,
        rejection_reason: reason?.slice(0, 500) || null,
      },
    });
    return { success: true };
  } catch (e) {
    console.error("Error rejecting service:", e);
    return { success: false, error: "却下に失敗しました" };
  }
}
