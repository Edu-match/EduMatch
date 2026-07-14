"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { canManageProviderContent } from "@/lib/provider-access";
import { revalidatePath } from "next/cache";
import { articleSchema, type ArticleFormData } from "@/lib/validations/article";
import { normalizeImageUrl } from "@/lib/image-url-utils";
import { generateArticleThumbnail } from "@/lib/article-thumbnail";
import { logActivity } from "./activity-log";

/**
 * 記事タイトル・概要からAIサムネイルを生成する
 */
export async function generateThumbnailForArticle(
  title: string,
  description?: string,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return { ok: false, error: "ログインが必要です" };
    }
    if (!(await canManageProviderContent(profile))) {
      return { ok: false, error: "サムネイルを生成する権限がありません" };
    }

    if (!title.trim()) {
      return { ok: false, error: "タイトルが必要です" };
    }

    const url = await generateArticleThumbnail(title.trim(), description?.trim());
    if (!url) {
      return { ok: false, error: "サムネイル生成に失敗しました" };
    }

    return { ok: true, url };
  } catch (e) {
    console.error("generateThumbnailForArticle error:", e);
    return { ok: false, error: "サムネイル生成に失敗しました" };
  }
}

/**
 * Canvasで生成したサムネイルPNGをSupabase Storageにアップロード
 */
export async function uploadCanvasThumbnail(
  formData: FormData,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { ok: false, error: "ログインが必要です" };
    if (!(await canManageProviderContent(profile)))
      return { ok: false, error: "権限がありません" };

    const file = formData.get("file") as File | null;
    if (!file) return { ok: false, error: "ファイルがありません" };

    const buffer = Buffer.from(await file.arrayBuffer());
    const { createServiceRoleClient } = await import("@/utils/supabase/server-admin");
    const supabase = createServiceRoleClient();
    const path = `article-thumbnails/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
    const { error } = await supabase.storage.from("media").upload(path, buffer, {
      cacheControl: "3600",
      contentType: "image/png",
      upsert: true,
    });
    if (error) return { ok: false, error: "アップロードに失敗しました" };
    const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
    return { ok: true, url: urlData?.publicUrl ?? undefined };
  } catch (e) {
    console.error("uploadCanvasThumbnail error:", e);
    return { ok: false, error: "アップロードに失敗しました" };
  }
}

/**
 * 記事を作成する
 */
export async function createArticle(data: ArticleFormData) {
  try {
    // 認証チェックとプロフィール取得
    const profile = await getCurrentProfile();
    
    if (!profile) {
      return {
        success: false,
        error: "ログインが必要です",
      };
    }

    if (!(await canManageProviderContent(profile))) {
      return {
        success: false,
        error: "記事を投稿するにはサービス事業者としてプロフィール登録を完了してください",
      };
    }

    // バリデーション
    const validatedData = articleSchema.parse(data);

    // タグの処理（カンマまたはスペース区切りを配列に変換）
    const tagsArray = validatedData.tags
      ? validatedData.tags
          .split(/[,、\s]+/)
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0)
      : [];

    // サムネイル未指定ならAIで自動生成（失敗時は null のまま）
    let thumbnailUrl = validatedData.thumbnail_url?.trim()
      ? normalizeImageUrl(validatedData.thumbnail_url.trim())
      : null;
    if (!thumbnailUrl) {
      thumbnailUrl = await generateArticleThumbnail(
        validatedData.title,
        validatedData.summary,
      );
    }

    // 記事を作成
    const article = await prisma.post.create({
      data: {
        provider_id: profile.id,
        title: validatedData.title,
        category: validatedData.category,
        tags: tagsArray,
        summary: validatedData.summary,
        content: validatedData.content,
        thumbnail_url: thumbnailUrl,
        youtube_url: validatedData.youtube_url || null,
        status: validatedData.status,
        is_published: validatedData.status === "APPROVED",
        view_count: 0,
      },
    });

    // キャッシュを更新
    revalidatePath("/articles");
    revalidatePath("/provider-dashboard");

    await logActivity({
      actorId: profile.id,
      actorName: profile.name,
      action: validatedData.status === "DRAFT" ? "CREATE" : "SUBMIT",
      targetType: "POST",
      targetId: article.id,
      targetTitle: article.title,
      detail: validatedData.status === "DRAFT" ? "下書き保存" : "承認申請",
    });

    return {
      success: true,
      data: article,
      message: validatedData.status === "DRAFT"
        ? "下書きとして保存しました"
        : "記事を投稿しました。承認をお待ちください。",
    };
  } catch (error) {
    console.error("createArticle error:", error);
    
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }
    
    return {
      success: false,
      error: "記事の作成に失敗しました",
    };
  }
}

/**
 * 記事を更新する
 */
export async function updateArticle(articleId: string, data: ArticleFormData) {
  try {
    // 認証チェックとプロフィール取得
    const profile = await getCurrentProfile();
    
    if (!profile) {
      return {
        success: false,
        error: "ログインが必要です",
      };
    }

    // 既存記事の取得
    const existingArticle = await prisma.post.findUnique({
      where: { id: articleId },
      select: { provider_id: true },
    });

    if (!existingArticle) {
      return {
        success: false,
        error: "記事が見つかりません",
      };
    }

    // 投稿者本人 or ADMIN のみ編集可
    if (existingArticle.provider_id !== profile.id && profile.role !== "ADMIN") {
      return {
        success: false,
        error: "この記事を編集する権限がありません",
      };
    }

    // バリデーション
    const validatedData = articleSchema.parse(data);

    // タグの処理
    const tagsArray = validatedData.tags
      ? validatedData.tags
          .split(/[,、\s]+/)
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0)
      : [];

    // サムネイル未指定ならAIで自動生成（失敗時は null のまま）
    let thumbnailUrl = validatedData.thumbnail_url?.trim()
      ? normalizeImageUrl(validatedData.thumbnail_url.trim())
      : null;
    if (!thumbnailUrl) {
      thumbnailUrl = await generateArticleThumbnail(
        validatedData.title,
        validatedData.summary,
      );
    }

    // 記事を更新
    const article = await prisma.post.update({
      where: { id: articleId },
      data: {
        title: validatedData.title,
        category: validatedData.category,
        tags: tagsArray,
        summary: validatedData.summary,
        content: validatedData.content,
        thumbnail_url: thumbnailUrl,
        youtube_url: validatedData.youtube_url || null,
        status: validatedData.status,
        is_published: validatedData.status === "APPROVED",
      },
    });

    // キャッシュを更新
    revalidatePath("/articles");
    revalidatePath(`/articles/${articleId}`);
    revalidatePath("/provider-dashboard");

    await logActivity({
      actorId: profile.id,
      actorName: profile.name,
      action: "UPDATE",
      targetType: "POST",
      targetId: articleId,
      targetTitle: article.title,
    });

    return {
      success: true,
      data: article,
      message: "記事を更新しました",
    };
  } catch (error) {
    console.error("updateArticle error:", error);
    
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }
    
    return {
      success: false,
      error: "記事の更新に失敗しました",
    };
  }
}

/**
 * 記事を削除する
 */
export async function deleteArticle(articleId: string) {
  try {
    // 認証チェックとプロフィール取得
    const profile = await getCurrentProfile();
    
    if (!profile) {
      return {
        success: false,
        error: "ログインが必要です",
      };
    }

    // 既存記事の取得
    const existingArticle = await prisma.post.findUnique({
      where: { id: articleId },
      select: { provider_id: true, title: true },
    });

    if (!existingArticle) {
      return {
        success: false,
        error: "記事が見つかりません",
      };
    }

    // 投稿者本人 or ADMIN のみ削除可
    if (existingArticle.provider_id !== profile.id && profile.role !== "ADMIN") {
      return {
        success: false,
        error: "この記事を削除する権限がありません",
      };
    }

    const deletedTitle = existingArticle.title;

    // 記事を削除
    await prisma.post.delete({
      where: { id: articleId },
    });

    // キャッシュを更新
    revalidatePath("/articles");
    revalidatePath("/provider-dashboard");

    await logActivity({
      actorId: profile.id,
      actorName: profile.name,
      action: "DELETE",
      targetType: "POST",
      targetId: articleId,
      targetTitle: deletedTitle,
    });

    return {
      success: true,
      message: "記事を削除しました",
    };
  } catch (error) {
    console.error("deleteArticle error:", error);
    
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }
    
    return {
      success: false,
      error: "記事の削除に失敗しました",
    };
  }
}
