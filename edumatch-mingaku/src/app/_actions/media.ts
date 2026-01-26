"use server";

import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/server-admin";

const BUCKET_NAME = "media";

/**
 * 画像をSupabase Storageにアップロードする
 * @param formData FormData（file: File）
 * @returns アップロードされた画像のURL
 */
export async function uploadImage(formData: FormData): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  try {
    const fileData = formData.get("file");
    
    // 型チェック: fileDataがFileオブジェクトであることを確認
    if (!fileData || !(fileData instanceof File)) {
      return { success: false, error: "ファイルが選択されていません" };
    }
    
    const file = fileData;

    // ファイルサイズチェック（5MB以下）
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return { success: false, error: "ファイルサイズは5MB以下にしてください" };
    }

    // ファイルタイプチェック
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: "対応していないファイル形式です（JPEG, PNG, GIF, WebPのみ）" };
    }

    const supabase = await createClient();

    // ユーザー認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "ログインが必要です" };
    }

    // ファイル名を生成（ユニークにするためにタイムスタンプを追加）
    const timestamp = Date.now();
    const extension = file.name.split(".").pop();
    const fileName = `${user.id}/${timestamp}.${extension}`;

    // RLS をバイパスする Service Role クライアントでアップロード（認証は上で済ませている）
    const adminClient = createServiceRoleClient();
    const { data, error } = await adminClient.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Upload error:", error);
      return { success: false, error: "アップロードに失敗しました" };
    }

    // 公開URLを取得
    const {
      data: { publicUrl },
    } = adminClient.storage.from(BUCKET_NAME).getPublicUrl(data.path);

    return { success: true, url: publicUrl };
  } catch (error) {
    console.error("Upload error:", error);
    return { success: false, error: "アップロードに失敗しました" };
  }
}

/**
 * 複数の画像をアップロードする
 * @param formData FormData（files: File[]）
 * @returns アップロードされた画像のURL配列
 */
export async function uploadMultipleImages(formData: FormData): Promise<{
  success: boolean;
  urls?: string[];
  errors?: string[];
}> {
  const filesData = formData.getAll("files");
  
  // 型チェック: 全ての要素がFileオブジェクトであることを確認
  const files = filesData.filter((f): f is File => f instanceof File);
  
  if (files.length === 0) {
    return { success: false, errors: ["ファイルが選択されていません"] };
  }

  const urls: string[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const singleFormData = new FormData();
    singleFormData.append("file", file);

    const result = await uploadImage(singleFormData);
    if (result.success && result.url) {
      urls.push(result.url);
    } else if (result.error) {
      errors.push(`${file.name}: ${result.error}`);
    }
  }

  return {
    success: urls.length > 0,
    urls: urls.length > 0 ? urls : undefined,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * 画像を削除する
 * @param url 画像のURL
 */
export async function deleteImage(url: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "ログインが必要です" };
    }

    // URLからパスを抽出
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/media\/(.+)/);
    if (!pathMatch) {
      return { success: false, error: "無効なURLです" };
    }

    const path = decodeURIComponent(pathMatch[1]);
    // 他人のファイルは削除させない（パスが {user.id}/ で始まるか）
    if (!path.startsWith(`${user.id}/`)) {
      return { success: false, error: "この画像を削除する権限がありません" };
    }

    const adminClient = createServiceRoleClient();
    const { error } = await adminClient.storage.from(BUCKET_NAME).remove([path]);

    if (error) {
      console.error("Delete error:", error);
      return { success: false, error: "削除に失敗しました" };
    }

    return { success: true };
  } catch (error) {
    console.error("Delete error:", error);
    return { success: false, error: "削除に失敗しました" };
  }
}
