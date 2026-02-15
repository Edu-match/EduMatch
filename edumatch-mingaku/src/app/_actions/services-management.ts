"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { serviceSchema, type ServiceFormData } from "@/lib/validations/service";

/**
 * サービスを作成する
 */
export async function createServiceManagement(data: ServiceFormData) {
  try {
    // 認証チェックとプロフィール取得
    const profile = await getCurrentProfile();
    
    if (!profile) {
      return {
        success: false,
        error: "ログインが必要です",
      };
    }

    // 投稿者権限チェック
    if (profile.role !== "PROVIDER") {
      return {
        success: false,
        error: "サービスを投稿するには投稿者アカウントが必要です",
      };
    }

    // バリデーション
    const validatedData = serviceSchema.parse(data);

    // サービスを作成
    const service = await prisma.service.create({
      data: {
        provider_id: profile.id,
        title: validatedData.title,
        description: validatedData.description,
        category: validatedData.category,
        content: validatedData.content,
        price_info: validatedData.price_info,
        thumbnail_url: validatedData.thumbnail_url || null,
        youtube_url: validatedData.youtube_url || null,
        status: validatedData.status,
        is_published: validatedData.status === "APPROVED",
      },
    });

    // キャッシュを更新
    revalidatePath("/services");
    revalidatePath("/provider-dashboard");

    return {
      success: true,
      data: service,
      message: validatedData.status === "DRAFT" 
        ? "下書きとして保存しました" 
        : "サービスを投稿しました。承認をお待ちください。",
    };
  } catch (error) {
    console.error("createServiceManagement error:", error);
    
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }
    
    return {
      success: false,
      error: "サービスの作成に失敗しました",
    };
  }
}

/**
 * サービスを更新する
 */
export async function updateServiceManagement(serviceId: string, data: ServiceFormData) {
  try {
    // 認証チェックとプロフィール取得
    const profile = await getCurrentProfile();
    
    if (!profile) {
      return {
        success: false,
        error: "ログインが必要です",
      };
    }

    // 既存サービスの取得
    const existingService = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { provider_id: true },
    });

    if (!existingService) {
      return {
        success: false,
        error: "サービスが見つかりません",
      };
    }

    // 投稿者本人かチェック
    if (existingService.provider_id !== profile.id) {
      return {
        success: false,
        error: "このサービスを編集する権限がありません",
      };
    }

    // バリデーション
    const validatedData = serviceSchema.parse(data);

    // サービスを更新
    const service = await prisma.service.update({
      where: { id: serviceId },
      data: {
        title: validatedData.title,
        description: validatedData.description,
        category: validatedData.category,
        content: validatedData.content,
        price_info: validatedData.price_info,
        thumbnail_url: validatedData.thumbnail_url || null,
        youtube_url: validatedData.youtube_url || null,
        status: validatedData.status,
        is_published: validatedData.status === "APPROVED",
      },
    });

    // キャッシュを更新
    revalidatePath("/services");
    revalidatePath(`/services/${serviceId}`);
    revalidatePath("/provider-dashboard");

    return {
      success: true,
      data: service,
      message: "サービスを更新しました",
    };
  } catch (error) {
    console.error("updateServiceManagement error:", error);
    
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }
    
    return {
      success: false,
      error: "サービスの更新に失敗しました",
    };
  }
}

/**
 * サービスを削除する
 */
export async function deleteServiceManagement(serviceId: string) {
  try {
    // 認証チェックとプロフィール取得
    const profile = await getCurrentProfile();
    
    if (!profile) {
      return {
        success: false,
        error: "ログインが必要です",
      };
    }

    // 既存サービスの取得
    const existingService = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { provider_id: true },
    });

    if (!existingService) {
      return {
        success: false,
        error: "サービスが見つかりません",
      };
    }

    // 投稿者本人かチェック
    if (existingService.provider_id !== profile.id) {
      return {
        success: false,
        error: "このサービスを削除する権限がありません",
      };
    }

    // サービスを削除
    await prisma.service.delete({
      where: { id: serviceId },
    });

    // キャッシュを更新
    revalidatePath("/services");
    revalidatePath("/provider-dashboard");

    return {
      success: true,
      message: "サービスを削除しました",
    };
  } catch (error) {
    console.error("deleteServiceManagement error:", error);
    
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }
    
    return {
      success: false,
      error: "サービスの削除に失敗しました",
    };
  }
}
