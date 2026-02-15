import { z } from "zod";

export const serviceSchema = z.object({
  title: z
    .string()
    .min(1, "タイトルを入力してください")
    .max(200, "タイトルは200文字以内で入力してください"),
  
  description: z
    .string()
    .min(1, "説明を入力してください")
    .max(500, "説明は500文字以内で入力してください"),
  
  category: z
    .string()
    .min(1, "カテゴリを選択してください"),
  
  content: z
    .string()
    .min(10, "コンテンツは10文字以上で入力してください")
    .max(50000, "コンテンツは50000文字以内で入力してください"),
  
  price_info: z
    .string()
    .min(1, "料金情報を入力してください")
    .max(200, "料金情報は200文字以内で入力してください"),
  
  thumbnail_url: z
    .string()
    .url("有効なURLを入力してください")
    .optional()
    .or(z.literal("")),
  
  youtube_url: z
    .string()
    .url("有効なYouTube URLを入力してください")
    .optional()
    .or(z.literal("")),
  
  status: z.enum(["DRAFT", "PENDING", "APPROVED", "REJECTED"]).default("PENDING"),
});

export type ServiceFormData = z.infer<typeof serviceSchema>;
