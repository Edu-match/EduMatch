import { z } from "zod";

export const articleSchema = z.object({
  title: z
    .string()
    .min(1, "タイトルを入力してください")
    .max(200, "タイトルは200文字以内で入力してください"),
  
  category: z
    .string()
    .min(1, "カテゴリを選択してください"),
  
  tags: z
    .string()
    .optional(),
  
  summary: z
    .string()
    .min(1, "概要を入力してください")
    .max(500, "概要は500文字以内で入力してください"),
  
  content: z
    .string()
    .min(10, "本文は10文字以上で入力してください")
    .max(50000, "本文は50000文字以内で入力してください"),
  
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

export type ArticleFormData = z.infer<typeof articleSchema>;
