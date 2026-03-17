"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";

export type ProviderArticle = {
  id: string;
  title: string;
  category: string;
  status: string;
  is_published: boolean;
  view_count: number;
  created_at: Date;
  updated_at: Date;
};

export type ProviderService = {
  id: string;
  title: string;
  category: string;
  status: string;
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
};

/**
 * 投稿者の記事一覧を取得
 */
export async function getProviderArticles() {
  try {
    const profile = await getCurrentProfile();
    
    if (!profile || (profile.role !== "PROVIDER" && profile.role !== "ADMIN")) {
      return [];
    }

    const isAdmin = profile.role === "ADMIN";

    const articles = await prisma.post.findMany({
      where: {
        // PROVIDER: 自分の投稿のみ / ADMIN: 全投稿を対象
        ...(isAdmin ? {} : { provider_id: profile.id }),
      },
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        is_published: true,
        view_count: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return articles;
  } catch (error) {
    console.error("getProviderArticles error:", error);
    return [];
  }
}

/**
 * 投稿者のサービス一覧を取得
 */
export async function getProviderServices() {
  try {
    const profile = await getCurrentProfile();
    
    if (!profile || (profile.role !== "PROVIDER" && profile.role !== "ADMIN")) {
      return [];
    }

    const isAdmin = profile.role === "ADMIN";

    const services = await prisma.service.findMany({
      where: {
        // PROVIDER: 自分の投稿のみ / ADMIN: 全サービスを対象
        ...(isAdmin ? {} : { provider_id: profile.id }),
      },
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        is_published: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return services;
  } catch (error) {
    console.error("getProviderServices error:", error);
    return [];
  }
}

/**
 * 投稿者の統計情報を取得
 */
export async function getProviderStats() {
  try {
    const profile = await getCurrentProfile();
    
    if (!profile || (profile.role !== "PROVIDER" && profile.role !== "ADMIN")) {
      return {
        totalArticles: 0,
        publishedArticles: 0,
        totalServices: 0,
        publishedServices: 0,
        totalViews: 0,
      };
    }

    const isAdmin = profile.role === "ADMIN";
    const whereClause = isAdmin ? {} : { provider_id: profile.id };
    const [articlesCount, publishedArticlesCount, servicesCount, publishedServicesCount, viewsSum] = await Promise.all([
      prisma.post.count({ where: whereClause }),
      prisma.post.count({ where: { ...whereClause, is_published: true } }),
      prisma.service.count({ where: whereClause }),
      prisma.service.count({ where: { ...whereClause, is_published: true } }),
      prisma.post.aggregate({ where: whereClause, _sum: { view_count: true } }),
    ]);

    return {
      totalArticles: articlesCount,
      publishedArticles: publishedArticlesCount,
      totalServices: servicesCount,
      publishedServices: publishedServicesCount,
      totalViews: viewsSum._sum.view_count || 0,
    };
  } catch (error) {
    console.error("getProviderStats error:", error);
    return {
      totalArticles: 0,
      publishedArticles: 0,
      totalServices: 0,
      publishedServices: 0,
      totalViews: 0,
    };
  }
}
